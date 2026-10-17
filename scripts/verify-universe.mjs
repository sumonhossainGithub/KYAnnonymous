import { chromium, expect } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

// All test accounts, rooms, and messages live in a disposable database.
const artifacts = resolve('storage/app/ui-review');
await mkdir(artifacts, { recursive: true });
const database = join(artifacts, `browser-test-${process.pid}.sqlite`);
await writeFile(database, '');
const herd = join(homedir(), '.config/herd-lite/bin/php.exe');
const php = process.env.PHP_BINARY || (existsSync(herd) ? herd : 'php');
const base = 'http://127.0.0.1:8012';
const env = { ...process.env, APP_ENV: 'local', APP_URL: base, DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '', SESSION_DRIVER: 'database', CACHE_STORE: 'database', BROADCAST_CONNECTION: 'log' };
let server, browser;
const errors = [];
try {
  const migration = spawnSync(php, ['artisan', 'migrate', '--force', '--no-interaction'], { env, encoding: 'utf8', windowsHide: true });
  if (migration.status !== 0) throw new Error(migration.stdout + migration.stderr);
  console.log('Isolated database ready. Starting browser checks.');
  server = spawn(php, ['-S', '127.0.0.1:8012', '-t', resolve('public'), resolve('vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], { cwd: resolve('public'), env, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore'] });
  server.on('error', error => errors.push(error.message));
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/up`, { signal: AbortSignal.timeout(2000) })).ok) break; } catch { /* Wait for PHP to listen. */ }
    await new Promise(done => setTimeout(done, 500));
  }
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const first = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const second = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await first.newPage();
  const other = await second.newPage();
  for (const tab of [page, other]) {
    tab.setDefaultTimeout(20000);
    tab.setDefaultNavigationTimeout(90000);
    tab.on('pageerror', error => errors.push(error.message));
    tab.on('console', message => {
      if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text());
    });
  }
  await page.goto(base, { waitUntil: 'networkidle' });
  console.log('Home loaded.');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A whole universe.');
  await expect(page.locator('.room-preview-grid .room-preview')).toHaveCount(3);
  await page.getByRole('button', { name: 'Expand constellation' }).click();
  await expect(page.locator('.universe-map')).toHaveClass(/expanded/);
  await page.getByRole('button', { name: 'Collapse constellation' }).click();
  await page.getByRole('button', { name: 'Pause gentle motion' }).click();
  await expect(page.locator('.cosmos-shell')).toHaveClass(/is-still/);
  await page.screenshot({ path: join(artifacts, 'home-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(artifacts, 'home-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Chat rooms', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Chat rooms', exact: true }).click();
  await expect(page.locator('.room-directory .room-preview')).toHaveCount(3);
  await page.getByRole('textbox', { name: 'Search chat rooms' }).fill('quiet');
  await expect(page.locator('.room-directory .room-preview')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear room search' }).click();
  await page.screenshot({ path: join(artifacts, 'rooms-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(artifacts, 'login-desktop.png'), fullPage: true });
  console.log('Desktop and mobile layouts verified. Testing chat with two members.');
  const register = async (tab, name, username) => {
    await tab.goto(`${base}/register`, { waitUntil: 'networkidle' });
    await tab.getByLabel('What should we call you?').fill(name);
    await tab.getByLabel('Choose a username').fill(username);
    await tab.getByLabel('Create a password').fill('OnlyForBrowserTests!2026');
    await tab.getByRole('button', { name: 'Find my place' }).click();
    await tab.waitForURL('**/recovery-code');
    await tab.goto(`${base}/chat`, { waitUntil: 'networkidle' });
  };
  await register(page, 'Wandering Moon', 'test_moon');
  await page.getByRole('button', { name: 'Create a room', exact: true }).click();
  await page.getByLabel('Room name').fill('Little moments');
  await page.getByLabel('What brings people together?').fill('The small things that made today feel a little lighter.');
  await page.getByRole('button', { name: 'Open this room' }).click();
  await page.waitForURL(/\/chat\/little-moments-/);
  const roomUrl = page.url();
  await register(other, 'Quiet Comet', 'test_comet');
  await other.goto(roomUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Your message' }).fill('A little hello from my corner of the universe.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.message-bubble')).toContainText('A little hello');
  await expect(other.locator('.message-bubble')).toContainText('A little hello', { timeout: 15000 });
  await other.getByRole('textbox', { name: 'Your message' }).fill('Hello back. It feels good to slow down and find some company.');
  await other.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.message-bubble').last()).toContainText('Hello back.', { timeout: 15000 });
  await page.screenshot({ path: join(artifacts, 'conversation-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(artifacts, 'conversation-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await other.goto(`${base}/chat/quiet-thoughts`, { waitUntil: 'domcontentloaded' });
  await expect(other.locator('.message-bubble')).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log('PASS: desktop/mobile layouts, motion toggle, constellation controls, room search, registration, room creation, two-user live updates, and room isolation.');
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    const exited = new Promise(done => server.once('exit', done));
    server.kill();
    await exited;
  }
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { await unlink(database + suffix); } catch (error) { if (error.code !== 'ENOENT') console.warn('Test database cleanup:', error.message); }
  }
}
