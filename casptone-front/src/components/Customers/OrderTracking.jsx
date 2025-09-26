import React, { useEffect, useState } from "react";
import axios from "axios";
import Pusher from "pusher-js";

const API_URL = "http://localhost:8000/api";

const stages = ["Design","Preparation","Cutting","Assembly","Finishing","Quality Control"];

const OrderTracking = ({ orderId }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/orders/${orderId}/tracking`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (e) {
        setError("Failed to load tracking.");
      } finally {
        setLoading(false);
      }
    };
    if (orderId) run();
    // Subscribe to tracking updates for live refresh
    try {
      const pusherKey = process.env.REACT_APP_PUSHER_KEY || "";
      const cluster = process.env.REACT_APP_PUSHER_CLUSTER || "mt1";
      if (pusherKey) {
        const pusher = new Pusher(pusherKey, { cluster });
        const channel = pusher.subscribe("order-tracking-channel");
        const handler = () => run();
        channel.bind("order-tracking-updated", handler);
        return () => {
          channel.unbind("order-tracking-updated", handler);
          pusher.unsubscribe("order-tracking-channel");
          pusher.disconnect();
        };
      }
    } catch (e) {
      // ignore
    }
  }, [orderId]);

  if (!orderId) return <div className="alert alert-warning wood-card p-2">No order selected.</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-danger">{error}</div>;

  const { order, stage_summary = [], overall = {} } = data || {};

  return (
    <div className="card p-3 wood-card wood-animated">
      <h5>Order #{order?.id} Tracking</h5>
      <div className="mb-2 text-muted">ETA: {overall.eta} • Progress: {overall.progress_pct}%</div>
      <div className="progress mb-3" role="progressbar" aria-valuenow={overall.progress_pct} aria-valuemin="0" aria-valuemax="100">
        <div className="progress-bar" style={{ width: `${overall.progress_pct}%` }}>{overall.progress_pct}%</div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Stage</th>
              <th className="text-end">Pending</th>
              <th className="text-end">In Progress</th>
              <th className="text-end">Completed</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => {
              const row = stage_summary.find((r) => r.stage === s) || { pending: 0, in_progress: 0, completed: 0 };
              return (
                <tr key={s}>
                  <td>{s}</td>
                  <td className="text-end">{row.pending}</td>
                  <td className="text-end">{row.in_progress}</td>
                  <td className="text-end">{row.completed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderTracking;

