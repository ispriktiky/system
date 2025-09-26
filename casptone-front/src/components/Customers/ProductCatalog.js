// src/components/ProductCatalog.js
import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";
import { motion } from "framer-motion";
import "./product_catalog.css";

const ProductCatalog = ({ products }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleShowModal = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError(null);
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("You need to be logged in to add to cart.");
        setLoading(false);
        return;
      }

      const response = await axios.post(
        "http://localhost:8000/api/cart",
        {
          product_id: selectedProduct.id,
          quantity: quantity,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Added to cart:", response.data);
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-catalog-container">
      {products.length === 0 ? (
        <p>No products available.</p>
      ) : (
        products.map((product) => (
          <motion.div
            key={product.id}
            className="product-card-modern"
            whileHover={{ scale: 1.02 }}
          >
            <div className="product-image-container">
              <img
                src={`http://localhost:8000/${product.image}`}
                alt={product.name}
                className="product-main-image"
                onClick={() => handleShowModal(product)}
              />
            </div>
            <div className="product-info">
              <h4 className="product-title">{product.name}</h4>
              <p className="product-price">₱{product.price}</p>
              <Button
                variant="dark"
                className="w-100"
                onClick={() => handleShowModal(product)}
              >
                View Details
              </Button>
            </div>
          </motion.div>
        ))
      )}

      {/* Modal for product details */}
      {selectedProduct && (
        <Modal
          show={showModal}
          onHide={handleCloseModal}
          centered
          dialogClassName="product-modal"
        >
          <Modal.Body className="modal-body-custom">
            <div className="modal-product-container">
              {/* Left side - Product Image */}
              <div className="modal-image-section">
                <img
                  src={`http://localhost:8000/${selectedProduct.image}`}
                  alt={selectedProduct.name}
                  className="modal-product-image"
                />
              </div>

              {/* Right side - Product Details */}
              <div className="modal-details-section">
                <h3 className="modal-product-title">{selectedProduct.name}</h3>
                <p className="modal-product-desc">{selectedProduct.description}</p>
                <h4 className="modal-product-price">₱{selectedProduct.price}</h4>
                <p className="modal-product-stock">
                  Stock: {selectedProduct.stock}
                </p>

                {error && <p className="text-danger">{error}</p>}

                <Form className="mt-3">
                  <Form.Group>
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </Form.Group>
                </Form>

                <div className="mt-4 d-flex gap-2">
                  <Button variant="outline-dark" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button
                    variant="dark"
                    onClick={handleAddToCart}
                    disabled={loading}
                  >
                    {loading ? "Adding..." : "Add to Cart"}
                  </Button>
                </div>
              </div>
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
};

export default ProductCatalog;
