import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../Header";
import Pusher from "pusher-js";

/**
 * Enhanced Inventory Management Page with Material CRUD Operations
 * Features:
 * - Add new materials (raw/finished goods)
 * - Edit existing materials
 * - Delete materials
 * - Real-time tracking and analytics
 * - Automated reports and forecasting
 */

const DEFAULTS = {
  forecastWindowDays: 14,
  planningHorizonDays: 30,
  pollIntervalMs: 15000,
};

// Utility functions
function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) =>
    v === null || v === undefined
      ? ""
      : String(v)
          .replaceAll("\"", '""')
          .replace(/[\n\r]/g, " ");
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => `"${escape(r[h])}"`).join(","));
  }
  return lines.join("\n");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, x) => {
    const k = keyFn(x);
    (acc[k] = acc[k] || []).push(x);
    return acc;
  }, {});
}

function parseUsageCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift();
  const cols = header.split(",").map((c) => c.trim().toLowerCase());
  const skuIdx = cols.indexOf("sku");
  const dateIdx = cols.indexOf("date");
  const qtyIdx = cols.indexOf("qtyused");
  if (skuIdx === -1 || dateIdx === -1 || qtyIdx === -1) {
    throw new Error("CSV must have headers: sku,date,qtyUsed");
  }
  return lines.map((ln) => {
    const parts = ln.split(",");
    return {
      sku: parts[skuIdx]?.trim(),
      date: parts[dateIdx]?.trim(),
      qtyUsed: Number(parts[qtyIdx]?.trim() || 0),
    };
  });
}

function movingAverageDaily(usageByDayArr, windowDays) {
  if (!usageByDayArr || usageByDayArr.length === 0) return 0;
  const lastN = usageByDayArr
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-windowDays);
  const total = lastN.reduce((s, r) => s + Number(r.qtyUsed || 0), 0);
  return total / Math.max(1, lastN.length);
}

function daysUntil(quantity, dailyUsage) {
  if (dailyUsage <= 0) return Infinity;
  return quantity / dailyUsage;
}

function projectOnHand(onHand, dailyUsage, days) {
  const arr = [];
  let bal = onHand;
  for (let d = 0; d <= days; d++) {
    arr.push({ day: d, projected: Math.max(0, Math.round(bal)) });
    bal -= dailyUsage;
  }
  return arr;
}

function statusFromLevels({ onHand, rop, maxLevel }) {
  if (onHand <= rop) return { label: "Reorder now", variant: "danger" };
  if (maxLevel && onHand > maxLevel) return { label: "Overstock", variant: "warning" };
  return { label: "OK", variant: "success" };
}

