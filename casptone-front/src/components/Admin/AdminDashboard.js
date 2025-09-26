import React, { useEffect, useState } from "react";
import { getAnalytics } from "../../api/productionApi";
import { getAdminOverview } from "../../api/inventoryApi";
import KPICards from "./Analytics/KPICards";
import DailyOutputChart from "./Analytics/DailyOutputChart";
import StagePieChart from "./Analytics/StagePieChart";
import TopProductsChart from "./Analytics/TopProductsChart";
import TopUsersChart from "./Analytics/TopUsersChart";

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    status: "",
  });
  const [overview, setOverview] = useState(null);
  const [forecastSort, setForecastSort] = useState({ key: "days_to_depletion", dir: "asc" });
  const [forecastFilter, setForecastFilter] = useState({ text: "", onlyReorder: false });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAnalytics = async () => {
    const data = await getAnalytics(filters);
    setAnalytics(data);
  };

  const fetchOverview = async () => {
    const data = await getAdminOverview();
    setOverview(data);
  };

  useEffect(() => {
    fetchAnalytics();
    fetchOverview();
  }, []); // fetch on mount

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchAnalytics();
  };

  const sortedFilteredForecasts = () => {
    const rows = [...(overview?.forecasts || [])];
    const { text, onlyReorder } = forecastFilter;
    const filtered = rows.filter(r => {
      const matches = !text || (r.sku?.toLowerCase().includes(text.toLowerCase()) || r.name?.toLowerCase().includes(text.toLowerCase()));
      const reorder = r.suggested_order > 0;
      return matches && (!onlyReorder || reorder);
    });
    const { key, dir } = forecastSort;
    filtered.sort((a,b) => {
      const va = a[key] ?? 0; const vb = b[key] ?? 0;
      if (typeof va === "string") return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return dir === "asc" ? (va - vb) : (vb - va);
    });
    return filtered;
  };

  const sortBy = (key) => {
    setForecastSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  const badge = (row) => {
    if (row.max_level && row.on_hand > row.max_level) return <span className="badge bg-warning text-dark">Overstock</span>;
    if (row.suggested_order > 0) return <span className="badge bg-danger">Reorder now</span>;
    return <span className="badge bg-success">OK</span>;
  };

  return (
    <div className="container mt-4 wood-animated">
      <div className="text-center mb-4 wood-card p-3 wood-header">
        <h2 style={{ color: "black" }}>UNICK FURNITURE DASHBOARD</h2>
      </div>

      {/* 🔹 Filters */}
      <div className="row mb-4 wood-card p-3">
        <div className="col-md-3">
          <label>Start Date</label>
          <input
            type="date"
            name="start_date"
            value={filters.start_date}
            onChange={handleFilterChange}
            className="form-control"
          />
        </div>
        <div className="col-md-3">
          <label>End Date</label>
          <input
            type="date"
            name="end_date"
            value={filters.end_date}
            onChange={handleFilterChange}
            className="form-control"
          />
        </div>
        <div className="col-md-3">
          <label>Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="form-control"
          >
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Hold">Hold</option>
          </select>
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <button onClick={applyFilters} className="btn btn-primary w-100">
            Apply Filters
          </button>
        </div>
      </div>

      {/* 🔹 Analytics */}
      {!analytics ? (
        <p className="text-center mt-4">Loading analytics...</p>
      ) : (
        <>
          <KPICards kpis={analytics.kpis} />

          <div className="row mt-4">
            <div className="col-md-6">
              <DailyOutputChart data={analytics.daily_output} />
            </div>
            <div className="col-md-6">
              <StagePieChart data={analytics.stage_breakdown} />
            </div>
          </div>

          <div className="row mt-4">
            <div className="col-md-6">
              <TopProductsChart data={analytics.top_products} />
            </div>
            <div className="col-md-6">
              <TopUsersChart data={analytics.top_users} />
            </div>
          </div>
        </>
      )}

      
        
    
    </div>
  );
};

export default AdminDashboard;
