export const REPORT_TIME_ZONE = "Africa/Cairo";
const DAY = 86400000;
export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}
export function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}
export function cairoDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find(p => p.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export type AnalysisLine = {
  saleId: number; day: string; saleTotal: number;
  productId: number | null; productName: string | null;
  quantity: number | null; unitCost: number | null; lineTotal: number | null;
};
const cents = (amount: number) => Math.round(amount * 100);
function summarize(lines: AnalysisLine[]) {
  const sales = new Set<number>();
  let revenue = 0, cost = 0, missing = 0;
  for (const line of lines) {
    sales.add(line.saleId);
    revenue += cents(line.lineTotal ?? line.saleTotal);
    if (line.productId === null || line.quantity === null || line.unitCost === null ||
        !Number.isFinite(line.unitCost) || line.unitCost < 0) missing++;
    else cost += cents(line.unitCost) * line.quantity;
  }
  return {
    sales: revenue / 100, cost: missing ? null : cost / 100,
    profit: missing ? null : (revenue - cost) / 100,
    salesCount: sales.size, missing,
  };
}

/** Read-only report computation. Never reads current product costs or mutates history. */
export function analyzeSales(lines: AnalysisLine[], from: string, to: string, today: string) {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  const previousFrom = shiftDay(from, -days), previousTo = shiftDay(from, -1);
  const period = (start: string, end: string) => lines.filter(l => l.day >= start && l.day <= end);
  const selected = period(from, to), current = summarize(selected);
  const previous = summarize(period(previousFrom, previousTo));
  const currentDay = summarize(period(today, today));
  const month = summarize(period(`${today.slice(0, 7)}-01`, today));
  const byDay = new Map<string, AnalysisLine[]>();
  const byProduct = new Map<number, AnalysisLine[]>();
  for (const line of selected) {
    const daily = byDay.get(line.day) ?? [];
    daily.push(line); byDay.set(line.day, daily);
    if (line.productId !== null) {
      const products = byProduct.get(line.productId) ?? [];
      products.push(line); byProduct.set(line.productId, products);
    }
  }
  const daily = Array.from({ length: days }, (_, index) => {
    const date = shiftDay(from, index), totals = summarize(byDay.get(date) ?? []);
    return { date, sales: totals.sales, cost: totals.cost, profit: totals.profit, salesCount: totals.salesCount };
  });
  const products = [...byProduct].map(([productId, rows]) => {
    const totals = summarize(rows);
    return { productId, name: rows[rows.length - 1].productName ?? "منتج غير مسمى",
      quantity: rows.reduce((sum, r) => sum + (r.quantity ?? 0), 0),
      revenue: totals.sales, cost: totals.cost, profit: totals.profit };
  }).sort((a, b) => b.quantity - a.quantity || a.productId - b.productId);
  return {
    totalSales: current.sales, totalCost: current.cost, estimatedProfit: current.profit,
    missingCostLines: current.missing, salesCount: current.salesCount,
    todaySales: currentDay.sales, todayCount: currentDay.salesCount,
    monthSales: month.sales, monthCount: month.salesCount,
    previousSales: previous.sales, previousFrom, previousTo,
    salesChangePercent: previous.sales === 0 ? null :
      Math.round((current.sales - previous.sales) / previous.sales * 10000) / 100,
    timeZone: REPORT_TIME_ZONE, daily, products, bestSellers: products.slice(0, 5),
  };
}
