import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, User, Sun, Moon } from "lucide-react";
import { LayoutDashboard, Package, ClipboardList, Boxes, Factory, BarChart } from "lucide-react";



// 🧠 Get role and username from localStorage
const getUserData = () => ({
    username: localStorage.getItem("username") || "Guest",
    role: localStorage.getItem("role") || "User",
    token: localStorage.getItem("token") || null,
});

// 🔷 Header Component
const Header = ({ role, username }) => {
    const navigate = useNavigate();
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        if (role === "customer") {
            const fetchCartCount = async () => {
                try {
                    const token = localStorage.getItem("token");
                    if (!token) throw new Error("User not authenticated.");

                    const response = await axios.get("http://localhost:8000/api/cart", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const totalItems = response.data.reduce((sum, item) => sum + item.quantity, 0);
                    setCartCount(totalItems);
                } catch (err) {
                    console.error("Failed to fetch cart count:", err);
                }
            };

            fetchCartCount();
            const interval = setInterval(fetchCartCount, 1000);
            return () => clearInterval(interval);
        }
    }, [role]);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <header style={role === "customer" ? styles.headerTransparent : styles.headerWood}>
            <div style={styles.left} onClick={() => navigate("/dashboard")}>
                <h2 style={styles.logo}>UNICK FURNITURE</h2>
            </div>

            <div style={styles.right}>
                {role === "customer" && (
                    <>
                   
                    <button style={styles.iconBtn} onClick={() => navigate("/cart")}>
                        <ShoppingCart size={24} />
                        {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
                    </button>
                    </>
                )}
                <span style={styles.username}><User size={20} /> {username}</span>
                
                <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
            </div>
        </header>
    );
};

// 🔸 Sidebar for Admin
const Sidebar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div style={styles.sidebarModern}>
            <div>
                <div style={styles.brandModern} onClick={() => navigate("/dashboard")}>
                    <Factory size={30} style={{ marginRight: "10px" }} />
                    <span>Unick</span>
                </div>

                

                <nav style={styles.navModern}>
                    <button style={styles.navItem} onClick={() => navigate("/dashboard")}>
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button style={styles.navItem} onClick={() => navigate("/product")}>
                        <Package size={20} /> Products
                    </button>
                    <button style={styles.navItem} onClick={() => navigate("/orders")}>
                        <ClipboardList size={20} /> Orders
                    </button>
                    <button style={styles.navItem} onClick={() => navigate("/inventory")}>
                        <Boxes size={20} /> Inventory
                    </button>
                    <button style={styles.navItem} onClick={() => navigate("/productions")}>
                        <Factory size={20} /> Productions
                    </button>
                    <button style={styles.navItem} onClick={() => navigate("/reports")}>
                        <BarChart size={20} /> Reports
                    </button>
                </nav>
                
            </div>

            <button style={styles.logoutModern} onClick={handleLogout}>
                Logout
            </button>
        </div>
    );
};

// 📦 Final Layout
const AppLayout = ({ children }) => {
    const { role, username } = getUserData();

    return (
        <>
            {/* Show header only for customer */}
            {role === "customer" && <Header role={role} username={username} />}
            
            {/* Show sidebar only for employees/admins */}
            {role !== "customer" && <Sidebar />}

            {/* Adjust layout spacing depending on role */}
            <div
                style={{
                    marginLeft: role !== "customer" ? "250px" : 0,
                    marginTop: role === "customer" ? "60px" : 0,
                    padding: "1rem",
                }}
            >
                {children}
            </div>
            <footer className="footer-wood text-center" style={{ marginLeft: role !== "customer" ? "250px" : 0 }}>
                <div className="container">
                    <small>© {new Date().getFullYear()} Unick Furniture — Crafted with care</small>
                </div>
            </footer>
        </>
    );
};

const styles = {
    headerTransparent: {
        width: "100%",
        height: "60px",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 2rem",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 999,
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
    },
    headerWood: {
        width: "100%",
        height: "60px",
        background: "linear-gradient(180deg, #e8d9c6, #d9c7ae)",
        color: "#2f2a26",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 2rem",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 999,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    },
    left: {
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
    },
    right: {
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
    },
    logo: {
        fontSize: "1.5rem",
        fontWeight: "bold",
        color: "#333",
    },
    username: {
        display: "flex",
        alignItems: "center",
        fontSize: "1rem",
        gap: "0.5rem",
        color: "#333",
    },
    iconBtn: {
        background: "none",
        border: "none",
        position: "relative",
        cursor: "pointer",
    },
    cartBadge: {
        position: "absolute",
        top: "-6px",
        right: "-8px",
        backgroundColor: "#ff2e2e",
        color: "#fff",
        fontSize: "0.75rem",
        borderRadius: "50%",
        padding: "2px 6px",
    },
    logoutBtn: {
        background: "linear-gradient(180deg, #b5835a, #8b5e34)",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "6px 12px",
        cursor: "pointer",
        boxShadow: "0 8px 16px rgba(139,94,52,0.25)",
    },
    themeBtn: {
        background: "linear-gradient(180deg, #d9c7ae, #cbb79a)",
        color: "#2f2a26",
        border: "none",
        borderRadius: "8px",
        padding: "6px 12px",
        cursor: "pointer",
        boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
    },

    
    sidebarModern: {
        background: "linear-gradient(to bottom, #4b2e1d, #2e1a10)", // Deep wood tone
        color: "#f5e8d6",
        width: "260px",
        height: "100vh",
        padding: "2rem 1.5rem",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "4px 0 15px rgba(0, 0, 0, 0.5)",
        fontFamily: "'Georgia', serif",
    },
    
    brandModern: {
        display: "flex",
        alignItems: "center",
        fontSize: "1.6rem",
        fontWeight: "bold",
        color: "#fff3dc",
        marginBottom: "2rem",
        cursor: "pointer",
        gap: "0.5rem",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
        paddingBottom: "1rem",
    },
    
    userModern: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "1rem",
        color: "#ffeccc",
        marginBottom: "2rem",
        paddingLeft: "2px",
        borderBottom: "1px dashed rgba(255,255,255,0.15)",
        paddingBottom: "0.5rem",
    },
    
    navModern: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    
    navItem: {
        background: "rgba(255,255,255,0.05)",
        color: "#fff3dc",
        border: "none",
        padding: "0.85rem 1rem",
        borderRadius: "12px",
        fontSize: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontWeight: "600",
        letterSpacing: "0.4px",
        cursor: "pointer",
        transition: "all 0.3s ease",
    },
    navItemHover: {
        background: "rgba(255,255,255,0.15)",
        transform: "translateX(6px)",
    },
    
    logoutModern: {
        backgroundColor: "#a3472b",
        color: "#fff4e0",
        border: "none",
        padding: "0.85rem 1.2rem",
        fontSize: "1rem",
        fontWeight: "bold",
        borderRadius: "12px",
        cursor: "pointer",
        fontFamily: "'Georgia', serif",
        letterSpacing: "0.5px",
        transition: "all 0.3s ease",
    },
    
    
    


};


export default AppLayout;
