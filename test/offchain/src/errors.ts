/**
 * Consistent error classes for the Asset Leasing Protocol off-chain system.
 *
 * Every custom error carries:
 *   - code   — a short machine-readable identifier
 *   - context — optional structured data for logging / debugging
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export class BaseProtocolError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;

  constructor(code: string, message: string, context: ErrorContext = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
  }
}

/** RPC call failures, transaction reverts, provider connectivity issues */
export class BlockchainError extends BaseProtocolError {
  constructor(message: string, context: ErrorContext = {}) {
    super('BLOCKCHAIN_ERROR', message, context);
  }
}

/** Input validation failures (API bodies, service arguments) */
export class ValidationError extends BaseProtocolError {
  constructor(message: string, context: ErrorContext = {}) {
    super('VALIDATION_ERROR', message, context);
  }
}

/** X402 streaming-payment protocol errors */
export class X402Error extends BaseProtocolError {
  constructor(message: string, context: ErrorContext = {}) {
    super('X402_ERROR', message, context);
  }
}

/** Storage layer errors (database read/write, connection) */
export class DatabaseError extends BaseProtocolError {
  constructor(message: string, context: ErrorContext = {}) {
    super('DATABASE_ERROR', message, context);
  }
}
