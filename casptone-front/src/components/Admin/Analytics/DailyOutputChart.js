import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DailyOutputChart({ data }) {
  return (
    <div className="p-4 wood-card">
      <h2 className="text-lg font-semibold mb-4" style={{color:'var(--accent-dark)'}}>Daily Output</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,94,52,0.25)" />
          <XAxis dataKey="date" stroke="var(--ink)" />
          <YAxis stroke="var(--ink)" />
          <Tooltip />
          <Line type="monotone" dataKey="quantity" stroke="#8b5e34" strokeWidth={3} dot={{ r: 3, stroke:'#6f4518', strokeWidth:1 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
