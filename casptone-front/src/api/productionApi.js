import api from "./client";

export const getAnalytics = async (filters = {}) => {
  const res = await api.get(`/productions/analytics`, { params: filters });
  return res.data;
};

export const exportProductionCsv = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const path = `/reports/production.csv${query ? `?${query}` : ''}`;
  const url = `${api.defaults.baseURL}${path}`;
  window.open(url, "_blank");
};