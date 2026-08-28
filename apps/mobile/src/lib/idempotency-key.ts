/**
 * A per-logical-action UUID sent as the `Idempotency-Key` header
 * (`supabase/functions/_shared/idempotency.ts`) so a retried network call
 * replays the cached result instead of double-writing. Doesn't need
 * cryptographic randomness — `crypto.randomUUID()` isn't reliably available
 * across RN/Hermes without a polyfill, and collision resistance for a
 * per-tap key doesn't need one anyway.
 */
export function generateIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
