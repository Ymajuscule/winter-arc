#!/usr/bin/env bash
# Applies the full migration chain + seeds to a throwaway local Postgres and
# asserts that the data migrations actually do what they claim.
#
# Why: `supabase init` / `supabase start` still isn't set up in this repo
# (open Phase 0 item), so migrations have historically been written, reviewed
# by eye, and handed to Julien having never been executed anywhere. This is
# the cheap 80%: real Postgres, real SQL, real before/after assertions.
#
# What it does NOT cover, so nobody mistakes a green run for more than it is:
# - RLS is *created* here but never *enforced* — every statement runs as
#   superuser. Policy correctness still needs the real project.
# - `auth.users` / `auth.uid()` are minimal stubs, not Supabase's real schema.
# - Edge Functions aren't touched (see scripts/package-edge-functions.mjs).
#
# Usage: scripts/verify-migrations.sh

set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/var/tmp/winter-arc-verify-pg}
PORT=${PORT:-5433}
SOCK=/tmp
DB=winterarc_verify
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# pg_ctl has to run as the data directory's owner. As root that means `su
# postgres`; a root-run stop against a postgres-owned dir fails silently and
# leaves the cluster holding the port, which is exactly what a re-run hits.
if [ "$(id -u)" = 0 ]; then RUN="su postgres -c"; else RUN="bash -c"; fi

