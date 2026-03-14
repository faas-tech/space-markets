import { z } from 'zod';

// ── Asset Types ──────────────────────────────────────────────

export const assetTypeSchema = z.enum([
  'satellite',
  'orbital_compute',
  'orbital_relay',
]);

export type AssetType = z.infer<typeof assetTypeSchema>;

// ── Asset Registration ───────────────────────────────────────

export const assetRegistrationSchema = z.object({
  assetType: assetTypeSchema,
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .default(''),
  tokenName: z
    .string()
    .min(2, 'Token name must be at least 2 characters')
    .max(50, 'Token name must be 50 characters or less'),
  tokenSymbol: z
    .string()
    .min(2, 'Symbol must be at least 2 characters')
    .max(10, 'Symbol must be 10 characters or less')
    .regex(/^[A-Z0-9-]+$/, 'Symbol must be uppercase letters, numbers, or hyphens'),
  totalSupply: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number')
    .refine((v) => Number(v) <= 1e18, 'Supply exceeds maximum'),
  cpuCores: z.number().int().min(1).max(10000),
  ramGb: z.number().int().min(1).max(100000),
  storageTb: z.number().int().min(1).max(100000),
});

export type AssetRegistrationData = z.infer<typeof assetRegistrationSchema>;

// ── Bid Placement ────────────────────────────────────────────

export const bidSchema = z.object({
  escrowAmount: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Escrow must be a positive number')
    .refine((v) => Number(v) >= 0.01, 'Minimum escrow is 0.01 USDC'),
});

export type BidData = z.infer<typeof bidSchema>;
