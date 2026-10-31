---
name: OpenAPI codegen gotchas
description: Mistakes in lib/api-spec/openapi.yaml silently produce wrong client URLs; how to catch them.
---
A mis-indented operation in openapi.yaml (e.g. `post:` nested under the wrong path) still generates valid code, but the client calls the wrong URL and typecheck passes.

**Why:** createInventorySupply was nested under `/inventory-movements/export`, so every real supply POST returned 404 until found by a browser test.

**How to apply:** after editing the spec, run `pnpm --filter @workspace/api-spec run codegen` and grep the generated `get<Operation>Url` for the expected path; test mutations in a browser, not only with typecheck.

Orval can generate identically named path-validator exports and query-parameter types for an operation with both path and query parameters.

**Why:** Both can become `<Operation>Params` in the shared barrel, making otherwise valid generated code fail typechecking.

**How to apply:** Resolve naming or validation generation for that operation only; do not disable validators globally. The server must still validate the path independently.
