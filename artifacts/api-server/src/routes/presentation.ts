import { Router, type IRouter } from "express";
import catalog from "../data/presentation-assets.json";
import { presentationStorage } from "../lib/presentationStorage";

const router: IRouter = Router();
const assets = catalog.assets as Record<string, {
  objectName: string; contentType: string; size: number; sha256: string; kind: string;
}>;

const publicAsset = (filename: string) => ({
  filename,
  url: `/api/presentation-assets/${encodeURIComponent(filename)}?v=${catalog.version}`,
  size: assets[filename].size,
  contentType: assets[filename].contentType,
  sha256: assets[filename].sha256,
});

router.get("/presentation-assets", (_req, res) => {
  res.set("Cache-Control", "no-store").json({
    title: catalog.title,
    slideCount: catalog.slideCount,
    version: catalog.version,
    files: { pptx: publicAsset("Tager-Presentation.pptx"), pdf: publicAsset("Tager-Presentation.pdf") },
    cover: publicAsset("cover.webp"),
    pages: Object.keys(assets).filter(name => assets[name].kind === "page").sort().map(publicAsset),
  });
});

router.get("/presentation-assets/:filename", async (req, res): Promise<void> => {
  const filename = String(req.params.filename);
  // Explicit allowlist: no arbitrary storage paths, user records or uploads.
  const asset = Object.hasOwn(assets, filename) ? assets[filename] : undefined;
  if (!asset) {
    res.status(404).json({ error: "الملف المطلوب غير موجود." });
    return;
  }
  if (req.query.v && req.query.v !== catalog.version) {
    res.status(409).json({ error: "تغيرت نسخة العرض. حدّثي الصفحة للحصول على النسخة الحالية." });
    return;
  }
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    res.status(503).json({ error: "خدمة تنزيل الملفات غير متاحة الآن. حاولي مرة أخرى لاحقًا." });
    return;
  }
  const etag = `"${asset.sha256}"`;
  if (!req.headers.range && req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }
  let start = 0, end = asset.size - 1;
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      res.set("Content-Range", `bytes */${asset.size}`).status(416).end();
      return;
    }
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), end) : end;
    } else {
      const suffix = Number(match[2]);
      start = Math.max(0, asset.size - suffix);
      if (!suffix) start = asset.size;
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= asset.size) {
      res.set("Content-Range", `bytes */${asset.size}`).status(416).end();
      return;
    }
  }
  try {
    const stream = presentationStorage.bucket(bucketId).file(asset.objectName).createReadStream({ start, end });
    stream.once("error", err => {
      req.log.error({ err, filename }, "Presentation asset read failed");
      if (!res.headersSent) {
        res.removeHeader("Content-Length");
        res.removeHeader("Content-Range");
        res.removeHeader("Content-Disposition");
        res.status(503).type("application/json").end(JSON.stringify({ error: "تعذر تحميل الملف. يُرجى إعادة المحاولة." }));
      } else res.destroy(err);
    });
    res.set({
      "Content-Type": asset.contentType,
      "Content-Length": String(end - start + 1),
      "Content-Disposition": `${asset.kind === "pptx" || asset.kind === "pdf" ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
      "ETag": etag,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    });
    if (range) res.status(206).set("Content-Range", `bytes ${start}-${end}/${asset.size}`);
    if (asset.kind === "page") res.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
    if (req.method === "HEAD") {
      stream.destroy();
      res.end();
      return;
    }
    res.once("close", () => stream.destroy());
    stream.pipe(res);
  } catch (err) {
    req.log.error({ err, filename }, "Presentation download unavailable");
    if (!res.headersSent) res.status(503).json({ error: "تعذر تحميل الملف. يُرجى إعادة المحاولة." });
  }
});

export default router;
