import { generateIdempotencyKey } from '@/lib/idempotency-key';
import type { FunctionsHttpError } from '@supabase/supabase-js';
import type {
  ApplyPrestigeResponse,
  AwardHabitXpRequest,
  AwardHabitXpResponse,
  BootstrapProfileRequest,
  BootstrapProfileResponse,
  ClaimQuestRequest,
  ClaimQuestResponse,
  OpenChestRequest,
  OpenChestResponse,
  ShopPurchaseRequest,
  ShopPurchaseResponse,
} from '@winterarc/shared-types';
import { supabase } from './supabase';

/**
 * Typed client for the 6 mobile-facing Edge Functions (docs/api-specifications.md
 * — `advance-streak` is pg_cron-only, `evaluate-achievements` is a shared
 * helper other functions call internally; neither has a mobile-facing route).
 * `supabase.functions.invoke` attaches the current session's
 * `Authorization: Bearer` automatically — no manual JWT handling needed.
 *
 * Every call carries a fresh `Idempotency-Key` so a network retry can't
 * double-write (`_shared/idempotency.ts`) — one key per call, not reused
 * across retries of the *same* logical action yet. A real retry-with-the-
 * same-key queue is the CDC §110 offline sync queue, not built yet
 * (app-store.ts's file header notes this too).
 */

export class ApiNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY missing).');
    this.name = 'ApiNotConfiguredError';
  }
}

export class ApiRequestError extends Error {
  status: number | undefined;
  body: unknown;
  constructor(message: string, status: number | undefined, body: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

async function invoke<TReq, TRes>(name: string, body: TReq): Promise<TRes> {
  if (!supabase) throw new ApiNotConfiguredError();

  // Every TReq here is a plain JSON-serializable object — supabase-js's
  // FunctionInvokeOptions#body type just doesn't structurally recognize a
  // named interface as `Record<string, any>` without an index signature.
  const { data, error } = await supabase.functions.invoke<TRes>(name, {
    body: body as Record<string, unknown>,
    headers: { 'Idempotency-Key': generateIdempotencyKey() },
  });

  if (error) {
    const httpError = error as FunctionsHttpError;
    const status = httpError.context?.status as number | undefined;
    let errorBody: unknown;
    try {
      errorBody = await httpError.context?.json();
    } catch {
      errorBody = undefined;
    }
    const message =
      (errorBody as { error?: string } | undefined)?.error ?? error.message ?? 'Request failed';
    throw new ApiRequestError(message, status, errorBody);
  }

  return data as TRes;
}

export const api = {
  awardHabitXp: (body: AwardHabitXpRequest) =>
    invoke<AwardHabitXpRequest, AwardHabitXpResponse>('award-habit-xp', body),
  claimQuest: (body: ClaimQuestRequest) =>
    invoke<ClaimQuestRequest, ClaimQuestResponse>('claim-quest', body),
  applyPrestige: () => invoke<Record<string, never>, ApplyPrestigeResponse>('apply-prestige', {}),
  openChest: (body: OpenChestRequest) =>
    invoke<OpenChestRequest, OpenChestResponse>('open-chest', body),
  shopPurchase: (body: ShopPurchaseRequest) =>
    invoke<ShopPurchaseRequest, ShopPurchaseResponse>('shop-purchase', body),
  bootstrapProfile: (body: BootstrapProfileRequest) =>
    invoke<BootstrapProfileRequest, BootstrapProfileResponse>('bootstrap-profile', body),
};
