import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Helper functions
const parseDate = (s) => {
  // s expected 'YYYY-MM-DD'
  const [y, m, d] = (s || "").split("-").map(Number);
  return new Date(y || 0, (m || 1) - 1, d || 1);
};

const getYear = (d) => d.getFullYear();
const getMonth = (d) => d.getMonth() + 1; // 1..12

// ISO week number (1..53)
const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday in current week decides the year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
};

const aggregate = (rows, timeframe) => {
  const map = new Map();
  for (const r of rows) {
    const d = parseDate(r.date);
    if (isNaN(d)) continue;

    let key = "";
    let label = "";

    if (timeframe === "daily") {
      key = r.date;
      label = r.date;
    } else if (timeframe === "weekly") {
      const y = getYear(d);
      const w = getISOWeek(d);
      key = `${y}-W${w.toString().padStart(2, "0")}`;
      label = key;
    } else if (timeframe === "monthly") {
      const y = getYear(d);
      const m = getMonth(d);
      key = `${y}-${m.toString().padStart(2, "0")}`;
      label = key;
    } else if (timeframe === "yearly") {
      const y = getYear(d);
      key = `${y}`;
      label = key;
    }

    const prev = map.get(key) || { label, quantity: 0 };
    prev.quantity += Number(r.quantity || 0);
    map.set(key, prev);
  }
  // Sort by label in natural order
  return Array.from(map.values()).sort((a, b) => (a.label > b.label ? 1 : -1));
};

export default function DailyOutputChart({ data }) {
  const [timeframe, setTimeframe] = useState("daily"); // daily | weekly | monthly | yearly

  const title = useMemo(() => ({
    daily: "Daily Output",
    weekly: "Weekly Output",
    monthly: "Monthly Output",
    yearly: "Yearly Output",
  })[timeframe], [timeframe]);

  const series = useMemo(() => aggregate(data || [], timeframe), [data, timeframe]);

  return (
    <div className="p-4 wood-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="text-lg font-semibold mb-0" style={{color:'var(--accent-dark)'}}>{title}</h2>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" style={{width: 140}} value={timeframe} onChange={(e)=>setTimeframe(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,94,52,0.25)" />
          <XAxis dataKey="label" stroke="var(--ink)" />
          <YAxis stroke="var(--ink)" />
          <Tooltip />
          <Line type="monotone" dataKey="quantity" stroke="#8b5e34" strokeWidth={3} dot={{ r: 3, stroke:'#6f4518', strokeWidth:1 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
