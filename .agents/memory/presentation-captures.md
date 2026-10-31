---
name: Presentation export constraints
description: Genuine screenshots, separate downloads, and editable Arabic text compatibility.
---

Browser-helper screenshot evidence can be viewed but is not supplied as retrievable image files. Do not assume an evidence ID can be copied into a presentation.

**Why:** The capture helper exposed neither image bytes nor a download URL; presentation assets required a separate local capture. Downloaded Chromium binaries also conflicted with the container's shared libraries, while system-managed Chromium worked.

**How to apply:** Capture the genuine app read-only with a system-managed browser when downloadable images are needed. Use an isolated presentation account, preserve real store records, and label empty-state captures honestly rather than populating the store for visual effect.

## Download and Office compatibility

Presentation downloads must be separate, ready-to-use PPTX and PDF files, never a ZIP delivery bundle.

**Why:** The user repeatedly reported archive downloads instead of usable files. A native PPTX internally uses ZIP packaging, so its binary signature alone is not evidence of a broken export.

**How to apply:** Verify the saved extension, MIME, actual file content and opening in an Office-compatible viewer. Do not replace an editable PPTX with slide screenshots just to stabilize appearance.

Do not assume native editable text will fit when a viewer substitutes missing Arabic fonts, even when the PDF looks correct.

**Why:** LibreOffice opened the deck but used a wider fallback, cutting off long English text. It did not use the EOT-embedded font faces in this environment; normal text autofit prevented clipping.

**How to apply:** Check the exported deck with and without the authoring fonts, preserving Arabic direction and editability. OPC manifest default namespaces matter for this reader: prefixed rewrites caused it to reject an otherwise well-formed package.
