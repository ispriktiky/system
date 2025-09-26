import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import CartTable from "./CartTable";
import OrderTable from "../OrderTable";

const Cart = () => {
  const [view, setView] = useState("cart");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const provider = params.get('provider');
    const orderId = params.get('order_id');
    if (payment && provider && orderId) {
      // Stay on cart tab and show a small notice
      if (payment === 'success') {
        alert('Payment successful. We are confirming your order now.');
        // Ask backend to confirm in case webhook is delayed
        import('../../api/client').then(({ default: api }) => {
          api.post('/payments/confirm', { order_id: Number(orderId), provider })
            .catch(() => {})
            .finally(() => {
              // no-op; CartTable polls for the final state
            });
        });
      } else if (payment === 'failed') {
        alert('Payment failed or canceled. You can try again.');
      }
      // remove query params without reload
      const url = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, url);
    }
  }, []);

  return (
    <div className="enhanced-cart-page wood-app">
      <div className="cart-page-container">
        {/* Enhanced Header */}
        <div className="enhanced-header wood-card wood-animated">
          <div className="header-content">
            <div className="header-title">
              <h1 className="page-title">
                {view === "cart" ? (
                  <>
                    🛍️ Shopping Cart
                    <span className="title-accent">Your items await checkout</span>
                  </>
                ) : (
                  <>
                    📦 Order History
                    <span className="title-accent">Track your purchases</span>
                  </>
                )}
              </h1>
            </div>
            
            <div className="header-actions">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-back btn-wood"
                title="Continue Shopping"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Continue Shopping
              </button>
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="enhanced-tabs">
            <div className="tab-container">
              <button
                className={`enhanced-tab ${view === "cart" ? "active" : ""}`}
                onClick={() => setView("cart")}
              >
                <div className="tab-icon">🛍️</div>
                <span className="tab-text">Shopping Cart</span>
                {view === "cart" && <div className="tab-indicator"></div>}
              </button>
              
              <button
                className={`enhanced-tab ${view === "orders" ? "active" : ""}`}
                onClick={() => setView("orders")}
              >
                <div className="tab-icon">📦</div>
                <span className="tab-text">My Orders</span>
                {view === "orders" && <div className="tab-indicator"></div>}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Content Area */}
        <div className="enhanced-cart-body">
          {view === "cart" ? <CartTable /> : <OrderTable />}
        </div>
      </div>

      <style jsx>{`
        /* Enhanced Cart Page */
        .enhanced-cart-page {
          min-height: 100vh;
          padding: 20px;
          background: linear-gradient(135deg, var(--wood-bg), #f8f5f0);
        }

        .cart-page-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Enhanced Header */
        .enhanced-header {
          margin-bottom: 32px;
          padding: 32px;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--wood-panel), var(--wood-panel-dark));
          border: 2px solid rgba(139, 94, 52, 0.1);
          box-shadow: 0 8px 32px rgba(107, 66, 38, 0.12);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-title {
          flex: 1;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--accent-dark);
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          line-height: 1.2;
        }

        .title-accent {
          font-size: 1rem;
          font-weight: 400;
          color: #666;
          opacity: 0.8;
        }

        .header-actions {
          display: flex;
          align-items: center;
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .btn-back:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(139, 94, 52, 0.3);
        }

        /* Enhanced Tabs */
        .enhanced-tabs {
          border-top: 2px solid rgba(139, 94, 52, 0.1);
          padding-top: 24px;
        }

        .tab-container {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.7);
          padding: 6px;
          border-radius: 16px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(139, 94, 52, 0.1);
          width: fit-content;
        }

        .enhanced-tab {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: var(--accent);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          min-width: 160px;
          justify-content: center;
        }

        .enhanced-tab:hover:not(.active) {
          background: rgba(139, 94, 52, 0.05);
          color: var(--accent-dark);
        }

        .enhanced-tab.active {
          background: var(--accent);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 94, 52, 0.3);
          transform: translateY(-1px);
        }

        .tab-icon {
          font-size: 1.25rem;
        }

        .tab-text {
          font-size: 0.9rem;
          font-weight: 600;
        }

        .tab-indicator {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 2px;
          background: white;
          border-radius: 1px;
        }

        /* Enhanced Cart Body */
        .enhanced-cart-body {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 20px;
          padding: 32px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(139, 94, 52, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .enhanced-cart-page {
            padding: 16px;
          }

          .enhanced-header {
            padding: 24px;
            margin-bottom: 24px;
          }

          .header-content {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .btn-back {
            align-self: stretch;
            justify-content: center;
          }

          .tab-container {
            width: 100%;
          }

          .enhanced-tab {
            flex: 1;
            min-width: auto;
          }

          .enhanced-cart-body {
            padding: 20px;
          }
        }

        @media (max-width: 480px) {
          .tab-text {
            display: none;
          }

          .enhanced-tab {
            min-width: 60px;
          }
        }
      `}</style>
    </div>
  );
};

export default Cart;
