#!/usr/bin/env node
/**
 * Renders every app icon and splash image from one mark: the app's own
 * dumbbell (lucide `Dumbbell`) in the primary orange on the dark background,
 * so the home-screen icon matches what the user sees inside the app.
 *
 * Rendering goes through headless Chrome over the DevTools protocol — the SVG
 * is drawn at each exact pixel size, nothing is downscaled.
 *
 *   node scripts/make-icons.mjs                 # public/icons (PWA, favicon)
 *   node scripts/make-icons.mjs --ios <repo>    # AppIcon + Splash of the iOS shell
 *   node scripts/make-icons.mjs --android <repo># mipmaps, splash, Play icon
 *
 * The native shells wrap this as `npm run icons`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const WEB_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// hsl(20 5% 10%) and hsl(28 80% 52%): --background and --primary of the dark theme.
const BACKGROUND = '#1b1918';
const ORANGE = '#e77e23';

// lucide-react `Dumbbell`, ISC licence.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${ORANGE}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
<path d="M14.4 14.4 9.6 9.6"/>
<path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/>
<path d="m21.5 21.5-1.4-1.4"/>
<path d="M3.9 3.9 2.5 2.5"/>
<path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>
</svg>`;

/**
 * variant:
 *  square     opaque background, mark at 74% — stores and OS apply their own mask
 *  rounded    transparent corners, 22% radius — legacy Android launchers
 *  circle     transparent outside a circle — legacy round launchers
 *  maskable   opaque, mark at 60% so it survives any adaptive/maskable mask
 *  foreground transparent, mark at 60% — the adaptive icon's top layer
 *  solid      background colour only — the adaptive icon's bottom layer
 *  splash     opaque, mark sized to the short edge — launch screens
 */
function html(w, h, variant) {
  const markPct = { square: 74, rounded: 74, circle: 70, maskable: 60, foreground: 60, splash: 0 }[variant] ?? 0;
  
  const radius = variant === 'rounded' ? '22%' : variant === 'circle' ? '50%' : '0';
  const mark = variant === 'splash' ? Math.round(Math.min(w, h) * 0.26) : Math.round(Math.min(w, h) * markPct / 100);
  const bg = variant === 'foreground' ? 'transparent' : BACKGROUND;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${w}px;height:${h}px;background:transparent;overflow:hidden}
.tile{width:${w}px;height:${h}px;background:${bg};border-radius:${radius};display:flex;align-items:center;justify-content:center}
svg{width:${mark}px;height:${mark}px;display:block}
</style></head><body><div class="tile">${variant === 'solid' ? '' : MARK}</div></body></html>`;
}

async function render(jobs) {
  const profile = join(tmpdir(), `wp-icons-chrome-${process.pid}`);
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    `--user-data-dir=${profile}`, '--remote-debugging-port=9337', 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let targets;
  for (let i = 0; i < 100; i++) {
    try { targets = await (await fetch('http://localhost:9337/json')).json(); if (targets.length) break; } catch {}
    await sleep(100);
  }
  if (!targets?.length) throw new Error(`Chrome did not start at ${CHROME}; set CHROME=/path/to/chrome`);
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((r) => { ws.send(JSON.stringify({ id: ++id, method, params })); pending.set(id, r); });

  await send('Page.enable');
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (const j of jobs) {
    await send('Emulation.setDeviceMetricsOverride', { width: j.w, height: j.h, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(html(j.w, j.h, j.variant))}` });
    await send('Runtime.evaluate', { expression: 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))', awaitPromise: true });
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: j.w, height: j.h, scale: 1 } });
    mkdirSync(dirname(j.out), { recursive: true });
    writeFileSync(j.out, Buffer.from(shot.result.data, 'base64'));
    console.log('->', j.out.replace(process.cwd() + '/', ''), `${j.w}x${j.h}`);
  }
  ws.close();
  chrome.kill();
}

function webJobs() {
  const dir = join(WEB_ROOT, 'public', 'icons');
  return [
    { out: join(dir, 'favicon-32.png'), w: 32, h: 32, variant: 'square' },
    { out: join(dir, 'apple-touch-icon.png'), w: 180, h: 180, variant: 'square' },
    { out: join(dir, 'icon-192.png'), w: 192, h: 192, variant: 'square' },
    { out: join(dir, 'icon-512.png'), w: 512, h: 512, variant: 'square' },
    { out: join(dir, 'icon-maskable-512.png'), w: 512, h: 512, variant: 'maskable' },
  ];
}

function iosJobs(repo) {
  const assets = join(repo, 'ios', 'App', 'App', 'Assets.xcassets');
  return [
    { out: join(assets, 'AppIcon.appiconset', 'AppIcon-512@2x.png'), w: 1024, h: 1024, variant: 'square' },
    ...['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']
      .map((f) => ({ out: join(assets, 'Splash.imageset', f), w: 2732, h: 2732, variant: 'splash' })),
  ];
}

function androidJobs(repo) {
  const res = join(repo, 'android', 'app', 'src', 'main', 'res');
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  const jobs = [];
  for (const [d, k] of Object.entries(densities)) {
    const dir = join(res, `mipmap-${d}`);
    const legacy = 48 * k;
    const adaptive = 108 * k;
    jobs.push(
      { out: join(dir, 'ic_launcher.png'), w: legacy, h: legacy, variant: 'rounded' },
      { out: join(dir, 'ic_launcher_round.png'), w: legacy, h: legacy, variant: 'circle' },
      { out: join(dir, 'ic_launcher_foreground.png'), w: adaptive, h: adaptive, variant: 'foreground' },
      { out: join(dir, 'ic_launcher_background.png'), w: adaptive, h: adaptive, variant: 'solid' },
    );
  }
  // Capacitor's splash drawables, at the sizes its template ships.
  const splash = {
    'drawable': [480, 320],
    'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
    'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
    'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
    'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
  };
  for (const [dir, [w, h]] of Object.entries(splash)) {
    jobs.push({ out: join(res, dir, 'splash.png'), w, h, variant: 'splash' });
  }
  jobs.push({ out: join(repo, 'store', 'play-store-icon.png'), w: 512, h: 512, variant: 'square' });
  return jobs;
}

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const ios = flag('--ios');
const android = flag('--android');
const jobs = ios ? iosJobs(ios) : android ? androidJobs(android) : webJobs();
await render(jobs);
