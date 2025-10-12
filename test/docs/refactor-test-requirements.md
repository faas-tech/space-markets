Create a list of simple tests that we need to build:

1. The registration of four different asset types. We will provide a JSON with three different asset types and two instances of one asset and one instance of each of the other two assets.
2. To register specific assets again using this same JSON file we have instances of two of the first asset and one instance of the second and one instance of the third asset.
3. We will need to try to re-register both an asset type and a specific asset to ensure that the checks do not allow for duplicates.
4. We will then need to iterate through and retrieve all asset types and all instances of the assets, confirming if we can or cannot expose their underlying information from what was stored on-chain. We will then also perform a check that it matches the JSONs that we have off-chain.
5. Next, we will post leases for each of our four assets in the marketplace. This functional lease test will then have:

- Multiple bidders per lease
- An acceptance of the highest bidder from the lessee
- The signatures of the lease intents forming the lease
- Payment of the cash flows to the single owners of each asset throughout a short life cycle for each lease This will be our functional marketplace test.

6.
