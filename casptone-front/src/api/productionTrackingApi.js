import client from './client';

const API_BASE = '/production-tracking';

export const productionTrackingApi = {
  // Dashboard
  getDashboard: () => client.get(`${API_BASE}/dashboard`),

  // Productions
  getProductions: (params = {}) => client.get(API_BASE, { params }),
  createProduction: (data) => client.post(API_BASE, data),
  getProduction: (id) => client.get(`${API_BASE}/${id}`),
  updateProduction: (id, data) => client.put(`${API_BASE}/${id}`, data),

  // Stage Management
  startStage: (productionId, data) => client.post(`${API_BASE}/${productionId}/start-stage`, data),
  completeStage: (productionId, data) => client.post(`${API_BASE}/${productionId}/complete-stage`, data),
  updateStageProgress: (productionId, data) => client.post(`${API_BASE}/${productionId}/update-progress`, data),

  // Reports
  generateReport: (data) => client.post(`${API_BASE}/reports/generate`, data),
};

export default productionTrackingApi;