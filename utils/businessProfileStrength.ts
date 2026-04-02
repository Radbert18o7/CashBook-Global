import type { Business } from '@/utils/models';

/** Percent complete from business fields (name, logo, address, currency, timezone). */
export function computeBusinessProfileStrength(b: Partial<Business>): number {
  let p = 0;
  if (b.name?.trim()) p += 20;
  if (b.logo_url?.trim()) p += 20;
  if (b.address?.trim()) p += 20;
  if (b.currency_code?.trim()) p += 20;
  if (b.timezone?.trim()) p += 20;
  return Math.min(100, Math.round(p * 10) / 10);
}
