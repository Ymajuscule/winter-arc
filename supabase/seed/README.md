# Seed data

Run after `supabase/migrations/20260827000000_init_core_schema.sql`, in order:

```bash
psql "$DATABASE_URL" -f supabase/seed/001_classes.sql
psql "$DATABASE_URL" -f supabase/seed/002_cosmetics.sql
psql "$DATABASE_URL" -f supabase/seed/003_achievements.sql
```

Or via the Supabase dashboard SQL editor, same order — `002` must run before `003`
(achievements reference cosmetic ids as their `cosmetic_reward`).

Everything here is `on conflict (id) do nothing` / idempotent updates, so re-running
is safe. This is starter content for Phase 1 (TODO.md): 7 classes, 12 avatars, 8
frames, 6 auras, 6 banners, 5 themes, 20 titles, 30 achievements — not the full V1+
catalog (300+ cosmetics, 100+ achievements per CDC §136-137).
