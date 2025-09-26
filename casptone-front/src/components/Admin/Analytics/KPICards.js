import React from "react";

export default function KPICards({ kpis }) {
  const items = [
    { label: "Total Orders", value: kpis.total },
    { label: "In Progress", value: kpis.in_progress },
    { label: "Completed", value: kpis.completed },
    { label: "On Hold", value: kpis.hold },
  ];

  return (
    <div className="row wood-animated">
      {items.map((item, i) => (
        <div className="col-md-3 mb-3" key={i}>
          <div className="p-4 wood-card text-center">
            <p className="text-muted" style={{ fontSize: 12 }}>{item.label}</p>
            <p className="fs-3 fw-bold">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
