// Read-only capture of the genuine application using an isolated presentation identity.
// Authentication material stays in memory and is never logged or saved.
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(new URL('../../api-server/package.json', import.meta.url));
const { createClerkClient } = require('@clerk/express');
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const users = await clerk.users.getUserList({ emailAddress: ['tager.slides.OEdx3C@example.com'] });
if (users.data.length !== 1) throw new Error('The isolated capture identity is unavailable.');
const ticket = await clerk.signInTokens.createSignInToken({ userId: users.data[0].id, expiresInSeconds: 180 });
const out = fileURLToPath(new URL('../public/screens/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim(), headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  await page.goto(`${origin}/sign-in`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.Clerk?.loaded);
  await page.evaluate(async token => {
    const signIn = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket: token });
    if (signIn.status !== 'complete') throw new Error('Capture sign-in did not complete.');
    await window.Clerk.setActive({ session: signIn.createdSessionId });
  }, ticket.token);
  for (const [route, name] of [['/app', 'overview'], ['/products', 'products'], ['/reports', 'reports'], ['/sales', 'sales']]) {
    await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.fonts.ready);
    if (await page.getByTestId('status-error').count()) throw new Error(`Capture page failed: ${route}`);
    await page.screenshot({ path: `${out}${name}.png` });
    console.log(`Captured genuine Tager UI: ${name}.png`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}mobile.png` });
  console.log('Captured genuine Tager UI: mobile.png');
} finally {
  await browser.close();
}
