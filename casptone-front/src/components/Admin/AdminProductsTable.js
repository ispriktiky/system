import React, { useState, useEffect, useMemo } from "react";
import api from "../../api/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./admin_products.css";

const AdminProductsTable = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    image: "",
  });
  const [deleteId, setDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const [showBomModal, setShowBomModal] = useState(false);
  const [bom, setBom] = useState([]); // [{inventory_item_id, qty_per_unit}]
  const [materials, setMaterials] = useState([]); // inventory list for picker
  const [materialQuery, setMaterialQuery] = useState("");
  const [bomError, setBomError] = useState("");
  const [showBulkPicker, setShowBulkPicker] = useState(false);
  const [bulkQuery, setBulkQuery] = useState("");
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]); // number[]

  const token = localStorage.getItem("token");
  const headers = {}; // handled by api client

  const fetchProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openBomModal = async (product) => {
    setSelectedProduct(product);
    try {
      const [invRes, bomRes] = await Promise.all([
        api.get("/inventory"),
        api.get(`/products/${product.id}/materials`),
      ]);
      setMaterials(invRes.data || []);
      setBom(bomRes.data || []);
      setShowBomModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedIds = useMemo(() => new Set(bom.map(r => r.inventory_item_id).filter(Boolean)), [bom]);
  const filteredMaterials = useMemo(() => {
    const q = materialQuery.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(m =>
      String(m.sku || "").toLowerCase().includes(q) ||
      String(m.name || "").toLowerCase().includes(q)
    );
  }, [materials, materialQuery]);

  const addBomRow = () => setBom((prev) => [...prev, { inventory_item_id: "", qty_per_unit: 1 }]);
  const removeBomRow = (idx) => setBom((prev) => prev.filter((_, i) => i !== idx));
  const updateBomRow = (idx, field, value) => setBom((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const toggleBulkId = (id) => {
    setBulkSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bulkAdd = () => {
    setBom(prev => {
      const existing = new Set(prev.map(p => p.inventory_item_id).filter(Boolean));
      const toAdd = bulkSelectedIds.filter(id => !existing.has(id));
      const rows = toAdd.map(id => ({ inventory_item_id: id, qty_per_unit: 1 }));
      return [...prev, ...rows];
    });
    setShowBulkPicker(false);
    setBulkSelectedIds([]);
    setBulkQuery("");
  };

  const validateBom = () => {
    const ids = [];
    for (const row of bom) {
      if (!row.inventory_item_id) return "Please select a material for every row.";
      if (!row.qty_per_unit || row.qty_per_unit <= 0) return "Quantity must be at least 1 for all rows.";
      ids.push(row.inventory_item_id);
    }
    const hasDup = ids.some((id, idx) => ids.indexOf(id) !== idx);
    if (hasDup) return "Duplicate materials found. Each material can only appear once.";
    return "";
  };

  const saveBom = async () => {
    const err = validateBom();
    setBomError(err);
    if (err) return;
    try {
      await api.post(`/products/${selectedProduct.id}/materials`, { items: bom });
      setShowBomModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save BOM");
    }
  };

  const exportBom = async () => {
    try {
      const res = await api.get(`/products/${selectedProduct.id}/materials/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `product_${selectedProduct.id}_materials.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const importBom = async (file) => {
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post(`/products/${selectedProduct.id}/materials/import`, form);
      await openBomModal(selectedProduct);
    } catch (e) {
      console.error(e);
      alert('Import failed');
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData(product);
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/products/${deleteId}`);
      setProducts(products.filter((product) => product.id !== deleteId));
      setShowDeleteModal(false);
    } catch (error) {
      setDeleteError(
        "Error: This product is linked to an order and cannot be deleted."
      );
      console.error("Error deleting product:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    try {
      await api.put(
        `/products/${selectedProduct.id}`,
        formData
      );
      setShowEditModal(false);
      fetchProducts();
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  return (
    <div className="products-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Products</h5>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchProducts}>Refresh</button>
      </div>
      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div className="row g-4">
          {products.map((product) => (
            <div key={product.id} className="col-md-3 col-sm-6">
              <div className="card h-100 shadow-sm border-0">
                {product.image ? (
                <img
                  src={`http://localhost:8000/${product.image}`}
                  alt={product.name}
                  className="card-img-top"
                  style={{ height: "200px", objectFit: "cover" }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center bg-light"
                  style={{ height: "200px" }}
                >
                  No image
                </div>
              )}

                <div className="card-body d-flex flex-column">
                  <h5 className="card-title text-truncate">{product.name}</h5>
                  <p className="card-text small text-muted">
                    {product.description}
                  </p>
                  <p className="fw-bold mb-1">₱{product.price}</p>
                  <p className="text-secondary small">
                    Stock: {product.stock}
                  </p>
                  <div className="mt-auto d-flex justify-content-between gap-2">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => openBomModal(product)}
                    >
                      Manage BOM
                    </button>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleEdit(product)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteError && (
        <div className="alert alert-danger mt-2">{deleteError}</div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Product</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control mb-2"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Name"
                />
                <textarea
                  className="form-control mb-2"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description"
                />
                <input
                  type="number"
                  className="form-control mb-2"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Price"
                />
                <input
                  type="number"
                  className="form-control mb-2"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="Stock"
                />
                <input
                  type="text"
                  className="form-control mb-2"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="Image URL"
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this product?</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOM Modal */}
      {showBomModal && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Manage Bill of Materials — {selectedProduct?.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowBomModal(false)}></button>
              </div>
              <div className="modal-body">
                {/* Bulk picker toggle */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="input-group input-group-sm" style={{maxWidth: 320}}>
                    <span className="input-group-text">Search materials</span>
                    <input className="form-control" value={materialQuery} onChange={(e)=>setMaterialQuery(e.target.value)} placeholder="Search by SKU or name" />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary btn-sm" onClick={()=>setShowBulkPicker(s=>!s)}>
                      {showBulkPicker ? "Close Bulk Add" : "Bulk Add Materials"}
                    </button>
                    <button className="btn btn-outline-primary btn-sm" onClick={exportBom}>Export CSV</button>
                    <label className="btn btn-outline-success btn-sm mb-0">
                      Import CSV
                      <input type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && importBom(e.target.files[0])} />
                    </label>
                  </div>
                </div>

                {showBulkPicker && (
                  <div className="border rounded p-2 mb-3" style={{maxHeight: 260, overflowY: 'auto'}}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>Select multiple materials</strong>
                      <div className="input-group input-group-sm" style={{maxWidth: 280}}>
                        <span className="input-group-text">Filter</span>
                        <input className="form-control" value={bulkQuery} onChange={(e)=>setBulkQuery(e.target.value)} placeholder="Type to filter..." />
                      </div>
                    </div>
                    {materials
                      .filter(m => !selectedIds.has(m.id))
                      .filter(m => {
                        const q = bulkQuery.trim().toLowerCase();
                        if (!q) return true;
                        return String(m.sku||"").toLowerCase().includes(q) || String(m.name||"").toLowerCase().includes(q);
                      })
                      .map(m => (
                        <div key={m.id} className="form-check">
                          <input className="form-check-input" type="checkbox" id={`m-${m.id}`} checked={bulkSelectedIds.includes(m.id)} onChange={()=>toggleBulkId(m.id)} />
                          <label className="form-check-label" htmlFor={`m-${m.id}`}>
                            {m.sku} — {m.name}
                          </label>
                        </div>
                      ))}
                    <div className="mt-2 d-flex gap-2">
                      <button className="btn btn-sm btn-primary" onClick={bulkAdd} disabled={bulkSelectedIds.length===0}>Add Selected</button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={()=>{setShowBulkPicker(false); setBulkSelectedIds([]);}}>Cancel</button>
                    </div>
                  </div>
                )}

                {bomError && <div className="alert alert-warning py-2">{bomError}</div>}

                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th style={{ width: 140 }} className="text-end">Qty per Unit</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={row.inventory_item_id}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val && selectedIds.has(val) && val !== row.inventory_item_id) {
                                alert("This material is already selected.");
                                return;
                              }
                              updateBomRow(idx, 'inventory_item_id', val);
                            }}
                          >
                            <option value="">Select material</option>
                            {filteredMaterials.map((m) => (
                              <option key={m.id} value={m.id} disabled={selectedIds.has(m.id) && m.id !== row.inventory_item_id}>
                                {m.sku} — {m.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="text-end">
                          <input type="number" className="form-control form-control-sm text-end" min="1" value={row.qty_per_unit}
                            onChange={(e) => updateBomRow(idx, 'qty_per_unit', Number(e.target.value))} />
                        </td>
                        <td>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => removeBomRow(idx)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary btn-sm" onClick={addBomRow}>+ Add Material</button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowBomModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={saveBom} disabled={!!validateBom()}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsTable;