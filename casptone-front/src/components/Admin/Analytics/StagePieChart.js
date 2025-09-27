import React from "react";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#8b5e34", "#6f4518", "#cbb79a", "#b5835a", "#a06b3b", "#d9c7ae"];
const RADIAN = Math.PI / 180;

const renderLabel = ({ cx, cy, midAngle, outerRadius, index, name }) => {
  const radius = outerRadius + 18; // position label outside
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const color = COLORS[index % COLORS.length];
  const anchor = x > cx ? "start" : "end";

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
      fill={color}
      style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3, strokeLinejoin: "round" }}
    >
      {name}
    </text>
  );
};

export default function StagePieChart({ data }) {
  return (
    <div className="p-4 wood-card">
      <h2 className="text-lg font-semibold mb-4" style={{color:'var(--accent-dark)'}}>Stage Breakdown</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} labelLine label={renderLabel}>
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
