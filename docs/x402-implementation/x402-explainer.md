# X402 Explainer & Integration Guide

## 1. What X402 Delivers

- **Protocol** – X402 extends HTTP with a `402 Payment Required` challenge. The lessee requests a protected resource, receives a price quote plus required payment metadata, and retries the same request with an `X-PAYMENT` header issued by a facilitator. The facilitator verifies and settles the transfer (sponsoring gas), then returns a receipt that becomes the lessee's proof of payment.
- **Participants**
  - _Lessee client_ drives the HTTP flow and signs any required payloads.
  - _Facilitator_ (Coinbase X402 or equivalent) validates the quote, settles USDC on Base, and hands back a settlement hash.
  - _Lessor resource server_ (our API) enforces access control and persists streaming payments.
  - _On-chain protocol_ (Marketplace + LeaseFactory) remains the canonical lease registry and revenue distribution surface.
- **Why it fits Asset Leasing** – streaming micropayments remove the need for up-front escrow, keep token-holder revenue flowing continuously, and still preserve the on-chain lease lifecycle (lease offers, NFT mint, claims).

## 2. Sequence of a Streaming Payment

1. **Quote** – the lessee (CLI, test, or SDK) calls `GET /api/leases/:leaseId/x402/requirements` to obtain an amount, interval, and facilitator metadata.
2. **Challenge** – the lessee attempts to access `/api/leases/:leaseId/access`. Without payment the API responds `402` plus the same requirements block.
3. **Facilitated payment** – the client asks the facilitator to verify/settle the quote and encodes the proof in an `X-PAYMENT` header.
4. **Access grant** – the API confirms the receipt and records the payment in the streaming ledger. The lease stays marked active, and the revenue service can batch-settle to token holders.

Both the integration test and the enhanced-flow spec exercise this handshake end to end:

```96:165:test/offchain/tests/api-integration.test.ts
const requirementsResponse = await fetch(
  `${baseUrl}/api/leases/${leaseAgreement.leaseId}/x402/requirements?mode=batch-5s`
);
…
const unauthorizedAccess = await fetch(
  `${baseUrl}/api/leases/${leaseAgreement.leaseId}/access?mode=batch-5s`,
  { method: 'POST' }
);
expect(unauthorizedAccess.status).toBe(402);
…
const authorizedAccess = await fetch(
  `${baseUrl}/api/leases/${leaseAgreement.leaseId}/access?mode=batch-5s`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PAYMENT': paymentHeader }
  }
);
expect(authorizedAccess.status).toBe(200);
const storedPayments = await database.getX402PaymentsByLease(leaseAgreement.leaseId);
expect(storedPayments).toHaveLength(1);
```

## 3. Integration Surfaces

### 3.1 On-Chain Protocol

- **Marketplace** still posts lease offers and accepts bids. The enhanced-flow spec now places a real bid, signs the EIP-712 lease intent, and mints the Lease NFT via `LeaseFactory`, proving that the streaming add-ons never bypass core protocol guarantees.

```476:547:test/offchain/tests/enhanced-flow.test.ts
const digest = await deployment.leaseFactory.contract.hashLeaseIntent(leaseIntentForSignatures);
const lesseeSignature = new ethers.SigningKey(anvilInstance.accounts[1].privateKey).sign(digest).serialized;
const lessorSignature = new ethers.SigningKey(anvilInstance.accounts[0].privateKey).sign(digest).serialized;
…
const acceptTx = await marketplace.connect(lessorWallet).acceptLeaseBid(
  offerResult.offerId,
  0,
  lessorSignature
);
const acceptReceipt = await acceptTx.wait();
const leaseAcceptedEvent = acceptReceipt.logs
  .map(log => {
    try {
      return marketplace.interface.parseLog(log);
    } catch {
      return null;
    }
  })
  .find(parsed => parsed?.name === 'LeaseAccepted');
```

- **Revenue distribution** still derives from on-chain ownership. Each streaming payment simply feeds the same accounting tables (or on-chain claims) that lump-sum payments used.

### 3.2 Off-Chain Services

