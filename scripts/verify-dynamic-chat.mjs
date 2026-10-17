import { chromium, expect } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const artifacts = resolve('storage/app/dynamic-chat-review');
await mkdir(artifacts, { recursive: true });
const database = join(artifacts, `dynamic-${process.pid}.sqlite`);
await writeFile(database, '');
const herd = join(homedir(), '.config/herd-lite/bin/php.exe');
const php = process.env.PHP_BINARY || (existsSync(herd) ? herd : 'php');
const base = 'http://127.0.0.1:8014';
const env = { ...process.env, APP_ENV: 'local', APP_URL: base, DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
  SESSION_DRIVER: 'database', CACHE_STORE: 'database', BROADCAST_CONNECTION: 'log', APP_CONFIG_CACHE: join(artifacts, `config-${process.pid}.php`) };
const runPhp = (args, input) => {
  const result = spawnSync(php, args, { env, input, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
  return result.stdout;
};
let server, browser;
const errors = [];
try {
  runPhp(['artisan', 'migrate', '--force', '--no-interaction']);
  runPhp([], String.raw`<?php
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (config('database.connections.sqlite.database') !== getenv('DB_DATABASE')) throw new Exception('Wrong test database');
foreach (['admin' => 'SUPER_ADMIN', 'member' => 'USER'] as $name => $role) {
 App\Models\User::create(['display_name'=>ucfirst($name),'username'=>$name,'username_normalized'=>$name,'gender'=>'Male','password'=>'DynamicTest!2026','role'=>$role,'status'=>'ACTIVE']);
}
`);
  server = spawn(php, ['-S', '127.0.0.1:8014', '-t', resolve('public'), resolve('vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], { cwd: resolve('public'), env, windowsHide: true, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Test server exited before startup');
    try { if ((await fetch(`${base}/up`, { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* Startup */ }
    await new Promise(done => setTimeout(done, 250));
  }
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const memberContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const guest = await guestContext.newPage(), admin = await adminContext.newPage(), member = await memberContext.newPage();
  for (const page of [guest, admin, member]) {
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
  }
  const login = async (page, username) => {
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.locator('#username').fill(username);
    await page.locator('#password').fill('DynamicTest!2026');
    await page.locator('.auth-card button.button').click();
    await page.waitForURL(username === 'admin' ? '**/admin/dashboard' : `${base}/`);
  };
  await guest.goto(base, { waitUntil: 'networkidle' });
  await login(member, 'member');
  await login(admin, 'admin');
  await admin.goto(`${base}/admin/settings`, { waitUntil: 'networkidle' });
  await expect(admin.getByRole('heading', { name: 'Make this community yours.' })).toBeVisible();
  console.log('Homepage, member chat, and admin settings loaded.');

  let documentNavigations = 0, inertiaRequests = 0;
  guest.on('request', request => { if (request.isNavigationRequest()) documentNavigations++; if (request.headers()['x-inertia']) inertiaRequests++; });
  await guest.evaluate(() => { window.__chatSentinel = 'stable'; });
  const message = guest.getByRole('textbox', { name: 'Your public chat message' });
  await message.fill('A guest message without navigation');
  await message.press('Enter');
  await expect(guest.locator('.message-bubble').last()).toContainText('without navigation');
  await expect(message).toHaveValue('');
  await expect(message).toBeFocused();
  await expect(member.locator('.message-bubble').last()).toContainText('without navigation');
  await guest.getByRole('button', { name: 'Reply in Sub-chat' }).first().click();
  const thread = guest.getByRole('form', { name: 'Reply thread' });
  await thread.locator('input[type=text]').fill('Thread stays open');
  await thread.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(guest.getByText('Thread stays open', { exact: true })).toBeVisible();
  await expect(thread).toBeVisible();
  await message.fill('Draft survives incoming updates');
  await member.getByRole('textbox', { name: 'Your public chat message' }).fill('New member message');
  await member.getByRole('button', { name: 'Send message' }).click();
  await expect(guest.locator('.message-bubble').last()).toContainText('New member message');
  await expect(message).toHaveValue('Draft survives incoming updates');
  expect(await guest.evaluate(() => window.__chatSentinel)).toBe('stable');
  expect(documentNavigations).toBe(0);
  expect(inertiaRequests).toBe(0);
  await guest.getByRole('searchbox', { name: 'Search loaded messages' }).fill('New member');
  await expect(guest.locator('.chat-message')).toHaveCount(1);
  await guest.getByRole('searchbox', { name: 'Search loaded messages' }).fill('');

  await guest.route('**/chat/*/message', route => route.abort('failed'));
  await message.press('Enter');
  await expect(guest.locator('.conversation-compose [role=alert]')).toBeVisible();
  await expect(message).toHaveValue('Draft survives incoming updates');
  await guest.unroute('**/chat/*/message');
  console.log('No page navigation or Inertia requests during send, replies, or polling; drafts and threads preserved.');

  await admin.getByLabel('Website name', { exact: true }).fill('Moonlight Community');
  await admin.getByLabel('Accent color', { exact: true }).fill('#a78bfa');
  await admin.getByLabel('Text style', { exact: true }).selectOption('serif');
  await expect(admin.locator('.settings-preview')).toContainText('Moonlight Community');
  await admin.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(admin.getByText('Website settings saved.', { exact: true })).toBeVisible();
  await admin.getByRole('tab', { name: 'Content', exact: true }).click();
  await admin.getByLabel('Homepage heading', { exact: true }).fill('Welcome to Moonlight');
  await admin.getByLabel('Show announcement banner').check();
  await admin.getByLabel('Announcement text', { exact: true }).fill('A friendly place to chat.');
  await admin.getByLabel('Community rules', { exact: true }).fill('Be kind. Respect each other.');
  await admin.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(admin.getByRole('button', { name: 'Save settings', exact: true })).toBeDisabled();

  await admin.getByRole('tab', { name: 'Chat', exact: true }).click();
  await admin.getByLabel('Allow guest messages').uncheck();
  await admin.getByLabel('Maximum message length', { exact: true }).fill('100');
  await admin.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(guest.locator('.conversation-compose')).toContainText('Sign in to send messages.');
  await expect(member.getByRole('textbox', { name: 'Your public chat message' })).toHaveAttribute('maxlength', '100');
  await admin.getByRole('tab', { name: 'Community', exact: true }).click();
  await admin.getByLabel('Allow new registrations').uncheck();
  await admin.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(admin.getByRole('button', { name: 'Save settings', exact: true })).toBeDisabled();
  await guest.goto(`${base}/register`, { waitUntil: 'networkidle' });
  await expect(guest.getByRole('heading', { name: 'Registration is closed' })).toBeVisible();
  await guest.goto(base, { waitUntil: 'networkidle' });
  await expect(guest.getByRole('heading', { name: 'Welcome to Moonlight' })).toBeVisible();
  await expect(guest.locator('.site-announcement')).toContainText('A friendly place to chat.');
  expect(await guest.locator('.cosmos-shell').evaluate(el => getComputedStyle(el).getPropertyValue('--site-accent').trim())).toBe('#a78bfa');
  await guest.goto(`${base}/rules`, { waitUntil: 'networkidle' });
  await expect(guest.locator('.custom-policy')).toContainText('Be kind. Respect each other.');
  console.log('Settings persist, theme/content render, and chat permissions update while conversations stay open.');

  await admin.getByRole('tab', { name: 'Rooms', exact: true }).click();
  await admin.getByRole('textbox', { name: 'New room name' }).fill('Moonlight lounge');
  await admin.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(admin.getByRole('heading', { name: 'Edit Moonlight lounge' })).toBeVisible();
  await admin.getByRole('tab', { name: 'Branding', exact: true }).click();
  const layoutFailures = [];
  for (const width of [320, 390, 768, 1440]) {
    await admin.setViewportSize({ width, height: 900 });
    for (const tab of ['Branding', 'Content', 'Community', 'Chat', 'Rooms']) {
      await admin.getByRole('tab', { name: tab, exact: true }).click();
      if (await admin.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) layoutFailures.push(`${tab}@${width}`);
    }
    if (width === 390) { await admin.getByRole('tab', { name: 'Branding', exact: true }).click(); await admin.screenshot({ path: join(artifacts, 'settings-mobile.png'), fullPage: true }); }
  }
  await admin.getByRole('tab', { name: 'Branding', exact: true }).click();
  await admin.screenshot({ path: join(artifacts, 'settings-desktop.png'), fullPage: true });
  await member.goto(`${base}/chat/common-orbit`, { waitUntil: 'networkidle' });
  await member.getByRole('textbox', { name: 'Your message', exact: true }).fill('Room message is dynamic too');
  await member.getByRole('button', { name: 'Send message' }).click();
  await expect(member.locator('.message-bubble').last()).toContainText('dynamic too');
  await member.screenshot({ path: join(artifacts, 'chat-mobile.png'), fullPage: true });
  await admin.goto(`${base}/chat/common-orbit`, { waitUntil: 'networkidle' });
  admin.on('dialog', dialog => dialog.accept());
  await admin.getByRole('button', { name: 'Remove message', exact: true }).last().click();
  await expect(member.locator('.message-bubble').filter({ hasText: 'dynamic too' })).toHaveCount(0);
  expect(layoutFailures).toEqual([]);
  expect(errors).toEqual([]);
  await writeFile(join(artifacts, 'results.json'), JSON.stringify({ documentNavigations, inertiaRequests, layoutFailures, errors, status: 'passed' }, null, 2));
  console.log('PASS: background chat, threads, drafts, errors, customization persistence, live policies, rooms, moderation, and mobile admin layouts.');
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) { const exited = new Promise(done => server.once('exit', done)); server.kill(); await exited; }
  for (const suffix of ['', '-wal', '-shm', '-journal']) { try { await unlink(database + suffix); } catch (error) { if (error.code !== 'ENOENT') console.warn(error.message); } }
}
