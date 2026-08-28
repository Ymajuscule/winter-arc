-- Rollback for 20260828010200_idempotency_keys.sql
drop table if exists public.idempotency_keys cascade;
