import axios from "axios";

const DEFAULT_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const setApiBaseURL = (url) => {
  api.defaults.baseURL = url || DEFAULT_BASE_URL;
};

export const openCsv = (pathWithQuery) => {
  const url = `${api.defaults.baseURL}${pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`}`;
  window.open(url, "_blank");
};

export default api;