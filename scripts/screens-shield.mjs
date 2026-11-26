#!/usr/bin/env node
/* npm run screens:shield [origin]  — retakes the screenshots in flows/ai-shield/screens/.
   Needs the dev server (`npm run dev`, default origin http://localhost:5175) and Google Chrome or Microsoft Edge.
   Drives headless Chrome over the DevTools protocol through every AI Shield page, panel and dialog, 1440 px wide, light theme. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const origin = process.argv[2] || 'http://localhost:5175';
const out = join(root, 'flows/ai-shield/screens');
const BROWSERS = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean);
const browser = BROWSERS.find((p) => existsSync(p));
if (!browser) { console.error('Chrome or Edge not found. Set CHROME=<path to the browser>.'); process.exit(1); }
try { await fetch(origin); } catch { console.error(`Nothing is running at ${origin}. Start it with \`npm run dev\`.`); process.exit(1); }

const W = 1440, H = 900, PORT = 9345;
const SESSION_KEY = 'lepide.session'; // src/app/auth.tsx (main branch signs in; harmless where there is no sign-in)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(out, { recursive: true });
const profile = join(tmpdir(), 'lepide-shield-screens-' + Date.now());
const proc = spawn(browser, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
let wsUrl;
for (let i = 0; i < 40 && !wsUrl; i++) { await sleep(250); try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} }
if (!wsUrl) throw new Error('The browser did not start');
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))); ws.send(JSON.stringify({ id, method, params })); });
const run = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || expr); return r.result.value; };
const viewport = (h = H) => send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 1, mobile: false });

await send('Page.enable'); await send('Runtime.enable');
await viewport();
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'light' }] });

/* Page helpers run in the browser. */
const HELPERS = `
  window.__t = (n) => (n?.textContent || '').replace(/\\s+/g, ' ').trim();
  window.__click = (sel, text) => { const el = [...document.querySelectorAll(sel)].find((e) => !text || __t(e) === text || e.getAttribute('aria-label') === text);
    if (!el) throw new Error('No ' + sel + ' "' + (text || '') + '"'); el.scrollIntoView({ block: 'center' }); el.click(); return true; };
  window.__type = (label, value) => { const el = [...document.querySelectorAll('input')].find((i) => i.placeholder === label || i.getAttribute('aria-label') === label
      || (i.id && __t(document.querySelector('label[for="' + i.id + '"]')).startsWith(label)));
    if (!el) throw new Error('No input ' + label);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true })); return true; };
  window.__starts = (sel, text) => { const el = [...document.querySelectorAll(sel)].find((e) => __t(e).startsWith(text));
    if (!el) throw new Error('No ' + sel + ' starting "' + text + '"'); el.scrollIntoView({ block: 'center' }); el.click(); return true; };
  window.__menu = (label, item) => { const b = [...document.querySelectorAll('button[aria-haspopup=menu]')].find((e) => e.getAttribute('aria-label') === label);
    if (!b) throw new Error('No menu ' + label); b.scrollIntoView({ block: 'center' });
    return new Promise((r) => setTimeout(() => { b.click(); setTimeout(() => { __click('[role=menu] button', item); r(true); }, 300); }, 400)); };
  window.__tab = (label) => __starts('.shield-nav button', label);
  true;`;
const step = async (expr, wait = 600) => { await run(HELPERS); await run(expr); await sleep(wait); };
const shot = async (file, full = true) => {
  await run('document.activeElement?.blur?.(); true');
  if (full) {
    const h = await run(`(() => { const m = document.querySelector('.main'); return m ? Math.ceil(m.getBoundingClientRect().top + window.scrollY + m.scrollHeight) : document.documentElement.scrollHeight; })()`);
    await run('window.scrollTo(0, 0); true');
    if (h > H + 8) { await viewport(Math.min(h + 8, 3200)); await sleep(700); }
  }
  const r = await send('Page.captureScreenshot', { format: 'webp', quality: 82 });
  await viewport();
  writeFileSync(join(out, file), Buffer.from(r.data, 'base64'));
  console.log('  ' + file);
};

console.log(`AI Shield from ${origin}:`);
await send('Page.navigate', { url: origin + '/' }); await sleep(1500);
await run(`localStorage.setItem(${JSON.stringify(SESSION_KEY)}, JSON.stringify({ name: 'Console User', email: 'console.user@example.com', initials: 'CU', roleId: 2, roleLabel: 'Scoped product user', permissions: [] })); true`);
await send('Page.navigate', { url: origin + '/shield' });
await sleep(3500); await run('document.fonts.ready.then(() => true)');
await shot('01-overview.webp');

// Sessions: list, then the detail panel of the first session that needs review.
await step(`__tab('Sessions')`, 1200);
await shot('02-sessions.webp');
await step(`__starts('button', 'Needs review')`, 500);
await step(`document.querySelector('tbody tr').click(); true`, 900);
await shot('03-session-detail.webp', false);
await step(`__click('.detail button', 'Close') ; true`, 400).catch(() => {});

// People: list, add (with the empty-form errors), edit, remove.
await step(`__tab('People')`, 1200);
await shot('04-people.webp');
await step(`__click('button', 'Add person')`, 800);
await step(`__click('.drawer__panel button', 'Add person')`, 400);
await shot('05-add-person.webp', false);
await step(`__click('.drawer__panel button', 'Cancel')`, 600);
await step(`__menu('Manage Helen Ward', 'Edit')`, 900);
await shot('06-edit-person.webp', false);
await step(`__click('.drawer__panel button', 'Cancel')`, 600);
await step(`__menu('Manage Karen Hughes', 'Remove')`, 800);
await shot('07-remove-person.webp', false);
await step(`__click('[role=dialog] button', 'Cancel')`, 600);

// Protection policy: cards, the editor drawer, then the publish bar after a change.
await step(`__tab('Protection policy')`, 1200);
await shot('08-policy.webp');
await step(`[...document.querySelector('.shield-pol__card').querySelectorAll('button')].find((b) => __t(b) === 'Edit').click(); true`, 900);
await shot('09-policy-editor.webp', false);
await step(`__type('Add a keyword', 'Blood Type'); document.querySelector('.shield-kwedit input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); true`, 300);
await step(`__click('.drawer__panel button', 'Apply to draft')`, 800);
await run(`document.querySelector('.shield-savebar').scrollIntoView({ block: 'end' }); true`); await sleep(400);
await shot('10-policy-publish.webp', false);
await step(`__click('.shield-savebar button', 'Discard')`, 500);

// Admin activity and Server.
await step(`__tab('Admin activity')`, 1200);
await shot('11-activity.webp');
await step(`__tab('Server')`, 1200);
await shot('12-server.webp');

ws.close(); proc.kill(); await sleep(400);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log(`Saved to ${out}`);
