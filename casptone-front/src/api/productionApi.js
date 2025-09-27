import api from "./client";

// Production CRUD operations
export const getProductions = async (filters = {}) => {
  const res = await api.get(`/productions`, { params: filters });
  return res.data;
};

export const getProduction = async (id) => {
  const res = await api.get(`/productions/${id}`);
  return res.data;
};

export const getProductionTimeline = async (id) => {
  const res = await api.get(`/productions/${id}/timeline`);
  return res.data;
};

export const updateProduction = async (id, data) => {
  const res = await api.patch(`/productions/${id}`, data);
  return res.data;
};

export const updateProductionPriority = async (id, priority, reason = null) => {
  const res = await api.patch(`/productions/${id}/priority`, { priority, reason });
  return res.data;
};

export const updateProductionProcess = async (productionId, processId, data) => {
  const res = await api.patch(`/productions/${productionId}/processes/${processId}`, data);
  return res.data;
};

export const startProduction = async (data) => {
  const res = await api.post(`/productions/start`, data);
  return res.data;
};

export const createBatchProduction = async (data) => {
  const res = await api.post(`/productions/batch`, data);
  return res.data;
};

// Dashboard and analytics
export const getDashboardData = async (filters = {}) => {
  const res = await api.get(`/productions/dashboard`, { params: filters });
  return res.data;
};

export const getAnalytics = async (filters = {}) => {
  const res = await api.get(`/productions/analytics`, { params: filters });
  return res.data;
};

export const getPredictiveAnalytics = async (productId, days = 7) => {
  const res = await api.get(`/productions/predictive`, { params: { product_id: productId, days } });
  return res.data;
};

export const getDailySummary = async (date = null) => {
  const res = await api.get(`/productions/daily-summary`, { params: date ? { date } : {} });
  return res.data;
};

// Reports
export const getEfficiencyReport = async (startDate, endDate) => {
  const res = await api.get(`/productions/efficiency-report`, {
    params: { start_date: startDate, end_date: endDate }
  });
  return res.data;
};

export const getCapacityUtilization = async (days = 30) => {
  const res = await api.get(`/productions/capacity-utilization`, { params: { days } });
  return res.data;
};

export const getResourceAllocation = async () => {
  const res = await api.get(`/productions/resource-allocation`);
  return res.data;
};

export const getPerformanceMetrics = async (period = 'month') => {
  const res = await api.get(`/productions/performance-metrics`, { params: { period } });
  return res.data;
};

// Export functions
export const exportProductionCsv = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const path = `/reports/production.csv${query ? `?${query}` : ''}`;
  const url = `${api.defaults.baseURL}${path}`;
  window.open(url, "_blank");
};
