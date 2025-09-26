import React, { useState, useEffect } from "react";
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
  const [bom, setBom] = useState([]); // [{inventory_item_id, sku, name, qty_per_unit}]
  const [materials, setMaterials] = useState([]); // inventory list for picker

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
    const intervalId = setInterval(() => {
      fetchProducts();
    }, 1000);
    return () => clearInterval(intervalId);
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

  const addBomRow = () => setBom((prev) => [...prev, { inventory_item_id: "", qty_per_unit: 1 }]);
  const removeBomRow = (idx) => setBom((prev) => prev.filter((_, i) => i !== idx));
  const updateBomRow = (idx, field, value) => setBom((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const saveBom = async () => {
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
                <table className="table table-sm">
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
                            onChange={(e) => updateBomRow(idx, 'inventory_item_id', Number(e.target.value))}
                          >
                            <option value="">Select material</option>
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>{m.sku} — {m.name}</option>
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
                  <button className="btn btn-outline-primary btn-sm" onClick={exportBom}>Export CSV</button>
                  <label className="btn btn-outline-success btn-sm mb-0">
                    Import CSV
                    <input type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && importBom(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowBomModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={saveBom}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsTable;