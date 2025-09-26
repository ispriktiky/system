import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "./Header";
import AdminDashboard from "./Admin/AdminDashboard";
import CustomerDashboard from "./Customers/CustomerDashboard";

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({ username: "", role: "" });
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUsername = localStorage.getItem("username");
        const storedRole = localStorage.getItem("role");

        if (!token || !storedUsername || !storedRole) {
            navigate("/login");
            return;
        }

        setUser({ username: storedUsername, role: storedRole });

        if (storedRole === "customer") {
            setCartCount(3); 
        }
    }, [navigate]);

    return (
        <AppLayout>
            {user.role === "employee" ? (
                <AdminDashboard />
            ) : user.role === "customer" ? (
                <CustomerDashboard />
            ) : (
                <p>Loading content...</p>
            )}
        </AppLayout>
    );
};

export default Dashboard;