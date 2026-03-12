import fetch from 'node-fetch';
import crypto from 'crypto';
import type { FacilitatorSettleResult, FacilitatorVerifyResult, FacilitatorRequestBodyV2, X402PaymentRequirements, X402Session } from '../types/x402.js';
import type { X402Config } from '../config/index.js';

export class X402FacilitatorClient {
  private static readonly FETCH_TIMEOUT_MS = 15_000;
  private static readonly MAX_SESSIONS = 10_000;
  private sessions: Map<string, X402Session> = new Map();

  constructor(private readonly config: X402Config) {}

  /**
   * Fetch with AbortController timeout to prevent hanging requests.
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), X402FacilitatorClient.FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal as AbortSignal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async verify(paymentPayload: string, requirements: X402PaymentRequirements): Promise<FacilitatorVerifyResult> {
    if (this.config.useMockFacilitator) {
      return { isValid: true };
    }

    const url = `${this.config.facilitatorUrl.replace(/\/$/, '')}/verify`;
    const body: FacilitatorRequestBodyV2 = {
      x402Version: 2,
      paymentPayload,
      paymentRequirements: requirements
    };

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        return {
          isValid: false,
          invalidReason: `Facilitator responded with ${response.status}`
        };
      }

      return response.json() as Promise<FacilitatorVerifyResult>;
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return { isValid: false, invalidReason: 'Facilitator request timed out' };
      }
      return { isValid: false, invalidReason: `Facilitator request failed: ${(e as Error).message}` };
    }
  }

  async settle(paymentPayload: string, requirements: X402PaymentRequirements): Promise<FacilitatorSettleResult> {
    if (this.config.useMockFacilitator) {
      return {
        success: true,
        txHash: `0xmock${crypto.randomBytes(12).toString('hex')}`,
        networkId: this.config.networkCAIP || this.config.network,
        error: null
      };
    }

    const url = `${this.config.facilitatorUrl.replace(/\/$/, '')}/settle`;
    const body: FacilitatorRequestBodyV2 = {
      x402Version: 2,
      paymentPayload,
      paymentRequirements: requirements
    };

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Facilitator responded with ${response.status}`,
          txHash: null,
          networkId: null
        };
      }

      return response.json() as Promise<FacilitatorSettleResult>;
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return { success: false, error: 'Facilitator request timed out', txHash: null, networkId: null };
      }
      return { success: false, error: `Facilitator request failed: ${(e as Error).message}`, txHash: null, networkId: null };
    }
  }

  /**
   * V2: Create a wallet session (gated by enableSessions config).
   * Sessions allow clients to skip per-request payment verification.
   */
  /**
   * Evict expired sessions to free memory.
   */
  private evictExpiredSessions(): void {
    const now = new Date();
    for (const [id, session] of this.sessions) {
      if (new Date(session.expiresAt) < now) {
        this.sessions.delete(id);
      }
    }
  }

  async createSession(walletAddress: string, maxAmount: string, durationMs: number = 3600_000): Promise<X402Session | null> {
    if (!this.config.enableSessions) {
      return null;
    }

    // Enforce session limit to prevent memory exhaustion
    if (this.sessions.size >= X402FacilitatorClient.MAX_SESSIONS) {
      this.evictExpiredSessions();
      if (this.sessions.size >= X402FacilitatorClient.MAX_SESSIONS) {
        throw new Error(`Session limit reached (${X402FacilitatorClient.MAX_SESSIONS})`);
      }
    }

    const session: X402Session = {
      sessionId: `session_${crypto.randomBytes(16).toString('hex')}`,
      walletAddress,
      chainId: this.config.networkCAIP || 'eip155:84532',
      maxAmount,
      expiresAt: new Date(Date.now() + durationMs).toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  /**
   * V2: Retrieve an existing session (gated by enableSessions config).
   * Returns null if sessions are disabled or session not found/expired.
   */
  getSession(sessionId: string): X402Session | null {
    if (!this.config.enableSessions) {
      return null;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      session.isActive = false;
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }
}
