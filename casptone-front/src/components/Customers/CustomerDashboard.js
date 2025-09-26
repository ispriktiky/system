 import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Spinner } from "react-bootstrap";
import ProductCatalog from "./ProductCatalog";
import OrderTracking from "./OrderTracking";
import "./ProductCatalog";

const CustomerDashboard = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState("");

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token"); // ✅ Get token from storage
    
            const response = await axios.get("http://localhost:8000/api/products", {
                headers: {
                    Authorization: `Bearer ${token}`, // ✅ Send it with the request
                },
            });
    
            console.log("Fetched products:", response.data); // Optional: Debug
            setProducts(response.data);
        } catch (error) {
            console.error("Error fetching products:", error.response || error);
        } finally {
            setLoading(false);
        }
    };
    

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="container customer-dashboard mt-4 wood-animated">

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="text-center mb-4 p-3">
                    <h2 style={{ color: 'black' }} >UNICK FURNITURE</h2>
                    </div>

                <div className="d-flex justify-content-center mb-3">
                    <motion.input
                        type="text"
                        className="form-control w-50 shadow-sm"
                        placeholder="Search for a product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        whileFocus={{ scale: 1.05 }}
                    />
                </div>

                {/* <div className="d-flex justify-content-center mb-3 gap-2">
                    <input
                        type="number"
                        className="form-control w-25"
                        placeholder="Enter Order ID to track"
                        value={selectedOrderId}
                        onChange={(e)=> setSelectedOrderId(e.target.value)}
                    />
                </div> */}

                <div className="card p-4 shadow-lg wood-card">
                    {loading ? (
                        <div className="d-flex justify-content-center align-items-center">
                            <Spinner animation="border" variant="primary" />
                            <span className="ms-2">Loading products...</span>
                        </div>
                    ) : (
                        <ProductCatalog products={filteredProducts} />
                    )}
                </div>

                {selectedOrderId && (
                    <div className="mt-3">
                        <OrderTracking orderId={selectedOrderId} />
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default CustomerDashboard;