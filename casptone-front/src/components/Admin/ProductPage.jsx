import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminProductsTable from "./AdminProductsTable";
import axios from "axios";
import api from "../../api/client";
import { motion } from "framer-motion";
import { Modal, Button, Form } from "react-bootstrap"; //
import "bootstrap/dist/css/bootstrap.min.css";
import AppLayout from "../Header";

const ProductPage = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    image: "",
  });
  const [loading, setLoading] = useState(false);
  const [refreshProducts, setRefreshProducts] = useState(false);

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleAddProduct = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      await axios.post("http://localhost:8000/api/products", newProduct, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await api.post("/products", newProduct);
      setShowAddModal(false);
      setNewProduct({ name: "", description: "", price: "", stock: "", image: "" });
      setRefreshProducts((prev) => !prev);
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
    <div className="container-fluid py-4 wood-animated" role="region" aria-labelledby="prod-track-heading">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {/* Back Button */}
        <button className="btn btn-outline-secondary mb-3" onClick={() => navigate("/dashboard")}>
        ← Back to Dashboard
      </button>

        {/* Page Header */}
        <div className="text-center mb-4">
          <h2 id="prod-heading" className="fw-bold">Unick Furniture Products</h2>

        </div>

        {/* Content */}
        <div className="card shadow-lg border-0 wood-card">
  <div className="card-header d-flex justify-content-between align-items-center wood-header">
    <h5 className="mb-0 fw-bold">📦 Product List</h5>
    <button className="btn btn-light btn-sm btn-wood" onClick={() => setShowAddModal(true)}>
      + Add Product
    </button>
  </div>
  <div className="card-body">
    <AdminProductsTable key={refreshProducts} />
  </div>
</div>


        {/* ✅ Functional Modal with React-Bootstrap */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Add New Product</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Control type="text" name="name" value={newProduct.name} onChange={handleInputChange} placeholder="Product Name" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Control type="number" name="price" value={newProduct.price} onChange={handleInputChange} placeholder="Price" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Control as="textarea" rows={2} name="description" value={newProduct.description} onChange={handleInputChange} placeholder="Description" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Control type="number" name="stock" value={newProduct.stock} onChange={handleInputChange} placeholder="Stock" />
              </Form.Group>
              <Form.Group>
                <Form.Control type="text" name="image" value={newProduct.image} onChange={handleInputChange} placeholder="Image URL" />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddProduct} disabled={loading}>
              {loading ? "Adding..." : "Add Product"}
            </Button>
          </Modal.Footer>
        </Modal>
      </motion.div>
    </div>
    </AppLayout>
  );
};

export default ProductPage;
