import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { CheckCircle } from "lucide-react";
import "./register.css";

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "customer" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        try {
            const response = await axios.post("http://127.0.0.1:8000/api/register", formData, {
                headers: {
                    "Content-Type": "application/json"
                }
            });
            localStorage.setItem("token", response.data.token);
            setSuccess("Registration successful!");
            setTimeout(() => navigate("/dashboard"), 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed");
        }
    };

    return (
        <div className="wood-register-container">
    <div className="wood-register-card">
        <div className="wood-register-visual">
            
        </div>
        <div className="wood-register-form-area">

        <h1 className="brand-name">Unick Enterprises</h1>
        <p className="brand-tagline">Crafting Quality Every Day</p>
        <div></div>
            

            {error && <p className="error-message">{error}</p>}
            {success && (
                <div className="alert alert-success d-flex align-items-center justify-content-center">
                    <CheckCircle className="me-2" size={20} />
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="wood-form">
                <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="wood-input"
                />
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
                    className="wood-input"
                />
                <input type="hidden" name="role" value="customer" />
                <button type="submit" className="wood-button">Register</button>
            </form>

            <p className="signup-text">
                Already have an account?{" "}
                <Link to="/login" className="signup-link">Login here</Link>
            </p>
        </div>
    </div>
</div>

    );
};

export default Register;