psql_db() { psql -h "$SOCK" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 "$@"; }
cleanup() { $RUN "$PGBIN/pg_ctl -D $PGDATA stop -s -m immediate" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> starting a throwaway Postgres on :$PORT"
# A previous run that was killed rather than stopped leaves its socket behind,
# and initdb happily creates a cluster that then can't bind. Clear both.
cleanup
rm -f "$SOCK/.s.PGSQL.$PORT" "$SOCK/.s.PGSQL.$PORT.lock"
rm -rf "$PGDATA"; mkdir -p "$PGDATA"
if [ "$(id -u)" = 0 ]; then chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"; fi
$RUN "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
$RUN "$PGBIN/pg_ctl -D $PGDATA -o '-p $PORT -k $SOCK' -l /var/tmp/winter-arc-verify.log start" >/dev/null
for _ in $(seq 1 20); do psql -h "$SOCK" -p "$PORT" -U postgres -tc 'select 1' >/dev/null 2>&1 && break; sleep 0.5; done

psql -h "$SOCK" -p "$PORT" -U postgres -q -c "create database $DB;"
# The pieces Supabase provides that the migrations assume already exist.
psql_db -q <<'SQL'
create extension if not exists pgcrypto;
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
SQL

echo "==> migrations"
for m in $(ls "$REPO"/supabase/migrations/*.sql | grep -v '_down\.sql$' | sort); do
  printf '    %-52s' "$(basename "$m")"; psql_db -q -f "$m"; echo "ok"
done

echo "==> seeds"
for s in $(ls "$REPO"/supabase/seed/*.sql | sort); do
  printf '    %-52s' "$(basename "$s")"; psql_db -q -f "$s"; echo "ok"
done

echo "==> data migrations against pre-fix rows"
psql_db -q <<'SQL'
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'pre@fix.test');
-- Habits exactly as onboarding used to write them: display labels, no linked_stats.
insert into public.habits (user_id, name, category, type, difficulty, xp_value, linked_stats) values
  ('11111111-1111-1111-1111-111111111111','Run','Fitness','boolean','medium',40,'[]'),
  ('11111111-1111-1111-1111-111111111111','No phone','Digital Discipline','boolean','medium',40,'[]'),
  ('11111111-1111-1111-1111-111111111111','Meditate','Mental Wellness','boolean','medium',40,'[]'),
  ('11111111-1111-1111-1111-111111111111','Guitar','Custom','boolean','medium',40,'[]');
update public.achievements set condition = jsonb_set(condition,'{category}','"Fitness"') where id = 'hundred-workouts';
SQL

replay() {
  psql_db -q -f "$REPO/supabase/migrations/20260831000000_backfill_habit_linked_stats.sql"
  psql_db -q -f "$REPO/supabase/migrations/20260831010000_normalise_habit_categories.sql"
}
fingerprint() {
  psql_db -tAc "select md5(string_agg(category||linked_stats::text, '|' order by name)) from public.habits;"
}
assert() { # assert <label> <sql returning boolean>
  local got; got=$(psql_db -tAc "$2")
  if [ "$got" = "t" ]; then echo "    ok   $1"; else echo "    FAIL $1"; exit 1; fi
}

replay
assert "labels normalised to category ids" \
  "select count(*) = 0 from public.habits where category <> lower(category) or category in ('digital discipline','mental wellness')"
assert "every habit has a non-empty linked_stats" \
  "select count(*) = 0 from public.habits where linked_stats = '[]'::jsonb"
assert "fitness feeds strength" \
  "select linked_stats @> '[{\"stat\":\"strength\"}]' from public.habits where name = 'Run'"
assert "a user-typed category takes the discipline default" \
  "select linked_stats = '[{\"stat\":\"discipline\",\"weight\":0.5}]'::jsonb from public.habits where name = 'Guitar'"
assert "hundred-workouts condition can match a real category" \
  "select condition->>'category' = 'fitness' from public.achievements where id = 'hundred-workouts'"

migrated=$(fingerprint); replay
[ "$(fingerprint)" = "$migrated" ] && echo "    ok   re-running both migrations is a no-op" || { echo "    FAIL not idempotent"; exit 1; }

echo "==> rollbacks"
psql_db -q -f "$REPO/supabase/migrations/20260831010000_normalise_habit_categories_down.sql"
psql_db -q -f "$REPO/supabase/migrations/20260831000000_backfill_habit_linked_stats_down.sql"
assert "rollback restores the label vocabulary" \
  "select category = 'Fitness' from public.habits where name = 'Run'"
assert "rollback clears linked_stats" \
  "select linked_stats = '[]'::jsonb from public.habits where name = 'Run'"
replay
[ "$(fingerprint)" = "$migrated" ] && echo "    ok   re-applying after rollback returns to the migrated state" \
  || { echo "    FAIL state diverged after rollback + replay"; exit 1; }

echo "==> SQL weights vs the game-engine catalog"
psql_db -q -c "delete from public.habits;" 
psql_db -q <<'SQL'
insert into public.habits (user_id, name, category, type, difficulty, xp_value, linked_stats)
select '11111111-1111-1111-1111-111111111111', c, c, 'boolean', 'medium', 40, '[]'::jsonb
from unnest(array['fitness','mind','knowledge','career','finance','sleep',
                  'nutrition','energy','digital','mental','creativity','relationships']) as c;
SQL
replay
psql_db -tAc "select json_object_agg(category, linked_stats order by category)::text from public.habits;" > /var/tmp/wa-sql-catalog.json
cat > /var/tmp/wa-dump-catalog.mjs <<JS
import { CATEGORY_IDS } from '$REPO/packages/game-engine/src/classes.ts';
import { linkedStatsForCategory } from '$REPO/packages/game-engine/src/stats.ts';
console.log(JSON.stringify(Object.fromEntries(CATEGORY_IDS.map((id) => [id, linkedStatsForCategory(id)]))));
JS
npx --yes tsx /var/tmp/wa-dump-catalog.mjs > /var/tmp/wa-ts-catalog.json
node -e '
const fs = require("fs");
const norm = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.map((x) => x.stat + ":" + x.weight).sort().join(",")]));
const a = norm(JSON.parse(fs.readFileSync("/var/tmp/wa-sql-catalog.json", "utf8")));
const b = norm(JSON.parse(fs.readFileSync("/var/tmp/wa-ts-catalog.json", "utf8")));
let bad = 0;
for (const k of Object.keys(b)) if (a[k] !== b[k]) { bad++; console.log("    FAIL " + k + "\n      sql: " + a[k] + "\n      ts : " + b[k]); }
if (bad) process.exit(1);
console.log("    ok   all 12 categories match the TypeScript catalog");
'

echo
echo "All migration checks passed."
