import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../Header";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "../../api/client";
import Pusher from "pusher-js";
import { exportProductionCsv } from "../../api/productionApi";

// Simple CSV export helper
const toCSV = (rows, columns) => {
  const header = columns.join(",");
  const lines = rows.map((r) => columns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","));
  return [header, ...lines].join("\n");
};

const STAGES = ["Design", "Preparation", "Cutting", "Assembly", "Finishing", "Quality Control"];
const COLORS = ["#f39c12", "#2980b9", "#8e44ad", "#27ae60"];

const authHeaders = () => ({});

export default function ProductionTrackingSystem() {
  const navigate = useNavigate();
  const [productions, setProductions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProductions();
    // Realtime updates via Pusher (simple refetch strategy)
    try {
      const pusherKey = process.env.REACT_APP_PUSHER_KEY || "";
      const cluster = process.env.REACT_APP_PUSHER_CLUSTER || "mt1";
      if (pusherKey) {
        const pusher = new Pusher(pusherKey, { cluster });
        const channel = pusher.subscribe("production-channel");
        const handler = () => fetchProductions();
        channel.bind("production-updated", handler);
        channel.bind("production-process-updated", handler);
        return () => {
          channel.unbind("production-updated", handler);
          channel.unbind("production-process-updated", handler);
          pusher.unsubscribe("production-channel");
          pusher.disconnect();
        };
      }
    } catch (e) {
      console.warn("Pusher setup failed", e);
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [productions, search, statusFilter, dateRange]);

  const fetchProductions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/productions`);
      const data = res.data || [];
      setProductions(data);
      setFiltered(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load production data. Please check your API endpoint and authentication.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let data = [...productions];
    
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((p) =>
        (p.product_name || "").toLowerCase().includes(q) || 
        (p.id && String(p.id).includes(q)) || 
        (p.date || "").includes(q)
      );
    }
    
    if (statusFilter !== "all") {
      data = data.filter((p) => p.status === statusFilter);
    }
    
    if (dateRange.start) {
      data = data.filter((p) => new Date(p.date) >= new Date(dateRange.start));
    }
    
    if (dateRange.end) {
      data = data.filter((p) => new Date(p.date) <= new Date(dateRange.end));
    }
    
    console.log('Filtered data:', data); // Debug log
    setFiltered(data);
  };

  // Derived data for charts
  const stageData = useMemo(() => 
    STAGES.map((stage) => ({
      name: stage,
      value: productions.filter((p) => p.stage === stage).length
    })), [productions]);

  const dailyOutput = useMemo(() => {
    const map = {};
    productions.forEach((p) => {
      const d = p.date ? new Date(p.date).toISOString().split("T")[0] : "unknown";
      map[d] = map[d] || { date: d, quantity: 0 };
      map[d].quantity += Number(p.quantity || 0);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [productions]);

  // Suggest resource allocation
  const computeSuggestions = () => {
    const capacities = { Design: 2, Preparation: 4, Cutting: 3, Assembly: 4, Finishing: 3, "Quality Control": 2 };
    const pending = productions.filter((p) => p.status === "In Progress" || p.status === "Pending");
    const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s]: pending.filter((p) => p.stage === s) }), {});

    const alloc = [];
    STAGES.forEach((s) => {
      const queue = byStage[s] || [];
      const cap = capacities[s] || 1;
      queue.sort((a, b) => new Date(a.date) - new Date(b.date) || b.quantity - a.quantity);
      const assign = queue.slice(0, cap).map((q) => ({ 
        id: q.id, 
        product_name: q.product_name, 
        quantity: q.quantity 
      }));
      alloc.push({ 
        stage: s, 
        capacity: cap, 
        assigned: assign, 
        queued: Math.max(0, queue.length - assign.length) 
      });
    });

    setSuggestions(alloc);
  };

  useEffect(() => {
    if (productions.length > 0) {
      computeSuggestions();
    }
  }, [productions]);

  const updateStage = async (id, newStage) => {
    try {
      const res = await api.patch(`/productions/${id}`, { stage: newStage });
      const updated = res.data;
      setProductions((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      console.error("Update stage error:", err);
      setError("Failed to update production stage");
    }
  };

  const bulkExportCSV = () => {
    const columns = ["id", "product_name", "date", "stage", "status", "quantity", "resources_used", "notes"];
    const rows = filtered.map((r) => ({
      ...r,
      resources_used: typeof r.resources_used === "object" ? JSON.stringify(r.resources_used) : r.resources_used,
    }));

    const csv = toCSV(rows, columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productions_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const bulkExportPDF = () => {
    // Simple text-based export for demonstration
    const content = filtered.map(r => 
      `ID: ${r.id}, Product: ${r.product_name}, Date: ${r.date}, Stage: ${r.stage}, Status: ${r.status}, Quantity: ${r.quantity}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productions_report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (

    <AppLayout>
    <div className="container-fluid py-4 wood-animated" role="region" aria-labelledby="prod-track-heading">
      {/* Back Button */}
      <button className="btn btn-outline-secondary mb-3" onClick={() => navigate("/dashboard")}>
        ← Back to Dashboard
      </button>



    <div className="container-fluid py-4" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 id="prod-track-heading" className="text-primary">Production Tracking — Unick Enterprises Inc.</h2>
        <div>
          <button className="btn btn-outline-primary me-2" onClick={bulkExportCSV}>
            Export CSV
          </button>
          <button className="btn btn-outline-secondary me-2" onClick={bulkExportPDF}>
            Export Report
          </button>
          <button className="btn btn-outline-success" onClick={() => exportProductionCsv({ start_date: dateRange.start, end_date: dateRange.end })}>
            Export CSV (Server)
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4 shadow-sm wood-card wood-parallax">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Search</label>
              <input 
                className="form-control" 
                placeholder="Search by product, ID, or date" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select 
                className="form-select" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Hold">Hold</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Start Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={dateRange.start} 
                onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))} 
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">End Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={dateRange.end} 
                onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))} 
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button 
                className="btn btn-outline-danger" 
                onClick={() => { 
                  setSearch(""); 
                  setStatusFilter("all"); 
                  setDateRange({ start: "", end: "" }); 
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Production Timeline */}
        <div className="col-lg-4 mb-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-primary">
                Production Timeline 
                <span className="badge bg-primary ms-2">{filtered.length}</span>
              </h5>
              
              {loading && (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <div className="mt-2 text-muted">Loading productions...</div>
                </div>
              )}
              
              {!loading && filtered.length === 0 && (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-inbox fa-3x mb-3"></i>
                  <div>No production items match the current filters.</div>
                  <button className="btn btn-outline-primary mt-2" onClick={fetchProductions}>
                    Refresh Data
                  </button>
                </div>
              )}
              
              <div className="timeline-list" style={{ maxHeight: 500, overflowY: "auto" }}>
                {filtered.map((prod) => (
                  <div key={prod.id} className="card mb-3 border-start border-4" 
                       style={{ borderColor: prod.status === "Completed" ? "#27ae60" : 
                                            prod.status === "Hold" ? "#f39c12" : "#2980b9" }}>
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="small text-muted mb-1">
                            {prod.date ? new Date(prod.date).toLocaleDateString() : "No date"}
                          </div>
                          <div className="h6 mb-1">{prod.product_name}</div>
                          <div className="small text-muted">
                            Qty: <strong>{prod.quantity || 0}</strong> • ID: <strong>{prod.id}</strong>
                          </div>
                        </div>
                        <div className="text-end">
                          <span className={`badge ${
                            prod.status === "Completed" ? "bg-success" : 
                            prod.status === "Hold" ? "bg-warning text-dark" : 
                            prod.status === "In Progress" ? "bg-info text-dark" : "bg-secondary"
                          }`}>
                            {prod.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <label className="form-label small">Stage:</label>
                        <select 
                          className="form-select form-select-sm" 
                          value={prod.stage} 
                          onChange={(e) => updateStage(prod.id, e.target.value)}
                        >
                          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {/* Gantt-like view for processes if available */}
                      {Array.isArray(prod.processes) && prod.processes.length > 0 && (
                        <div className="mt-3">
                          <div className="small fw-bold mb-1">Process Timeline</div>
                          <div className="d-flex flex-column gap-2">
                            {prod.processes.map((pr) => (
                              <div key={pr.id} className="d-flex align-items-center gap-2">
                                <div style={{ width: 130 }} className="small">{pr.process_name}</div>
                                <div className="progress flex-grow-1" style={{ height: 10 }}>
                                  <div
                                    className={`progress-bar ${pr.status === 'completed' ? 'bg-success' : pr.status === 'in_progress' ? 'bg-info' : 'bg-secondary'}`}
                                    style={{ width: pr.status === 'completed' ? '100%' : pr.status === 'in_progress' ? '50%' : '8%' }}
                                  ></div>
                                </div>
                                <span className="badge bg-light text-dark small text-capitalize">{pr.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 small text-muted">
                        <strong>Resources:</strong> {
                          Array.isArray(prod.resources_used)
                            ? (prod.resources_used.length
                                ? prod.resources_used.map((r) => `${r.inventory_item_id ?? r.sku ?? 'item'}: ${r.qty ?? r.quantity ?? 0}`).join(", ")
                                : "N/A")
                            : (typeof prod.resources_used === "object" && prod.resources_used
                                ? Object.entries(prod.resources_used || {}).map(([k,v]) => `${k}: ${v}`).join(", ")
                                : (prod.resources_used || "N/A"))
                        }
                      </div>
                      
                      {prod.notes && (
                        <div className="mt-1 small">
                          <strong>Notes:</strong> {prod.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="col-lg-8">
          {/* Charts */}
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-primary">Analytics Dashboard</h5>
              <div className="row">
                <div className="col-md-6">
                  <h6>Daily Output</h6>
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyOutput} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="quantity" fill="#3498db" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="col-md-6">
                  <h6>Production by Stage</h6>
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={stageData} 
                          dataKey="value" 
                          nameKey="name" 
                          outerRadius={80} 
                          label={({name, value}) => `${name}: ${value}`}
                        >
                          {stageData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <hr />

              {/* KPIs */}
              <div className="row">
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded">
                    <h6 className="text-primary">Summary</h6>
                    <div className="mb-2">
                      Total Orders: <span className="badge bg-primary">{productions.length}</span>
                    </div>
                    <div className="mb-2">
                      In Progress: <span className="badge bg-info">{productions.filter((p) => p.status === "In Progress").length}</span>
                    </div>
                    <div className="mb-2">
                      Completed: <span className="badge bg-success">{productions.filter((p) => p.status === "Completed").length}</span>
                    </div>
                    <div>
                      On Hold: <span className="badge bg-warning">{productions.filter((p) => p.status === "Hold").length}</span>
                    </div>
                  </div>
                </div>
                <div className="col-md-8">
                  <h6 className="text-primary">Stage Workload</h6>
                  <div>
                    {STAGES.map((stage) => {
                      const count = productions.filter((p) => p.stage === stage && p.status !== "Completed").length;
                      const maxCount = Math.max(...STAGES.map(s => productions.filter(p => p.stage === s && p.status !== "Completed").length), 1);
                      return (
                        <div key={stage} className="d-flex align-items-center mb-2">
                          <div style={{ width: 120 }} className="small fw-bold">{stage}</div>
                          <div className="progress flex-grow-1 me-3" style={{ height: 15 }}>
                            <div 
                              className="progress-bar" 
                              role="progressbar" 
                              style={{ width: `${(count / maxCount) * 100}%` }}
                            ></div>
                          </div>
                          <div className="small">
                            <span className="badge bg-secondary">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resource Allocation Suggestions */}
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title text-primary mb-0">Resource Allocation Suggestions</h5>
                <button 
                  className="btn btn-sm btn-outline-primary" 
                  onClick={computeSuggestions}
                >
                  Refresh Suggestions
                </button>
              </div>
              
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Stage</th>
                      <th>Capacity</th>
                      <th>Top Priority Assignments</th>
                      <th>Queued Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s) => (
                      <tr key={s.stage}>
                        <td>
                          <span className="fw-bold">{s.stage}</span>
                        </td>
                        <td>
                          <span className="badge bg-info">{s.capacity}</span>
                        </td>
                        <td>
                          {s.assigned.length === 0 ? (
                            <span className="text-muted fst-italic">No assignments</span>
                          ) : (
                            s.assigned.map(a => (
                              <div key={a.id} className="small">
                                <strong>{a.product_name}</strong> (Qty: {a.quantity})
                              </div>
                            ))
                          )}
                        </td>
                        <td>
                          <span className="badge bg-warning">{s.queued}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </AppLayout>
  );
}