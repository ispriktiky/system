import React from "react";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#8b5e34", "#6f4518", "#cbb79a", "#b5835a", "#a06b3b", "#d9c7ae"];

export default function StagePieChart({ data }) {
  return (
    <div className="p-4 wood-card">
      <h2 className="text-lg font-semibold mb-4" style={{color:'var(--accent-dark)'}}>Stage Breakdown</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
