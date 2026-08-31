#!/usr/bin/env node
/**
 * Builds deploy-ready, self-contained bundles for every Supabase Edge Function.
 *
 * Why this exists: the functions in `supabase/functions/` import the shared
 * game math by monorepo-relative path (`../../../packages/game-engine/src/xp.ts`)
 * so they type-check and run against the same source the mobile app and the
 * unit tests use. But every deploy path — the Supabase MCP tool, `supabase
 * functions deploy`, the dashboard — uploads ONE function directory as the
 * bundle root. A `../../../` from `index.ts` then walks *past* that root and
 * resolves to `file:///packages/...`, which doesn't exist. The 2026-08-28
 * session hit this and repackaged all six functions by hand; this does the
 * same thing mechanically, and checks the result.
 *
 * Output layout, per function, under `supabase/.deploy/<name>/`:
 *
 *   index.ts            imports rewritten to ./_shared/… and ./game-engine/…
 *   _shared/*.ts        only the helpers actually reached
 *   game-engine/*.ts    only the modules actually reached
 *
 * The repo's own files are never modified.
 *
 * Usage:
 *   node scripts/package-edge-functions.mjs [name ...]   # default: all
 *   node scripts/package-edge-functions.mjs --check      # also `deno check` each bundle
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = join(repoRoot, 'supabase', 'functions');
const engineDir = join(repoRoot, 'packages', 'game-engine', 'src');
const outRoot = join(repoRoot, 'supabase', '.deploy');

const ENGINE_SPECIFIER = /(['"])(?:\.\.\/)+packages\/game-engine\/src\/([\w.-]+)\.ts\1/g;
const SHARED_SPECIFIER = /(['"])\.\.\/_shared\/([\w.-]+)\.ts\1/g;
const LOCAL_SHARED_SPECIFIER = /(['"])\.\/([\w.-]+)\.ts\1/g;

/** Collects every module a bundle needs, following imports transitively. */
function collect(entrySource) {
  const shared = new Set();
  const engine = new Set();

  const scan = (source, insideShared) => {
    for (const [, , name] of source.matchAll(ENGINE_SPECIFIER)) engine.add(name);
    for (const [, , name] of source.matchAll(SHARED_SPECIFIER)) queueShared(name);
    // A `./x.ts` inside _shared is a sibling helper; the same shape at the
    // function root would be a file in the function's own directory, which is
    // already uploaded as-is, so only follow it for shared modules.
    if (insideShared) {
      for (const [, , name] of source.matchAll(LOCAL_SHARED_SPECIFIER)) queueShared(name);
    }
  };

  const queueShared = (name) => {
    if (shared.has(name)) return;
    shared.add(name);
    scan(readFileSync(join(functionsDir, '_shared', `${name}.ts`), 'utf8'), true);
  };

  scan(entrySource, false);
  return { shared, engine };
}

/** Rewrites specifiers for a file that will sit at the bundle root. */
function rewriteEntry(source) {
  return source
    .replace(ENGINE_SPECIFIER, (_m, q, name) => `${q}./game-engine/${name}.ts${q}`)
    .replace(SHARED_SPECIFIER, (_m, q, name) => `${q}./_shared/${name}.ts${q}`);
}

/** Rewrites specifiers for a file that will sit in `_shared/`. Siblings stay `./x.ts`. */
function rewriteShared(source) {
  return source.replace(ENGINE_SPECIFIER, (_m, q, name) => `${q}../game-engine/${name}.ts${q}`);
}

function packageFunction(name) {
  const srcDir = join(functionsDir, name);
  const entryPath = join(srcDir, 'index.ts');
  if (!existsSync(entryPath)) throw new Error(`${name}: no index.ts`);

  const entrySource = readFileSync(entryPath, 'utf8');
  const { shared, engine } = collect(entrySource);

  const outDir = join(outRoot, name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, '_shared'), { recursive: true });
  mkdirSync(join(outDir, 'game-engine'), { recursive: true });

  writeFileSync(join(outDir, 'index.ts'), rewriteEntry(entrySource));
  for (const helper of shared) {
    const source = readFileSync(join(functionsDir, '_shared', `${helper}.ts`), 'utf8');
    writeFileSync(join(outDir, '_shared', `${helper}.ts`), rewriteShared(source));
  }
  for (const module of engine) {
    // Copied verbatim: game-engine modules are self-contained (no module
    // outside the barrel imports a sibling), so nothing needs rewriting. If
    // that ever changes, this is where it breaks — loudly, at `--check`.
    writeFileSync(
      join(outDir, 'game-engine', `${module}.ts`),
      readFileSync(join(engineDir, `${module}.ts`), 'utf8'),
    );
  }

  return {
    name,
    files: [
      'index.ts',
      ...[...shared].sort().map((f) => `_shared/${f}.ts`),
      ...[...engine].sort().map((f) => `game-engine/${f}.ts`),
    ],
  };
}

const args = process.argv.slice(2);
const check = args.includes('--check');
const requested = args.filter((a) => !a.startsWith('--'));

const all = readdirSync(functionsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== '_shared')
  .map((e) => e.name)
  .sort();

const targets = requested.length > 0 ? requested : all;
for (const missing of targets.filter((t) => !all.includes(t))) {
  console.error(`unknown function: ${missing}`);
  process.exit(1);
}

const results = targets.map(packageFunction);
for (const { name, files } of results) {
  console.log(`${name}  (${files.length} files)`);
  for (const f of files) console.log(`    ${f}`);
}
console.log(`\nBundles written to supabase/.deploy/`);

if (check) {
  console.log('\nType-checking each bundle with Deno…');
  const { execFileSync } = await import('node:child_process');
  // @ts-nocheck is what keeps the repo's own tsc/Biome off these files; strip
  // it in the throwaway copy so Deno actually checks what gets deployed.
  for (const { name } of results) {
    const dir = join(outRoot, name);
    for (const rel of ['index.ts']) {
      const p = join(dir, rel);
      writeFileSync(p, readFileSync(p, 'utf8').replace(/^\/\/ @ts-nocheck.*\n/m, ''));
    }
    for (const sub of ['_shared', 'game-engine']) {
      for (const f of readdirSync(join(dir, sub))) {
        const p = join(dir, sub, f);
        writeFileSync(p, readFileSync(p, 'utf8').replace(/^\/\/ @ts-nocheck.*\n/m, ''));
      }
    }
    writeFileSync(join(dir, 'deno.json'), '{"lock": false}\n');
    execFileSync('deno', ['check', 'index.ts'], { cwd: dir, stdio: 'inherit' });
    console.log(`  ok  ${name}`);
  }
  console.log('\nNote: bundles now have @ts-nocheck stripped — they are for');
  console.log('verification. Re-run without --check before deploying.');
}
