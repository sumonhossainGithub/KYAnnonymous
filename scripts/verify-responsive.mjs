import { chromium, expect } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

// Real routes and populated pages, with all writes confined to a disposable DB.
const artifacts = resolve('storage/app/responsive-review');
await mkdir(artifacts, { recursive: true });
const database = join(artifacts, `responsive-${process.pid}.sqlite`);
await writeFile(database, '');
const herd = join(homedir(), '.config/herd-lite/bin/php.exe');
const php = process.env.PHP_BINARY || (existsSync(herd) ? herd : 'php');
const base = 'http://127.0.0.1:8013';
const env = { ...process.env, APP_ENV: 'local', APP_URL: base, DB_CONNECTION: 'sqlite', DB_DATABASE: database,
  DB_URL: '', SESSION_DRIVER: 'database', CACHE_STORE: 'database', BROADCAST_CONNECTION: 'log',
  APP_CONFIG_CACHE: join(artifacts, `unused-config-${process.pid}.php`) };
const widths = [320, 390, 540, 640, 760, 768, 1024, 1440];
const failures = [];
const errors = [];
let server, browser, checks = 0;
const runPhp = (args, input) => {
  const result = spawnSync(php, args, { env, input, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
  return result.stdout;
};
try {
  runPhp(['artisan', 'migrate', '--force', '--no-interaction']);
  const fixture = JSON.parse(runPhp([], String.raw`<?php
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== getenv('DB_DATABASE')) { throw new Exception('Test database mismatch'); }
$user = App\Models\User::create(['display_name'=>str_repeat('Wanderer',6), 'username'=>'responsive_admin', 'username_normalized'=>'responsive_admin', 'gender'=>'Male', 'password'=>'ResponsiveTest!2026', 'role'=>'SUPER_ADMIN', 'status'=>'ACTIVE']);
$org = App\Models\Organization::create(['name'=>str_repeat('LongCommunity',6), 'slug'=>'responsive-community', 'description'=>str_repeat('Description',25), 'status'=>'ACTIVE']);
$post = App\Models\Post::create(['user_id'=>$user->id, 'organization_id'=>$org->id, 'title'=>str_repeat('LongTitle',20), 'body'=>str_repeat('LongUnbrokenText',40), 'status'=>'ACTIVE', 'comments_count'=>4]);
$parent = null;
for ($depth=0; $depth<4; $depth++) {
  $comment = App\Models\Comment::create(['post_id'=>$post->id,'user_id'=>$user->id,'parent_id'=>$parent,'depth'=>$depth,'body'=>str_repeat('LongComment',30),'status'=>'ACTIVE']);
  $parent = $comment->id;
}
App\Models\Notice::create(['title'=>str_repeat('Notice',20),'body'=>str_repeat('LongNoticeBody',40),'pinned'=>true,'status'=>'PUBLISHED','published_at'=>now()]);
App\Models\Report::create(['reporter_id'=>$user->id,'target_type'=>'post','target_public_id'=>$post->public_id,'reason'=>'Spam','notes'=>str_repeat('LongReport',30),'status'=>'PENDING']);
App\Models\AdminAuditLog::create(['admin_id'=>$user->id,'action'=>'RESPONSIVE_TEST','target_type'=>'post','target_public_id'=>$post->public_id,'safe_metadata'=>['test'=>str_repeat('Metadata',20)],'created_at'=>now()]);
App\Models\SecurityEvent::create(['event_type'=>'RESPONSIVE_TEST','pseudonymous_digest'=>str_repeat('a',64)]);
$room = App\Models\ChatRoom::first();
$room->update(['name'=>str_repeat('RoomName',7), 'description'=>str_repeat('Description',20)]);
App\Models\ChatMessage::create(['chat_room_id'=>$room->id,'user_id'=>$user->id,'message'=>str_repeat('LongMessage',35)]);
echo json_encode(['post'=>$post->public_id,'room'=>$room->slug]);
`));
  server = spawn(php, ['-S', '127.0.0.1:8013', '-t', resolve('public'), resolve('vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')],
    { cwd: resolve('public'), env, windowsHide: true, stdio: 'ignore' });
  server.on('error', error => errors.push(error.message));
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/up`, { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* startup */ }
    await new Promise(done => setTimeout(done, 250));
  }
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const inspect = async (name, sizes = widths) => {
    for (const width of sizes) {
      await page.setViewportSize({ width, height: width === 640 ? 360 : 844 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const result = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('.cosmos-workspace *')].filter(el => {
          if (el.closest('svg, .overflow-x-auto')) return false;
          const rect = el.getBoundingClientRect();
          return rect.width && (rect.right > viewport + 1 || rect.left < -1);
        }).slice(0, 6).map(el => `${el.tagName}.${el.className}`);
        const smallInputs = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea,select')]
          .filter(el => el.getBoundingClientRect().width && parseFloat(getComputedStyle(el).fontSize) < 16).length;
        return { overflow: document.documentElement.scrollWidth > viewport + 1, offenders, smallInputs };
      });
      if (result.overflow || result.offenders.length || (width <= 760 && result.smallInputs)) failures.push({ name, width, ...result });
      checks++;
      if (width === 390 && ['home', 'chat', 'post', 'admin-dashboard', 'register'].includes(name)) {
        await page.screenshot({ path: join(artifacts, `${name}-mobile.png`), fullPage: true });
      }
    }
    console.log(`Checked ${name}`);
  };
  const visit = async (path, name) => {
    const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    expect(response.status(), path).toBe(200);
    await expect(page.locator('#main-content')).toBeVisible();
    await inspect(name);
  };
  for (const [path, name] of [['/', 'home'], ['/chat', 'directory'], ['/search', 'search'], ['/search?q=Long', 'search-results'], ['/notices', 'notices'], ['/rules', 'rules'], ['/privacy', 'privacy'], ['/login', 'login'], ['/register', 'register'], ['/recovery', 'recovery']]) await visit(path, name);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog', { name: 'Main navigation' })).toBeVisible();
  const drawerLinks = page.locator('#main-navigation a[href], #main-navigation button:not([disabled])');
  await drawerLinks.last().focus();
  await page.keyboard.press('Tab');
  await expect(drawerLinks.first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawerLinks.last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('#main-navigation a[href="/chat"]').click();
  await expect(page.locator('.sidebar-backdrop')).toHaveCount(0);
  await expect(page.locator('.cosmos-workspace')).not.toHaveAttribute('inert');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(page.locator('.sidebar-backdrop')).toHaveCount(0);

  await page.goto(`${base}/register`, { waitUntil: 'networkidle' });
  await page.getByLabel('What should we call you?').fill('Mobile Member');
  await page.getByLabel('Choose a username').fill('responsive_member');
  await page.getByLabel('Create a password').fill('ResponsiveTest!2026');
  await page.locator('.auth-card button[type=submit], .auth-card button.button').click();
  await page.waitForURL('**/recovery-code');
  await inspect('recovery-code');
  await visit('/posts/create', 'create-post');
  await visit(`/posts/${fixture.post}`, 'post');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'Reply', exact: true }).last().click();
  await inspect('nested-reply', [320, 390]);
  await page.getByRole('button', { name: /^(Report|Flag)$/ }).click();
  await inspect('report-modal', [320, 390, 640]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await visit('/chat', 'member-directory');
  await page.locator('button[aria-controls="create-room-form"]').click();
  await inspect('create-room');
  await visit(`/chat/${fixture.room}`, 'chat');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('textbox', { name: 'Your message' }).fill('Mobile layout test message');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('.message-bubble').last()).toContainText('Mobile layout test message');
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Your username').fill('responsive_admin');
  await page.getByLabel('Password', { exact: true }).fill('ResponsiveTest!2026');
  await page.locator('.auth-card button.button').click();
  await page.waitForURL('**/admin/dashboard');
  for (const route of ['dashboard', 'users', 'posts', 'chat-rooms', 'stealth', 'reports', 'organizations', 'notices', 'audit-logs', 'security-events', 'system-health']) await visit(`/admin/${route}`, `admin-${route}`);
  await page.goto(`${base}/admin/users`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 320, height: 568 });
  const table = page.getByRole('region', { name: 'User management table' });
  await table.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  expect(await table.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await expect(page.locator('table tbody tr').first().locator('td').last()).toBeInViewport();
  await writeFile(join(artifacts, 'results.json'), JSON.stringify({ checks, widths, failures, errors }, null, 2));
  expect(errors, 'Browser runtime errors').toEqual([]);
  expect(failures, 'Responsive layout failures').toEqual([]);
  console.log(`PASS: ${checks} layout checks; drawer, registration, nested replies, report dialog, and mobile chat submission.`);
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    const exited = new Promise(done => server.once('exit', done));
    server.kill();
    await exited;
  }
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { await unlink(database + suffix); } catch (error) { if (error.code !== 'ENOENT') console.warn(error.message); }
  }
}
