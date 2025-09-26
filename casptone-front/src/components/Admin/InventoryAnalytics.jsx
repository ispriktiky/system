import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../Header";
import api from "../../api/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function InventoryAnalytics() {
  const [overview, setOverview] = useState(null);
  const [turnover, setTurnover] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, to, sc] = await Promise.all([
          api.get("/reports/inventory-overview"),
          api.get("/reports/turnover", { params: { window: windowDays } }),
          api.get("/reports/replenishment-schedule", { params: { window: windowDays } }),
        ]);
        setOverview(ov.data);
        setTurnover(to.data);
        setSchedule(sc.data);
      } catch (e) {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [windowDays]);

  const turnoverChartData = useMemo(() => {
    return (turnover || []).map(r => ({
      sku: r.sku,
      avg_daily_usage: r.avg_daily_usage,
      on_hand: r.on_hand,
    }));
  }, [turnover]);

  return (
    <AppLayout>
      <div className="container mt-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="mb-0">Predictive Analytics</h2>
          <div className="d-flex align-items-center gap-2">
            <label className="mb-0">Window (days)</label>
            <input type="number" className="form-control" style={{ width: 120 }} value={windowDays} onChange={e => setWindowDays(Number(e.target.value) || 30)} />
            <a className="btn btn-outline-secondary" href={`${api.defaults.baseURL}/reports/turnover.csv?window=${windowDays}`} target="_blank" rel="noreferrer">Download Turnover CSV</a>
            <a className="btn btn-outline-secondary" href={`${api.defaults.baseURL}/reports/replenishment-schedule.csv?window=${windowDays}`} target="_blank" rel="noreferrer">Download Schedule CSV</a>
          </div>
        </div>

        {loading && <div className="alert alert-info">Loading…</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {overview && (
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Total Items</div>
                  <div className="h4 mb-0">{overview.summary.total_items}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Raw Materials</div>
                  <div className="h4 mb-0">{overview.summary.raw_materials}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Finished Goods</div>
                  <div className="h4 mb-0">{overview.summary.finished_goods}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Low Stock</div>
                  <div className="h4 mb-0 text-danger">{overview.summary.low_stock}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Turnover chart */}
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">On Hand vs Avg Daily Usage</h5>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={turnoverChartData}>
                  <XAxis dataKey="sku" interval={0} hide={false} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="on_hand" fill="#3498db" name="On Hand" />
                  <Bar dataKey="avg_daily_usage" fill="#e74c3c" name="Avg Daily" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Replenishment schedule table */}
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Replenishment Schedule</h5>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Reorder On/Before</th>
                    <th className="text-end">Suggested Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(r => (
                    <tr key={r.sku}>
                      <td>{r.sku}</td>
                      <td>{r.name}</td>
                      <td>{r.reorder_on_or_before || '-'}</td>
                      <td className="text-end">{r.suggested_order_qty}</td>
                    </tr>
                  ))}
                  {schedule.length === 0 && (
                    <tr><td colSpan="4" className="text-muted text-center">No replenishment required.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}



