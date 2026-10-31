// Read-only verification: only presentation assets, never store records.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const require = createRequire(new URL("../../tager-presentation/package.json", import.meta.url));
const { chromium } = require("playwright");
const root = "generated-artifacts/tager-downloads/verification";
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const manifest = await (await fetch(`${origin}/api/presentation-assets`)).json();
const browser = await chromium.launch({
  executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  for (const [name, options] of [
    ["desktop", { viewport: { width: 1440, height: 1000 } }],
    ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) {
    const context = await browser.newContext({ ...options, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/tager-downloads/`, { waitUntil: "networkidle" });
    await page.getByTestId("button-download-pptx").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name}: no horizontal overflow`);
    for (const kind of ["pptx", "pdf"]) {
      const pending = page.waitForEvent("download");
      await page.getByTestId(`button-download-${kind}`).click();
      const download = await pending;
      assert.equal(download.suggestedFilename(), `Tager-Presentation.${kind}`);
      assert.equal(await download.failure(), null);
      const output = `${root}/${name}-${kind}.${kind}`;
      await download.saveAs(output);
      const bytes = await fs.readFile(output);
      assert.equal(bytes.length, manifest.files[kind].size);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.files[kind].sha256);
      await page.getByTestId(`status-done-${kind}`).waitFor();
      console.log(`${name}: actual ${kind} download, filename, full length and SHA-256 PASS`);
    }
    if (name === "desktop") {
      // Wrong MIME must not save a misleading archive; retry must use the real file.
      await page.route("**/api/presentation-assets/Tager-Presentation.pdf?*", route =>
        route.fulfill({ status: 200, contentType: "application/zip", body: "not a pdf" }), { times: 1 });
      await page.getByTestId("button-download-pdf").click();
      await page.getByTestId("status-error-pdf").waitFor();
      const pending = page.waitForEvent("download");
      await page.getByTestId("button-retry-pdf").click();
      assert.equal((await pending).suggestedFilename(), "Tager-Presentation.pdf");
      console.log("Wrong MIME rejected; retry PASS");
    }
    await page.getByTestId("link-print").click();
    await page.getByTestId("button-print").waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-testid="button-print"]').disabled);
    assert.equal(await page.locator(".print-sheet img").count(), 12);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name}: print preview no overflow`);
    await page.evaluate(() => { window.print = () => { window.__printCalled = true; }; });
    await page.getByTestId("button-print").click();
    assert.equal(await page.evaluate(() => window.__printCalled), true);
    if (name === "desktop") {
      await page.pdf({ path: `${root}/print-layout.pdf`, preferCSSPageSize: true, printBackground: true });
      const info = execFileSync("pdfinfo", [`${root}/print-layout.pdf`], { encoding: "utf8" });
      assert.match(info, /^Pages:\s+12$/m, "Print must produce exactly 12 pages, without a blank page");
    }
    assert.deepEqual(errors, []);
    console.log(`${name}: 12 slides ready, print button and no runtime errors PASS`);
    await context.close();
  }
} finally {
  await browser.close();
}
