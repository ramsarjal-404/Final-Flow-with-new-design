#!/usr/bin/env node
/* npm run check:ai [-- --online]  — keeps this repository readable by people and AI tools without breaks.
   Fails when:
   1. a doc or AI-rules file points outside the repository (`../lepide-design-system`, a local `file:` package, …);
   2. a relative Markdown link or image points to a file that doesn't exist;
   3. a web link isn't on the ALLOWED list below (each entry says why it can't break);
   4. a flow (flows/<id>/flow.json) names a code file, screenshot or design-system component page that doesn't exist,
      or its FLOW.md doesn't show every screenshot;
   5. SCREENS.md is out of date (`npm run catalog`);
   6. the MCP configs don't register the hosted server, or package.json installs the kit from somewhere else.
   With --online it also requests every https://lepide-new-ds.vercel.app address used and fails on anything but 200
   (the MCP endpoint must answer an MCP initialize request). */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = '.claude/skills/lepide-design-system';
const DS = 'https://lepide-new-ds.vercel.app';
const rel = (p) => relative(root, p).replace(/\\/g, '/');
const read = (p) => readFileSync(join(root, p), 'utf8');
const problems = [];

/* Web links that may appear, and why each is safe. */
const ALLOWED = [
  [new RegExp('^' + DS.replace(/\./g, '\\.') + '(/|$)'), 'the live design system (checked with --online)'],
  [/^https:\/\/www\.figma\.com\/design\/(sPRioBwcfFrdLOXUFRvSV9|GdZc2Hux1DgdJXCVQxjflx)\b/, 'Figma sources: content reference only'],
  [/^https?:\/\/localhost(:\d+)?\b/, 'the local dev server'],
  [/^https:\/\/lepide-new-ui\.vercel\.app\/?$|^https:\/\/lepide-with-new-design\.vercel\.app(\/|\/login)?$/, 'the live prototype root and its sign-in (deep links 404 there, so none are used)'],
  [/^https:\/\/lepide\.vercel\.app\/blueprint\//, 'product images used by the seed data'],
  [/^https:\/\/json-schema\.org\//, 'JSON schema standard'],
  [/^http:\/\/www\.microsoft\.com\/en-in\/download\//, 'SQL Express download link shown in the UI'],
];

/* The files people and AI tools read (the copied design-system skill is checked for links only). */
const walk = (dir, ok) => existsSync(join(root, dir)) ? readdirSync(join(root, dir), { recursive: true }).map((f) => `${dir}/${String(f).replace(/\\/g, '/')}`).filter((f) => ok(f) && statSync(join(root, f)).isFile()) : [];
const docs = [
  'AGENTS.md', 'CLAUDE.md', 'README.md', 'DESIGN.md', 'SCREENS.md', '.github/copilot-instructions.md',
  ...walk('.cursor/rules', (f) => f.endsWith('.mdc')),
  ...walk('flows', (f) => f.endsWith('.md')),
  ...walk('src', (f) => f.endsWith('.md')),
].filter((f) => existsSync(join(root, f)));
const skillDocs = walk(SKILL, (f) => /\.(md|mdc)$/.test(f) && !f.includes('/examples/'));
const configs = ['.mcp.json', '.vscode/mcp.json', '.cursor/mcp.json', '.codex/config.toml', 'package.json', 'vite.config.ts'];

const webUsed = new Set();
const lineOf = (text, i) => text.slice(0, i).split('\n').length;
function checkFile(f, { local = true } = {}) {
  const text = read(f);
  if (local) {
    for (const m of text.matchAll(/\.\.\/lepide-design-system|file:\.\.\//g)) problems.push(`${f}:${lineOf(text, m.index)} points outside the repository ("${m[0]}"). Use ${SKILL}/… or ${DS}.`);
  }
  for (const m of text.matchAll(/https?:\/\/[^\s)"'<>`\]|*]+/g)) {
    const url = m[0].replace(/[.,;:]+$/, '');
    if (!ALLOWED.some(([re]) => re.test(url))) problems.push(`${f}:${lineOf(text, m.index)} links to ${url} — not on the ALLOWED list in scripts/check-ai.mjs.`);
    if (url.startsWith(DS) && !/[<{]/.test(url)) webUsed.add(url);
  }
  if (!/\.md$|\.mdc$/.test(f)) return;
  const noCode = text.replace(/```[\s\S]*?```/g, (b) => b.replace(/[^\n]/g, ' '));
  for (const m of noCode.matchAll(/!?\[[^\]]*\]\(([^)\s#]+)(#[^)]*)?\)/g)) {
    const target = decodeURI(m[1]);
    if (/^[a-z]+:/i.test(target)) continue;
    if (!existsSync(join(root, dirname(f), target))) problems.push(`${f}:${lineOf(text, m.index)} links to ${target}, which doesn't exist (${rel(join(root, dirname(f), target))}).`);
  }
}
docs.forEach((f) => checkFile(f));
skillDocs.forEach((f) => checkFile(f, { local: false }));
configs.filter((f) => existsSync(join(root, f))).forEach((f) => checkFile(f));

/* Flows. */
const flowDirs = readdirSync(join(root, 'flows'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `flows/${d.name}`);
for (const dir of flowDirs) {
  const jf = `${dir}/flow.json`;
  if (!existsSync(join(root, jf))) { problems.push(`${dir} has no flow.json.`); continue; }
  if (!existsSync(join(root, dir, 'FLOW.md'))) problems.push(`${dir} has no FLOW.md.`);
  let flow; try { flow = JSON.parse(read(jf)); } catch (e) { problems.push(`${jf} is not valid JSON: ${e.message}`); continue; }
  for (const k of ['id', 'title', 'designSystem', 'code', 'routes']) if (!(k in flow)) problems.push(`${jf} is missing "${k}".`);
  for (const [k, p] of Object.entries(flow.code ?? {})) if (!existsSync(join(root, p))) problems.push(`${jf} code.${k}: ${p} doesn't exist.`);
  for (const k of ['specInRepo', 'componentDocsInRepo']) if (flow.designSystem?.[k] && !existsSync(join(root, flow.designSystem[k]))) problems.push(`${jf} designSystem.${k}: ${flow.designSystem[k]} doesn't exist.`);
  const md = existsSync(join(root, dir, 'FLOW.md')) ? read(`${dir}/FLOW.md`) : '';
  const views = [...(flow.screens ?? []), ...(flow.wizard?.steps ?? []), ...(flow.dialogs ?? [])];
  for (const v of views) {
    const name = v.id || v.title;
    if (v.screenshot) {
      if (!existsSync(join(root, dir, v.screenshot))) problems.push(`${jf} ${name}: screenshot ${v.screenshot} doesn't exist (npm run screens:ad).`);
      if (!md.includes(`(${v.screenshot})`)) problems.push(`${dir}/FLOW.md doesn't show ${v.screenshot} (${name}).`);
    }
    for (const c of v.components ?? []) if (!existsSync(join(root, SKILL, 'docs/components', `${c}.md`))) problems.push(`${jf} ${name}: component "${c}" has no page in ${SKILL}/docs/components/.`);
  }
  for (const f of walk(`${dir}/screens`, () => true)) if (!views.some((v) => `${dir}/${v.screenshot}` === f)) problems.push(`${f} isn't used by ${jf}.`);
}

/* SCREENS.md up to date. */
try { execFileSync(process.execPath, [join(root, 'scripts/screens-catalog.mjs'), '--check'], { stdio: 'pipe' }); }
catch (e) { problems.push(String(e.stderr || e.message).trim()); }

/* Configs: hosted MCP server and hosted kit. */
const want = `${DS}/mcp`;
for (const f of ['.mcp.json', '.vscode/mcp.json', '.cursor/mcp.json', '.codex/config.toml']) {
  if (!existsSync(join(root, f))) problems.push(`${f} is missing: it registers the design-system MCP server (${want}).`);
  else if (!read(f).includes(want)) problems.push(`${f} doesn't register ${want}.`);
}
const deps = JSON.parse(read('package.json')).dependencies ?? {};
for (const p of ['@lepide/ds-css', '@lepide/ds-react']) {
  if (!String(deps[p] ?? '').startsWith(`${DS}/ds/`)) problems.push(`package.json installs ${p} from "${deps[p]}", not ${DS}/ds/ — a clone couldn't build.`);
  else webUsed.add(deps[p]);
}

/* --online: every live design-system address answers. */
if (process.argv.includes('--online')) {
  for (const url of [...webUsed].sort()) {
    try {
      const isMcp = /\/mcp\/?$/.test(url);
      const res = await fetch(url, isMcp ? {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'check-ai', version: '1' } } }),
      } : { method: 'GET' });
      if (res.status !== 200) problems.push(`${url} answered ${res.status}.`);
    } catch (e) { problems.push(`${url} couldn't be reached: ${e.message}`); }
  }
}

if (problems.length) { console.error(problems.join('\n') + `\n\n${problems.length} problem(s).`); process.exit(1); }
console.log(`AI check: ${docs.length} docs, ${skillDocs.length} design-system pages, ${flowDirs.length} flow(s) — no breaks${process.argv.includes('--online') ? `; ${webUsed.size} live addresses answer` : ''}.`);