- **X402PaymentService** quotes per-interval requirements from stored lease terms, converts wei to USDC minor units, and annotates warnings when the interval math leaves a remainder.

```1:65:test/offchain/src/x402/payment-service.ts
const hourlyMinorUnits = this.getHourlyMinorUnits(lease);
const { amount, remainder } = mode === 'second'
  ? perSecondAmount(hourlyMinorUnits)
  : perFiveSecondAmount(hourlyMinorUnits);
const requirements: X402PaymentRequirements = {
  scheme: 'exact',
  network: config.x402.network,
  asset: config.x402.usdcAddress,
  maxAmountRequired: amount.toString(),
  payTo: lease.lessor,
  resource,
  description: description || `Lease ${leaseId} streaming payment (${mode})`,
  extra: { decimals: config.x402.usdcDecimals, verifyOptimistically: config.x402.verifyOptimistically, paymentMode: mode }
};
```

- **API server** exposes REST facades for leases and the `/access` endpoint. It stores asset/lease metadata, verifies `X-PAYMENT` headers with the facilitator client, and records streaming ledgers inside `MockDatabase`.

```200:368:test/offchain/src/api/server.ts
const result = await this.deployer.postLeaseOffer({ … leaseAgreement });
await this.saveLeaseRecord({ … offerId: result.offerId.toString() });
…
const quote = await this.x402Service.buildQuote(
  req.params.leaseId,
  mode,
  resource,
  req.query.description?.toString()
);
…
const settlement = await this.x402Facilitator.settle(paymentHeader, quota.requirements);
await this.services.database.saveX402Payment({
  leaseId: req.params.leaseId,
  mode: quota.mode,
  intervalSeconds,
  amountMinorUnits: quota.amountMinorUnits,
  payer: headerPayload.payer,
  facilitatorTxHash: settlement.txHash || headerPayload.txHash || '0xmock'
});
```

- **Facilitator client** (`X402FacilitatorClient`) is a thin adapter for Coinbase's SDK; the tests use it in optimistic mode to keep runs deterministic.
- **CLI & demos** – `npm run demo:x402 -- --mode=batch` spins the same API/facilitator loop with live narration for product stakeholders.

## 4. End-to-End Demo Coverage

| Surface                     | Command / Test                                                                         | What it proves                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lease + streaming lifecycle | `NODE_OPTIONS=--dns-result-order=ipv4first npx vitest run tests/enhanced-flow.test.ts` | Deploys upgradeable contracts, registers assets, posts lease offers, accepts bids, mints Lease NFTs, then runs two streaming intervals against the mock database/facilitator. |
| REST API + CLI clients      | `npx vitest run tests/api-integration.test.ts`                                         | Boots `AssetLeasingApiServer`, registers an asset via HTTP, posts a lease, exercises `/requirements`, `/access`, and verifies X402 ledger persistence.                        |
| Narrated streaming showcase | `npx vitest run tests/x402-streaming.test.ts` or `npm run demo:x402 -- --mode=batch`   | Uses `X402PaymentService` + facilitator mock to narrate per-second and batch payments; perfect for operator training.                                                         |

## 5. Data & Operations

- **Ledger** – `MockDatabase.saveX402Payment` stores each interval with `leaseId`, `mode`, `intervalSeconds`, `amountMinorUnits`, and facilitator transaction hash so we can replay or audit.
- **Observability hooks** – set `DEBUG_NONCE=1` when running the enhanced-flow suite to trace wallet nonces; the Anvil manager now force-closes child processes to avoid hanging suites.
- **Cleanup** – `POST /api/system/reset` clears the mock database/cache so local devs can re-run demos without rebuilding containers.

## 6. Implementation Checklist

1. Run the enhanced-flow and API integration suites after every contract or API change.
2. Keep `getConfig().x402` up to date with facilitator keys/secrets; the test harness injects mock values.
3. When adding new streaming modes, extend `X402PaymentService` plus the API contract so quotes stay deterministic for tests.
4. Before onboarding real leases, replace `MockDatabase` with the production repository and wire the facilitator client to Coinbase's sandbox credentials.
