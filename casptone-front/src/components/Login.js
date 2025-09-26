import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./login.css";

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const response = await axios.post("http://127.0.0.1:8000/api/login", formData);
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("username", response.data.user.name);
            localStorage.setItem("role", response.data.user.role);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Login failed");
        }
    };

    return (
        <div className="wood-login-container">
            <div className="wood-login-card">
                <div className="wood-login-visual">
                    
                </div>
                <div className="wood-login-form-area">
                <h1 className="brand-name">Unick Furniture</h1>
               <p className="brand-tagline"></p>
                <br></br>

                    {error && <p className="error-message">{error}</p>}

                    <form onSubmit={handleSubmit} className="shoe-form">
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="wood-input"
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="shoe-input"
                        />
                        <button type="submit" className="wood-button">Log In</button>
                        <p className="signup-text">
                            Don't have an account? <Link to="/register" className="signup-link">Sign Up</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;