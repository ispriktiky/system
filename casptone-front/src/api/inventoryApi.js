import api, { openCsv } from "./client";

export async function getAdminOverview() {
  const res = await api.get(`/admin/overview`);
  return res.data;
}

export async function getForecast(params = {}) {
  const res = await api.get(`/forecast`, { params });
  return res.data;
}

export function downloadStockCsv() {
  openCsv(`/reports/stock.csv`);
}

export function downloadUsageCsv(days = 90) {
  openCsv(`/reports/usage.csv?days=${encodeURIComponent(days)}`);
}

export function downloadReplenishmentCsv() {
  openCsv(`/reports/replenishment.csv`);
}