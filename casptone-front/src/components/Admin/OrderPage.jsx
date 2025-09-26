import React from "react";
import { useNavigate } from "react-router-dom";
import EnhancedOrdersManagement from "./EnhancedOrdersManagement";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import AppLayout from "../Header";

const OrdersPage = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="py-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* Back Button */}
          <div className="container-fluid">
            <button className="btn btn-outline-secondary mb-3" onClick={() => navigate("/dashboard")}>
              ← Back to Dashboard
            </button>
          </div>
          
          {/* Enhanced Orders Management */}
          <EnhancedOrdersManagement />
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default OrdersPage;
