/**
 * Pre-deploy safety checks: `npm run preflight`.
 * Never prints secret values: for key-like matches it reports only file paths or commit hashes.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const results: Array<{ name: string; pass: boolean; detail: string }> = [];

function record(name: string, pass: boolean, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `\n      ${detail}` : ''}`);
}

function run(cmd: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function walk(dir: string, skip: Set<string>): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, skip));
    else out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/');

// 1. Tests
const tests = run('npm', ['test']);
const summary = tests.out.match(/Test Results: .*/)?.[0] ?? 'no summary line';
record('Test suite (npm test)', tests.ok, summary);

// 2. Build
const build = run('npm', ['run', 'build']);
record('Production build (npm run build)', build.ok, build.ok ? '' : build.out.split('\n').filter(l => /error/i.test(l)).slice(0, 5).join('\n      '));

// 3. dist/ must not contain Gemini identifiers or key material
{
  const needles = ['GEMINI', 'AIza', 'VITE_GEMINI'];
  const hits: string[] = [];
  const files = walk(path.join(ROOT, 'dist'), new Set());
  for (const f of files) {
    if (!/\.(js|html|css|map|json|txt)$/.test(f)) continue;
    const text = fs.readFileSync(f, 'utf8');
    for (const n of needles) if (text.includes(n)) hits.push(`${rel(f)} contains "${n}"`);
  }
  record('dist/ has no "GEMINI", "AIza" or "VITE_GEMINI"', files.length > 0 && hits.length === 0, files.length === 0 ? 'dist/ is empty or missing' : hits.join('\n      '));
}

// 4. No VITE_-prefixed secret-like variable names in source or .env.example
{
  const pattern = /VITE_[A-Z0-9_]*(KEY|SECRET|TOKEN)[A-Z0-9_]*/;
  const skip = new Set(['node_modules', 'dist', '.git']);
  const candidates = [
    ...walk(path.join(ROOT, 'src'), skip),
    ...walk(path.join(ROOT, 'api'), skip),
    ...['index.html', 'vite.config.ts', '.env.example', 'vercel.json', 'package.json'].map(f => path.join(ROOT, f))
  ].filter(f => fs.existsSync(f) && /\.(ts|tsx|js|jsx|mjs|html|json)$|\.env\.example$/.test(f));
  const hits: string[] = [];
  for (const f of candidates) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = line.match(pattern);
      if (m) hits.push(`${rel(f)}:${i + 1} uses ${m[0]}`);
    });
  }
  record('No VITE_*KEY/SECRET/TOKEN variable names in source or .env.example', hits.length === 0, hits.join('\n      '));
}

// 5. .gitignore covers .env and .env.local
{
  const missing = ['.env', '.env.local'].filter(f => !run('git', ['check-ignore', '-q', '--no-index', f]).ok);
  record('.gitignore ignores .env and .env.local', missing.length === 0, missing.length ? `not ignored: ${missing.join(', ')}` : '');
}

// 6. Git history must not contain a Google API key (print commit hashes only, never the key)
{
  const log = run('git', ['log', '--all', '--extended-regexp', '-G', 'AIza[0-9A-Za-z_-]{35}', '--format=%H']);
  const hashes = log.out.split('\n').map(s => s.trim()).filter(s => /^[0-9a-f]{40}$/.test(s));
  if (!log.ok) {
    record('Git history has no Google API key', false, 'git log failed; run inside the repository');
  } else if (hashes.length > 0) {
    console.log('\n' + '!'.repeat(64));
    console.log('!!  ROTATE THIS KEY: a Google API key pattern was found in git history.');
    console.log('!!  Revoke it in Google AI Studio / Cloud Console, then purge history.');
    console.log('!'.repeat(64));
    record('Git history has no Google API key', false, `commits: ${hashes.join(', ')}`);
  } else {
    record('Git history has no Google API key', true);
  }
}

const failed = results.filter(r => !r.pass);
console.log(`\nPreflight summary: ${results.length - failed.length}/${results.length} checks passed${failed.length ? ` (FAILED: ${failed.map(f => f.name).join('; ')})` : ''}`);
process.exit(failed.length ? 1 : 0);