// Material Form Modal Component
const MaterialModal = ({ show, onHide, material, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "raw",
    location: "",
    quantity: 0,
    unit: "",
    cost: 0,
    supplier: "",
    lead_time_days: 0,
    safety_stock: 0,
    max_level: 0,
    reorder_point: 0,
    description: ""
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || "",
        sku: material.sku || "",
        category: material.category || "raw",
        location: material.location || "",
        quantity: (material.quantity_on_hand ?? material.quantity ?? 0),
        unit: material.unit || "",
        cost: (material.unit_cost ?? material.cost ?? 0),
        supplier: material.supplier || "",
        lead_time_days: material.lead_time_days || material.leadTimeDays || 0,
        safety_stock: material.safety_stock || material.safetyStock || 0,
        max_level: material.max_level || material.maxLevel || 0,
        reorder_point: material.reorder_point || material.reorderPoint || 0,
        description: material.description || ""
      });
    } else {
      setFormData({
        name: "",
        sku: "",
        category: "raw",
        location: "",
        quantity: 0,
        unit: "",
        cost: 0,
        supplier: "",
        lead_time_days: 0,
        safety_stock: 0,
        max_level: 0,
        reorder_point: 0,
        description: ""
      });
    }
    setErrors({});
  }, [material, show]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.sku.trim()) newErrors.sku = "SKU is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (formData.quantity < 0) newErrors.quantity = "Quantity cannot be negative";
    if (formData.cost < 0) newErrors.cost = "Cost cannot be negative";
    if (formData.lead_time_days < 0) newErrors.lead_time_days = "Lead time cannot be negative";
    if (formData.safety_stock < 0) newErrors.safety_stock = "Safety stock cannot be negative";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onHide();
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save material. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {material ? "Edit Material" : "Add New Material"}
            </h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">SKU *</label>
                <input
                  type="text"
                  className={`form-control ${errors.sku ? "is-invalid" : ""}`}
                  value={formData.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                />
                {errors.sku && <div className="invalid-feedback">{errors.sku}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                >
                  <option value="raw">Raw Material</option>
                  <option value="finished">Finished Good</option>
                  <option value="packaging">Packaging</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Location *</label>
                <input
                  type="text"
                  className={`form-control ${errors.location ? "is-invalid" : ""}`}
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="e.g., Warehouse A, Shelf B2"
                />
                {errors.location && <div className="invalid-feedback">{errors.location}</div>}
              </div>
              <div className="col-md-4">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className={`form-control ${errors.quantity ? "is-invalid" : ""}`}
                  value={formData.quantity}
                  onChange={(e) => handleChange("quantity", Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
                {errors.quantity && <div className="invalid-feedback">{errors.quantity}</div>}
              </div>
              <div className="col-md-4">
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  placeholder="kg, pcs, m, etc."
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Unit Cost</label>
                <input
                  type="number"
                  className={`form-control ${errors.cost ? "is-invalid" : ""}`}
                  value={formData.cost}
                  onChange={(e) => handleChange("cost", Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
                {errors.cost && <div className="invalid-feedback">{errors.cost}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">Supplier</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.supplier}
                  onChange={(e) => handleChange("supplier", e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Lead Time (days)</label>
                <input
                  type="number"
                  className={`form-control ${errors.lead_time_days ? "is-invalid" : ""}`}
                  value={formData.lead_time_days}
                  onChange={(e) => handleChange("lead_time_days", Number(e.target.value))}
                  min="0"
                />
                {errors.lead_time_days && <div className="invalid-feedback">{errors.lead_time_days}</div>}
              </div>
              <div className="col-md-4">
                <label className="form-label">Safety Stock</label>
                <input
                  type="number"
                  className={`form-control ${errors.safety_stock ? "is-invalid" : ""}`}
                  value={formData.safety_stock}
                  onChange={(e) => handleChange("safety_stock", Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
                {errors.safety_stock && <div className="invalid-feedback">{errors.safety_stock}</div>}
              </div>
              <div className="col-md-4">
                <label className="form-label">Max Level</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.max_level}
                  onChange={(e) => handleChange("max_level", Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Reorder Point</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.reorder_point}
                  onChange={(e) => handleChange("reorder_point", Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Additional notes about this material..."
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onHide}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : (material ? "Update" : "Add")} Material
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Inventory Component
const InventoryPage = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ q: "", type: "all" });
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  // API helper function
  const apiBase = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";
  const apiCall = async (path, options = {}) => {
    const token = localStorage.getItem("token");
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    };

    const url = path.startsWith('http') ? path : `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  // Fetch inventory and usage data
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    setError("");
    try {
      const [invRes, usageRes] = await Promise.allSettled([
        apiCall("/inventory"),
        apiCall("/usage?days=120"),
      ]);

      if (invRes.status === "fulfilled") setInventory(invRes.value || []);
      else throw invRes.reason;

      if (usageRes.status === "fulfilled") setUsage(usageRes.value || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch initial data. Check API settings.");
    } finally {
      setLoading(false);
    }
  };

  // Material CRUD operations
  const handleAddMaterial = () => {
    setEditingMaterial(null);
    setShowModal(true);
  };

  const handleEditMaterial = (material) => {
    setEditingMaterial(material);
    setShowModal(true);
  };

  const handleSaveMaterial = async (materialData) => {
    try {
      const payload = {
        name: materialData.name,
        sku: materialData.sku,
        category: materialData.category,
        location: materialData.location,
        unit: materialData.unit,
        unit_cost: Number(materialData.cost || 0),
        supplier: materialData.supplier,
        description: materialData.description,
        quantity_on_hand: Number(materialData.quantity || 0),
        lead_time_days: Number(materialData.lead_time_days || 0),
        safety_stock: Number(materialData.safety_stock || 0),
        max_level: Number(materialData.max_level || 0),
        reorder_point: Number(materialData.reorder_point || 0),
      };
      if (editingMaterial) {
        // Update existing material
        const response = await apiCall(
          `/inventory/${editingMaterial.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload)
          }
        );
        setInventory(prev => 
          prev.map(item => 
            item.id === editingMaterial.id ? response : item
          )
        );
      } else {
        // Add new material
        const response = await apiCall(
          "/inventory",
          {
            method: 'POST',
            body: JSON.stringify(payload)
          }
        );
        setInventory(prev => [...prev, response]);
      }
    } catch (error) {
      console.error("Save material error:", error);
      throw error;
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm("Are you sure you want to delete this material? This action cannot be undone.")) {
      return;
    }

    try {
      await apiCall(`/inventory/${materialId}`, {
        method: 'DELETE'
      });
      setInventory(prev => prev.filter(item => item.id !== materialId));
    } catch (error) {
      console.error("Delete material error:", error);
      alert("Failed to delete material. Please try again.");
    }
  };

  // Real-time tracking via Pusher with polling fallback
  useEffect(() => {
    const key = process.env.REACT_APP_PUSHER_KEY || "";
    const cluster = process.env.REACT_APP_PUSHER_CLUSTER || "mt1";
    if (key) {
      const p = new Pusher(key, { cluster });
      const ch = p.subscribe("inventory-channel");
      const handler = (data) => {
        const item = data.item || data;
        setInventory((prev) => prev.map((it) => (it.id === item.id ? { ...it, ...item } : it)));
      };
      ch.bind("inventory-updated", handler);
      wsRef.current = p;
      return () => {
        ch.unbind("inventory-updated", handler);
        p.unsubscribe("inventory-channel");
        p.disconnect();
      };
    } else {
      startPolling();
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      };
    }

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        try {
          const data = await apiCall("/inventory");
          setInventory(data || []);
        } catch (e) {
          console.warn("Polling failed", e);
        }
      }, DEFAULTS.pollIntervalMs);
    }
  }, []);

  // Derived analytics per item
  const enriched = useMemo(() => {
    const usageBySku = groupBy(usage || [], (u) => u.sku);
    const rows = (inventory || []).map((it) => {
      const onHand = Number(it.quantity ?? it.quantity_on_hand ?? 0);
      const lead = Number(it.lead_time_days ?? it.leadTimeDays ?? 0);
      const safety = Number(it.safety_stock ?? it.safetyStock ?? 0);
      const maxLevel = Number(it.max_level ?? it.maxLevel ?? 0) || undefined;
      const category = it.category || it.type || "unspecified";

      const history = (usageBySku[it.sku] || [])
        .map((u) => ({ date: u.date, qtyUsed: Number(u.qtyUsed || 0) }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const avgDaily = Number(
        it.avg_daily_usage ?? it.avgDailyUsage ?? movingAverageDaily(history, DEFAULTS.forecastWindowDays)
      );

      const ropBackend = it.reorder_point ?? it.reorderPoint;
      const ropCalc = Math.round(avgDaily * lead + safety);
      const rop = Number(ropBackend ?? ropCalc);

      const daysCover = daysUntil(onHand, avgDaily);
      const projected = projectOnHand(onHand, avgDaily, DEFAULTS.planningHorizonDays);

      const status = statusFromLevels({ onHand, rop, maxLevel });

      const target = maxLevel || rop + safety;
      const suggestedOrderQty = onHand <= rop ? Math.max(0, Math.round(target - onHand)) : 0;

      const daysToROP = Math.max(0, Math.ceil((onHand - rop) / Math.max(1e-6, avgDaily)));
      const etaReorderDate = isFinite(daysToROP)
        ? new Date(Date.now() + daysToROP * 86400000).toISOString().slice(0, 10)
        : "-";

      return {
        ...it,
        category,
        onHand,
        avgDaily: Number(avgDaily.toFixed(2)),
        leadTimeDays: lead,
        safetyStock: safety,
        rop,
        daysCover: isFinite(daysCover) ? Number(daysCover.toFixed(1)) : "∞",
        projected,
        status,
        suggestedOrderQty,
        etaReorderDate,
        maxLevel,
      };
    });

    return rows.sort((a, b) => {
      const pri = { danger: 0, warning: 1, success: 2 };
      return (pri[a.status.variant] ?? 2) - (pri[b.status.variant] ?? 2);
    });
  }, [inventory, usage]);

  // Filters
  const filtered = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    const type = filter.type;
    return enriched.filter((it) => {
      const matchesQ = !q || [it.name, it.sku, it.location, it.category].join(" ").toLowerCase().includes(q);
      const matchesType = type === "all" || 
        (type === "raw" && it.category.toLowerCase().includes("raw")) || 
        (type === "finished" && it.category.toLowerCase().includes("finished"));
      return matchesQ && matchesType;
    });
  }, [enriched, filter]);

  // Export functions
  const exportStockReport = () => {
    const rows = enriched.map((it) => ({
      SKU: it.sku,
      Item: it.name,
      Category: it.category,
      Location: it.location,
      OnHand: it.onHand,
      AvgDailyUsage: it.avgDaily,
      LeadTimeDays: it.leadTimeDays,
      SafetyStock: it.safetyStock,
      ROP: it.rop,
      DaysCover: it.daysCover,
      Status: it.status.label,
    }));
    download(`stock_levels_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  };

  const exportReplenishmentPlan = () => {
    const rows = enriched
      .filter((it) => it.suggestedOrderQty > 0)
      .map((it) => ({
        SKU: it.sku,
        Item: it.name,
        SuggestedOrderQty: it.suggestedOrderQty,
        ROP: it.rop,
        OnHand: it.onHand,
        LeadTimeDays: it.leadTimeDays,
        ETAReorderDate: it.etaReorderDate,
      }));
    download(`replenishment_plan_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  };

  const exportUsageTrends = () => {
    const rows = (usage || []).map((u) => ({ SKU: u.sku, Date: u.date, QtyUsed: u.qtyUsed }));
    download(`usage_trends_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  };

  // CSV usage upload
  const onUploadUsage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const rows = parseUsageCSV(text);
      setUsage((prev) => [...prev, ...rows]);
    } catch (err) {
      alert(err.message);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <AppLayout>
    <div className="container-fluid py-4" role="region" aria-labelledby="inv-heading">
      {/* Back Button */}
      <button className="btn btn-outline-secondary mb-3" onClick={() => navigate("/dashboard")}>
        ← Back to Dashboard
      </button>



    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 id="inv-heading" className="mb-0">Inventory Management</h2>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-success" onClick={handleAddMaterial}>
            + Add Material
          </button>
          <button className="btn btn-outline-secondary" onClick={exportStockReport}>
            Export Stock CSV
          </button>
          <button className="btn btn-outline-primary" onClick={exportReplenishmentPlan}>
            Export Replenishment CSV
          </button>
          <button className="btn btn-outline-dark" onClick={exportUsageTrends}>
            Export Usage CSV
          </button>
          <a className="btn btn-outline-success" href={(process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api") + "/reports/inventory-overview.csv"} target="_blank" rel="noreferrer">Overview CSV</a>
          <a className="btn btn-outline-success" href={(process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api") + "/reports/turnover.csv"} target="_blank" rel="noreferrer">Turnover CSV</a>
          <a className="btn btn-outline-success" href={(process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api") + "/reports/replenishment-schedule.csv"} target="_blank" rel="noreferrer">Schedule CSV</a>
          <label className="btn btn-outline-success mb-0">
            Upload Usage CSV
            <input ref={fileInputRef} type="file" accept=".csv" onChange={onUploadUsage} hidden />
          </label>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Search by name, SKU, location, category"
                value={filter.q}
                onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filter.type}
                onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="all">All Types</option>
                <option value="raw">Raw Materials</option>
                <option value="finished">Finished Goods</option>
              </select>
            </div>
            <div className="col-md-3 text-md-end text-start">
              <span className="text-muted small">Real-time: WebSocket with polling fallback</span>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="alert alert-info">Loading inventory…</div>
      )}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* KPI Summary */}
      {!loading && (
        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Total SKUs</div>
                <div className="h4 mb-0">{enriched.length}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Reorder Alerts</div>
                <div className="h4 mb-0 text-danger">{enriched.filter((x) => x.status.variant === "danger").length}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Overstock</div>
                <div className="h4 mb-0 text-warning">{enriched.filter((x) => x.status.variant === "warning").length}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Coverage (median days)</div>
                <div className="h4 mb-0">
                  {(() => {
                    const finite = enriched.map((x) => (typeof x.daysCover === "number" ? x.daysCover : 99999)).sort((a, b) => a - b);
                    if (finite.length === 0) return 0;
                    const mid = Math.floor(finite.length / 2);
                    const med = finite.length % 2 ? finite[mid] : (finite[mid - 1] + finite[mid]) / 2;
                    return isFinite(med) ? med.toFixed(1) : "∞";
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th>Location</th>
                <th className="text-end">On Hand</th>
                <th className="text-end">Avg Daily</th>
                <th className="text-end">Lead (d)</th>
                <th className="text-end">Safety</th>
                <th className="text-end">ROP</th>
                <th className="text-end">Days Cover</th>
                <th>Status</th>
                <th className="text-end">Suggest Order</th>
                <th>Reorder ETA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id || item.sku}>
                  <td className="fw-semibold">{item.sku}</td>
                  <td>{item.name}</td>
                  <td>{item.location}</td>
                  <td className="text-end">{item.onHand}</td>
                  <td className="text-end">{item.avgDaily}</td>
                  <td className="text-end">{item.leadTimeDays}</td>
                  <td className="text-end">{item.safetyStock}</td>
                  <td className="text-end">{item.rop}</td>
                  <td className="text-end">{item.daysCover}</td>
                  <td>
                    <span className={`badge text-bg-${item.status.variant}`}>{item.status.label}</span>
                  </td>
                  <td className="text-end">
                    {item.suggestedOrderQty > 0 ? (
                      <strong>{item.suggestedOrderQty}</strong>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{item.etaReorderDate}</td>
                  <td>
                    <div className="btn-group" role="group">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEditMaterial(item)}
                        title="Edit material"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteMaterial(item.id)}
                        title="Delete material"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={14} className="text-center text-muted py-4">
                    No items match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Material Management Modal */}
      <MaterialModal
        show={showModal}
        onHide={() => setShowModal(false)}
        material={editingMaterial}
        onSave={handleSaveMaterial}
      />

      {/* Mini projected stock cards for top 5 critical */}
      <div className="row g-3 mt-3">
        {enriched
          .filter((x) => x.status.variant !== "success")
          .slice(0, 5)
          .map((it) => (
            <div className="col-md-6" key={`proj-${it.sku}`}>
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div className="fw-semibold">{it.name} <span className="text-muted">({it.sku})</span></div>
                      <div className="small text-muted">Projected stock (next {DEFAULTS.planningHorizonDays} days)</div>
                    </div>
                    <span className={`badge text-bg-${it.status.variant}`}>{it.status.label}</span>
                  </div>
                  {/* simple sparkline using inline SVG */}
                  <div style={{ width: "100%", height: 80 }}>
                    <svg viewBox={`0 0 ${DEFAULTS.planningHorizonDays} 100`} preserveAspectRatio="none" width="100%" height="100%">
                      {(() => {
                        const max = Math.max(1, ...it.projected.map((p) => p.projected));
                        const pts = it.projected
                          .map((p) => `${p.day},${100 - Math.round((p.projected / max) * 100)}`)
                          .join(" ");
                        return (
                          <>
                            <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1" />
                            {/* ROP line */}
                            <line x1="0" y1={100 - Math.round((it.rop / max) * 100)} x2={DEFAULTS.planningHorizonDays} y2={100 - Math.round((it.rop / max) * 100)} stroke="red" strokeDasharray="2,2" />
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      
    </div>
     </div>
    </AppLayout>
  );
};

export default InventoryPage;