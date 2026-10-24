---
name: Real store data and costing
description: User's non-destructive scope and the costing convention for Tager
---

The user requires real persisted store data only: no automatic demo products/sales, no replacing existing data, no new project or unnecessary rewrites. Preserve the current design. Existing legacy demo records must not be deleted or reassigned to users.

**Why:** The user explicitly requested these constraints and asked to prioritize essential improvements with minimal credit consumption and no additional paid services.

**How to apply:** Require authenticated owner-scoped operations, keep schema changes additive, and never re-enable the anonymous demo header.

Use the quantity-weighted average purchase cost for new receipts, rounded to piastres. Preserve the cost captured on historical sale lines; profit is estimated gross profit before operating expenses and taxes.

**Why:** New purchase prices should not retroactively change historical profits, and existing stock must participate in the new average.

**How to apply:** Receipt, stock balance, average cost and movement must commit atomically. Do not fabricate historical movements for untracked stock; record a clearly labeled current opening balance instead.
