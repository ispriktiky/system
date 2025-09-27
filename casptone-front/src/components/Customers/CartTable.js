// src/components/CartTable.js
import React, { useState, useEffect } from "react";
import api from "../../api/client";

const CartTable = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [payLoading, setPayLoading] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [removingItems, setRemovingItems] = useState(new Set());
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetchCartItems();
  }, []);

  // Close checkout modal on Escape for better accessibility
  useEffect(() => {
    if (!showCheckout) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowCheckout(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showCheckout]);

  const fetchCartItems = async () => {
    try {
      const response = await api.get("/cart");
      const items = response.data || [];
      setCartItems(items);
      // Initialize quantities state
      const initialQuantities = {};
      items.forEach(item => {
        initialQuantities[item.id] = item.quantity;
      });
      setQuantities(initialQuantities);
    } catch (err) {
      setError("Failed to load cart items.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setUpdatingItems(prev => new Set(prev).add(itemId));
    
    // Optimistic update
    setQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
    
    try {
      await api.put(`/cart/${itemId}`, { quantity: newQuantity });
      await fetchCartItems(); // refresh cart to get accurate data
    } catch (err) {
      // Revert on error
      setQuantities(prev => ({
        ...prev,
        [itemId]: cartItems.find(item => item.id === itemId)?.quantity || 1
      }));
      alert("Failed to update item quantity.");
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this item from your cart?')) {
      return;
    }
    
    setRemovingItems(prev => new Set(prev).add(itemId));
    
    try {
      await api.delete(`/cart/${itemId}`);
      await fetchCartItems();
    } catch (err) {
      alert("Failed to remove item.");
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const createProductionsForOrder = async (orderResponse) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No token available for production creation");
      return { success: false, error: "Authentication required" };
    }

    try {
      const headers = undefined;
      const orderId = orderResponse?.data?.order?.id || orderResponse?.data?.id || null;
      const today = new Date().toISOString().slice(0, 10);
      const stageStart = "Design";
      
      // Create production payloads
      const payloads = cartItems.map((item) => ({
        product_name: item.product?.name || item.name || "Product",
        date: today,
        stage: stageStart,
        status: "Pending",
        quantity: item.quantity || 0,
        resources_used: {
          materials: item.product?.materials || "",
          workers: 0,
        },
        notes: orderId ? `From order #${orderId}` : "From checkout",
      }));

      // Create all production records
      const productionResults = await Promise.allSettled(
          payloads.map((payload) =>
            api.post("/productions", payload)
          )
      );

      // Check results
      const successful = productionResults.filter(result => result.status === 'fulfilled');
      const failed = productionResults.filter(result => result.status === 'rejected');

      if (failed.length > 0) {
        console.error("Some production records failed:", failed.map(f => f.reason));
        return { 
          success: successful.length > 0, 
          error: `${failed.length} of ${payloads.length} production records failed`,
          partial: true
        };
      }

      console.log(`Successfully created ${successful.length} production records`);
      return { success: true, count: successful.length };

    } catch (error) {
      console.error("Failed to create production records:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || "Unknown error" 
      };
    }
  };

  const handleCheckout = async () => {
    try {
      const response = await api.post("/checkout", {
        payment_method: paymentMethod,
        shipping_address: address,
        contact_phone: phone,
      });

      // Try to create production records
      const productionResult = await createProductionsForOrder(response);

      // Show appropriate success message
      if (productionResult.success) {
        if (productionResult.partial) {
          alert(`Order placed successfully!\n\nProduction tracking: ${productionResult.error}`);
        } else {
          alert(`Order placed successfully!\n\n✅ ${productionResult.count || cartItems.length} items added to production tracking.`);
        }
      } else {
        alert(`Order placed successfully!\n\n⚠️ Production tracking setup failed: ${productionResult.error}\n\nPlease contact support if production tracking is not visible.`);
      }

      // Clear cart on successful checkout
      setCartItems([]);
      setShowCheckout(false);

    } catch (err) {
      console.error("Checkout failed:", err);
      const msg = err.response?.data?.message || err.message || "Unknown error";
      const shortages = err.response?.status === 422 ? (err.response?.data?.shortages || []) : [];
      if (shortages.length > 0) {
        const lines = shortages.map(s => `• ${s.material_name} (SKU ${s.sku}): need ${s.required}, on hand ${s.on_hand}, deficit ${s.deficit} for ${s.product_name}`).join("\n");
        alert(`Cannot place order due to insufficient materials:\n\n${lines}\n\nPlease reduce quantity or wait for replenishment.`);
      } else {
        alert(`Checkout failed: ${msg}`);
      }
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (item.product?.price || item.price || 0) * item.quantity,
    0
  );

  // Helper function to get image URL
  const getImageUrl = (item) => {
    const imagePath = item.product?.image || item.image;
    if (!imagePath) return "https://via.placeholder.com/150";
    
    // If image path already includes the full URL, use it as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // Try both possible path formats to match your AdminProductsTable
    if (imagePath.startsWith('storage/')) {
      return `http://localhost:8000/${imagePath}`;
    } else {
      return `http://localhost:8000/storage/${imagePath}`;
    }
  };

  // Helper function to get product name
  const getProductName = (item) => {
    return item.product?.name || item.name || "Unknown Product";
  };

  // Helper function to get product price
  const getProductPrice = (item) => {
    return item.product?.price || item.price || 0;
  };

  if (loading) return <p>Loading cart...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className="modern-cart-container">
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your cart...</p>
        </div>
      )}
      
      {redirecting ? (
        <div className="redirecting-state">
          <div className="redirecting-spinner"></div>
          <h3>Redirecting to {paymentMethod.toUpperCase()} Payment...</h3>
          <p>Please wait while we redirect you to complete your payment securely.</p>
          <div className="redirect-tips">
            💡 <strong>Tip:</strong> If you're not redirected automatically, please check if your browser is blocking the redirect.
          </div>
        </div>
      ) : !loading && cartItems.length > 0 ? (
        <>
          {/* Cart Items Header */}
          <div className="cart-header">
            <h3>🛒 Items in your cart</h3>
            <span className="items-count">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</span>
          </div>

          {/* Enhanced Cart List */}
          <div className="enhanced-cart-list">
            {cartItems.map((item) => {
              const isRemoving = removingItems.has(item.id);
              const isUpdating = updatingItems.has(item.id);
              const currentQuantity = quantities[item.id] || item.quantity;
              
              return (
                <div 
                  key={item.id} 
                  className={`enhanced-cart-item wood-card wood-animated ${
                    isRemoving ? 'removing' : ''
                  } ${isUpdating ? 'updating' : ''}`}
                >
                  {/* Product Image */}
                  <div className="item-image-container">
                    <img
                      src={getImageUrl(item)}
                      alt={getProductName(item)}
                      className="item-image"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/150?text=No+Image";
                      }}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="item-details">
                    <h4 className="item-name">{getProductName(item)}</h4>
                    <div className="item-price">₱{getProductPrice(item).toLocaleString()}</div>
                    <div className="item-meta">
                      <span className="item-sku">SKU: {item.product?.sku || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="quantity-controls">
                    <label className="quantity-label">Quantity</label>
                    <div className="quantity-selector">
                      <button
                        className="qty-btn qty-decrease"
                        onClick={() => handleEditQuantity(item.id, Math.max(currentQuantity - 1, 1))}
                        disabled={isUpdating || currentQuantity <= 1}
                        title="Decrease quantity"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                          <rect x="2" y="5" width="8" height="2" rx="1"/>
                        </svg>
                      </button>
                      
                      <div className="qty-display">
                        {isUpdating ? (
                          <div className="qty-spinner"></div>
                        ) : (
                          <span className="qty-number">{currentQuantity}</span>
                        )}
                      </div>
                      
                      <button
                        className="qty-btn qty-increase"
                        onClick={() => handleEditQuantity(item.id, currentQuantity + 1)}
                        disabled={isUpdating}
                        title="Increase quantity"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                          <rect x="5" y="2" width="2" height="8" rx="1"/>
                          <rect x="2" y="5" width="8" height="2" rx="1"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="item-subtotal">
                    <div className="subtotal-label">Subtotal</div>
                    <div className="subtotal-amount">₱{(getProductPrice(item) * currentQuantity).toLocaleString()}</div>
                  </div>

                  {/* Actions */}
                  <div className="item-actions">
                    <button
                      className="btn-wishlist"
                      title="Save for later"
                      onClick={() => alert('Wishlist feature coming soon!')}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 14.5L6.6 13.3C3.4 10.36 1.5 8.28 1.5 5.75 1.5 3.92 2.92 2.5 4.75 2.5c1.04 0 2.04.52 2.71 1.36C8.14 3.02 9.14 2.5 10.25 2.5c1.83 0 3.25 1.42 3.25 3.25 0 2.53-1.9 4.61-5.1 7.55L8 14.5z"/>
                      </svg>
                    </button>
                    
                    <button
                      className="btn-remove-enhanced"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isRemoving}
                      title="Remove from cart"
                    >
                      {isRemoving ? (
                        <div className="remove-spinner"></div>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 5.885 16h4.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-4.23a1 1 0 0 1-.997-.92L5.042 3.5h7.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .471-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        !loading && (
          <div className="empty-cart-state">
            <div className="empty-cart-icon">🛍️</div>
            <h3>Your cart is empty</h3>
            <p>Add some products to get started!</p>
            <button className="btn-wood" onClick={() => window.location.href = '/dashboard'}>
              Continue Shopping
            </button>
          </div>
        )
      )}
      
      {/* Enhanced Order Summary */}
      {!loading && cartItems.length > 0 && (
        <div className="enhanced-summary wood-card wood-animated">
          <div className="summary-header">
            <h3>📋 Order Summary</h3>
          </div>
          
          <div className="summary-details">
            <div className="summary-row">
              <span>Total Items:</span>
              <strong>{totalItems} {totalItems === 1 ? 'item' : 'items'}</strong>
            </div>
            
            <div className="summary-row">
              <span>Subtotal:</span>
              <strong>₱{totalPrice.toLocaleString()}</strong>
            </div>
            
            <div className="summary-row total-row">
              <span>Total Amount:</span>
              <strong className="total-amount">₱{totalPrice.toLocaleString()}</strong>
            </div>
          </div>
          
          <button 
            className="btn-checkout-enhanced btn-wood" 
            onClick={() => setShowCheckout(true)}
          >
            <span>Proceed to Checkout</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Enhanced Checkout Modal */}
      {showCheckout && (
        <div className="enhanced-modal-backdrop" onClick={() => setShowCheckout(false)}>
          <div className="enhanced-modal-card wood-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="checkout-title">Checkout</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowCheckout(false)}
                disabled={payLoading}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              {/* Order Summary in Modal */}
              <div className="checkout-summary">
                <h4>Order Summary</h4>
                <div className="checkout-items">
                  {cartItems.slice(0, 3).map(item => (
                    <div key={item.id} className="checkout-item">
                      <img src={getImageUrl(item)} alt={getProductName(item)} className="checkout-item-img" />
                      <div className="checkout-item-details">
                        <span className="checkout-item-name">{getProductName(item)}</span>
                        <span className="checkout-item-qty">x{quantities[item.id] || item.quantity}</span>
                      </div>
                      <span className="checkout-item-price">₱{(getProductPrice(item) * (quantities[item.id] || item.quantity)).toLocaleString()}</span>
                    </div>
                  ))}
                  {cartItems.length > 3 && (
                    <div className="checkout-item-more">
                      +{cartItems.length - 3} more {cartItems.length - 3 === 1 ? 'item' : 'items'}
                    </div>
                  )}
                </div>
                <div className="checkout-total">
                  <strong>Total: ₱{totalPrice.toLocaleString()}</strong>
                </div>
              </div>
              
              {/* Shipping Form */}
              <div className="checkout-form">
                <div className="form-group">
                  <label className="form-label">Shipping Address *</label>
                  <textarea 
                    className="form-control" 
                    rows="2" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="House/Unit, Street, Barangay, City, Province, ZIP" 
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Contact Phone *</label>
                  <input 
                    className="form-control" 
                    type="tel"
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="09xx xxx xxxx" 
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <div className="payment-methods">
                    <label className={`payment-option ${paymentMethod==='cod'?'selected':''}`}>
                      <input 
                        type="radio" 
                        name="payment" 
                        value="cod" 
                        checked={paymentMethod==='cod'} 
                        onChange={() => setPaymentMethod('cod')} 
                      />
                      <div className="payment-content">
                        <div className="payment-icon">📦</div>
                        <div className="payment-text">
                          <span className="payment-title">Cash on Delivery</span>
                          <span className="payment-desc">Pay when your order arrives</span>
                        </div>
                      </div>
                    </label>
                    
                    <label className={`payment-option ${paymentMethod==='gcash'?'selected':''}`}>
                      <input 
                        type="radio" 
                        name="payment" 
                        value="gcash" 
                        checked={paymentMethod==='gcash'} 
                        onChange={() => setPaymentMethod('gcash')} 
                      />
                      <div className="payment-content">
                        <div className="payment-icon">📱</div>
                        <div className="payment-text">
                          <span className="payment-title">GCash</span>
                          <span className="payment-desc">Pay securely with GCash</span>
                        </div>
                      </div>
                    </label>
                    
                    <label className={`payment-option ${paymentMethod==='maya'?'selected':''}`}>
                      <input 
                        type="radio" 
                        name="payment" 
                        value="maya" 
                        checked={paymentMethod==='maya'} 
                        onChange={() => setPaymentMethod('maya')} 
                      />
                      <div className="payment-content">
                        <div className="payment-icon">💳</div>
                        <div className="payment-text">
                          <span className="payment-title">Maya</span>
                          <span className="payment-desc">Pay with Maya wallet</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                {paymentMethod !== 'cod' && (
                  <div className="payment-notice">
                    🔒 You will be redirected to the {paymentMethod.toUpperCase()} payment page after placing your order.
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary-enhanced" 
                onClick={() => setShowCheckout(false)} 
                disabled={payLoading}
              >
                Cancel
              </button>
              
              <button 
                className="btn-primary-enhanced btn-wood" 
                onClick={async () => {
                  if (!address.trim() || !phone.trim()) {
                    alert('Please fill in all required fields.');
                    return;
                  }
                  
                  try {
                    setPayLoading(true);
                    if (paymentMethod === 'cod') {
                      await handleCheckout();
                    } else {
                      // Create order
                      const orderRes = await api.post('/checkout', {
                        payment_method: paymentMethod,
                        shipping_address: address,
                        contact_phone: phone,
                      });
                      
                      const orderId = orderRes?.data?.order_id || orderRes?.data?.order?.id;
                      if (!orderId) {
                        throw new Error('Failed to create order');
                      }
                      
                      // Initialize payment
                      const paymentRes = await api.post('/payments/init', {
                        order_id: orderId,
                        provider: paymentMethod,
                      });
                      
                      const paymentUrl = paymentRes?.data?.checkout_url;
                      if (!paymentUrl) {
                        throw new Error('Failed to get payment URL');
                      }
                      
                      // Set redirecting state
                      setRedirecting(true);
                      
                      // Success message
                      alert(`Order #${orderId} created successfully! Redirecting to ${paymentMethod.toUpperCase()} payment...`);
                      
                      // Clear cart and close modal
                      setCartItems([]);
                      setShowCheckout(false);
                      
                      // Small delay to show the redirect message, then redirect
                      setTimeout(() => {
                        window.location.href = paymentUrl;
                      }, 1000);
                      
                      // Fallback: If redirect doesn't happen in 10 seconds, show manual link
                      setTimeout(() => {
                        if (redirecting) {
                          const userChoice = window.confirm(
                            `Redirect is taking longer than expected. Would you like to open the payment page manually?\n\nClick OK to open payment page, or Cancel to copy the payment link.`
                          );
                          if (userChoice) {
                            window.open(paymentUrl, '_blank');
                          } else {
                            navigator.clipboard.writeText(paymentUrl).then(() => {
                              alert(`Payment link copied to clipboard:\n\n${paymentUrl}`);
                            }).catch(() => {
                              prompt('Payment URL (copy this):', paymentUrl);
                            });
                          }
                          setRedirecting(false);
                        }
                      }, 10000);
                    }
                  } catch (e) {
                    const msg = e?.response?.data?.message || e.message || 'Payment failed';
                    alert(`Checkout failed: ${msg}`);
                  } finally {
                    setPayLoading(false);
                  }
                }} 
                disabled={payLoading || !address.trim() || !phone.trim()}
              >
                {payLoading ? (
                  <>
                    <div className="btn-spinner"></div>
                    {redirecting ? `Redirecting to ${paymentMethod.toUpperCase()}...` : 'Processing...'}
                  </>
                ) : (
                  <>
                    {paymentMethod === 'cod' ? 'Place Order' : `Pay with ${paymentMethod.toUpperCase()}`} • ₱{totalPrice.toLocaleString()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
  
      <style jsx>{`
        /* Modern Cart Container */
        .modern-cart-container {
          padding: 0;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Loading State */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--ink);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--wood-panel);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        /* Redirecting State */
        .redirecting-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 40px;
          text-align: center;
          color: var(--ink);
          background: linear-gradient(135deg, #e8f5e8, #f0f9ff);
          border-radius: 16px;
          border: 2px solid var(--accent);
          box-shadow: 0 8px 24px rgba(139, 94, 52, 0.1);
        }

        .redirecting-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(139, 94, 52, 0.2);
          border-top: 4px solid var(--accent);
          border-radius: 50%;
          animation: spin 1.2s linear infinite;
          margin-bottom: 24px;
        }

        .redirecting-state h3 {
          color: var(--accent-dark);
          margin: 0 0 16px 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .redirecting-state p {
          color: #666;
          font-size: 1.1rem;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }

        .redirect-tips {
          background: rgba(139, 94, 52, 0.05);
          border: 1px solid rgba(139, 94, 52, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          color: var(--accent-dark);
          font-size: 0.9rem;
          max-width: 400px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Cart Header */
        .cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding: 0 4px;
        }

        .cart-header h3 {
          color: var(--accent-dark);
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .items-count {
          background: var(--accent);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* Enhanced Cart List */
        .enhanced-cart-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }

        .enhanced-cart-item {
          display: grid;
          grid-template-columns: 120px 1fr auto auto auto;
          gap: 20px;
          padding: 20px;
          align-items: center;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .enhanced-cart-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(107, 66, 38, 0.15);
          border-color: var(--accent);
        }

        .enhanced-cart-item.updating {
          opacity: 0.7;
          pointer-events: none;
        }

        .enhanced-cart-item.removing {
          animation: slideOut 0.3s ease-in-out forwards;
        }

        @keyframes slideOut {
          to {
            transform: translateX(-100%);
            opacity: 0;
            height: 0;
            padding: 0;
            margin: 0;
          }
        }

        /* Product Image */
        .item-image-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #fafafa;
          border: 1px solid var(--wood-panel);
        }

        .item-image {
          width: 100%;
          height: 100px;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .enhanced-cart-item:hover .item-image {
          transform: scale(1.05);
        }

        /* Product Details */
        .item-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .item-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--ink);
          margin: 0;
          line-height: 1.3;
        }

        .item-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent);
        }

        .item-meta {
          display: flex;
          gap: 12px;
        }

        .item-sku {
          font-size: 0.875rem;
          color: #666;
          background: var(--wood-panel);
          padding: 2px 8px;
          border-radius: 4px;
        }

        /* Quantity Controls */
        .quantity-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .quantity-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quantity-selector {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid var(--wood-panel);
          border-radius: 12px;
          overflow: hidden;
        }

        .qty-btn {
          background: transparent;
          border: none;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--accent);
          transition: all 0.2s ease;
        }

        .qty-btn:hover:not(:disabled) {
          background: var(--accent);
          color: white;
        }

        .qty-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .qty-display {
          min-width: 48px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-left: 1px solid var(--wood-panel);
          border-right: 1px solid var(--wood-panel);
          background: #fafafa;
        }

        .qty-number {
          font-weight: 600;
          color: var(--ink);
        }

        .qty-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--wood-panel);
          border-top: 2px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Subtotal */
        .item-subtotal {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .subtotal-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .subtotal-amount {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--ink);
        }

        /* Item Actions */
        .item-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .btn-wishlist,
        .btn-remove-enhanced {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
        }

        .btn-wishlist {
          background: #f8f9fa;
          color: #6c757d;
          border: 2px solid #dee2e6;
        }

        .btn-wishlist:hover {
          background: #e9ecef;
          color: #495057;
          transform: scale(1.05);
        }

        .btn-remove-enhanced {
          background: #fff5f5;
          color: #dc3545;
          border: 2px solid #f5c6cb;
        }

        .btn-remove-enhanced:hover:not(:disabled) {
          background: #dc3545;
          color: white;
          transform: scale(1.05);
        }

        .btn-remove-enhanced:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .remove-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #f5c6cb;
          border-top: 2px solid #dc3545;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Empty Cart State */
        .empty-cart-state {
          text-align: center;
          padding: 80px 20px;
          color: var(--ink);
        }

        .empty-cart-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .empty-cart-state h3 {
          font-size: 1.5rem;
          margin-bottom: 12px;
          color: var(--accent-dark);
        }

        .empty-cart-state p {
          font-size: 1.1rem;
          color: #666;
          margin-bottom: 32px;
        }

        /* Enhanced Summary */
        .enhanced-summary {
          margin-top: 32px;
          padding: 24px;
          max-width: 400px;
          margin-left: auto;
          margin-right: 0;
        }

        .summary-header h3 {
          color: var(--accent-dark);
          margin: 0 0 20px 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .summary-details {
          margin-bottom: 24px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--wood-panel);
        }

        .summary-row:last-child {
          border-bottom: none;
        }

        .delivery-estimate {
          color: #28a745;
          font-weight: 500;
        }

        .summary-divider {
          border: none;
          border-top: 2px solid var(--accent);
          margin: 16px 0;
        }

        .total-row {
          font-size: 1.125rem;
          font-weight: 600;
          border-bottom: none !important;
        }

        .total-amount {
          color: var(--accent);
          font-size: 1.25rem;
        }

        .btn-checkout-enhanced {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 24px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
        }

        /* Enhanced Modal */
        .enhanced-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .enhanced-modal-card {
          width: 96vw;
          max-width: 900px;
          background: #ffffff;
          border: 1px solid #eee;
          border-radius: 14px;
          animation: slideUp 0.22s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          color: var(--accent-dark);
          font-size: 1.5rem;
        }

        .modal-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #f8f9fa;
          color: #6c757d;
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close-btn:hover:not(:disabled) {
          background: #e9ecef;
          transform: scale(1.1);
        }

        .modal-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (min-width: 768px) {
          .modal-content {
            grid-template-columns: 1.3fr 0.7fr;
            gap: 20px;
            margin-bottom: 16px;
          }
        }

        /* Checkout Summary */
        .checkout-summary {
          padding: 12px;
          background: #fafafa;
          border-radius: 10px;
          border: 1px solid var(--wood-panel);
        }

        .checkout-summary h4 {
          margin: 0 0 8px 0;
          color: var(--accent-dark);
          font-size: 1rem;
        }

        .checkout-items {
          margin-bottom: 8px;
        }

        .checkout-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
        }

        .checkout-item:last-child {
          border-bottom: none;
        }

        .checkout-item-img {
          width: 32px;
          height: 32px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }

        .checkout-item-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .checkout-item-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--ink);
        }

        .checkout-item-qty {
          font-size: 0.75rem;
          color: #666;
        }

        .checkout-item-price {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--accent);
        }

        .checkout-item-more {
          padding: 8px 0;
          font-size: 0.875rem;
          color: #666;
          font-style: italic;
          text-align: center;
        }

        .checkout-total {
          padding-top: 8px;
          border-top: 1px solid var(--wood-panel);
          text-align: right;
        }

        .checkout-total strong {
          color: var(--accent);
          font-size: 1rem;
        }

        /* Checkout Form */
        .checkout-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-weight: 600;
          color: var(--accent-dark);
          font-size: 0.875rem;
        }

        .form-control {
          padding: 10px 12px;
          border: 2px solid var(--wood-panel);
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s ease;
          background: white;
        }

        .form-control:focus {
          outline: none;
          border-color: var(--accent);
        }

        /* Payment Methods */
        .payment-methods {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 8px;
        }

        .payment-option {
          display: flex;
          align-items: center;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
          flex: 1 1 30%;
          min-width: 180px;
        }

        .payment-option:hover {
          border-color: var(--accent);
          background: #fafafa;
        }

        .payment-option.selected {
          border-color: var(--accent);
          background: rgba(139, 94, 52, 0.05);
          box-shadow: inset 0 0 0 2px var(--accent);
        }

        .payment-option input[type="radio"] {
          margin-right: 12px;
          accent-color: var(--accent);
        }

        .payment-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .payment-icon {
          font-size: 1.2rem;
        }

        .payment-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .payment-title {
          font-weight: 600;
          color: var(--ink);
          font-size: 0.95rem;
        }

        .payment-desc {
          font-size: 0.8rem;
          color: #666;
        }

        .payment-notice {
          padding: 6px 0;
          background: transparent;
          border: none;
          color: #666;
          font-size: 0.8rem;
        }

        /* Modal Footer */
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }

        .btn-secondary-enhanced {
          padding: 12px 24px;
          background: #f8f9fa;
          color: #6c757d;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .btn-secondary-enhanced:hover:not(:disabled) {
          background: #e9ecef;
          border-color: #adb5bd;
        }

        .btn-primary-enhanced {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .btn-primary-enhanced:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .enhanced-cart-item {
            grid-template-columns: 80px 1fr;
            grid-template-rows: auto auto auto;
            gap: 12px 16px;
            padding: 16px;
          }

          .item-image {
            height: 80px;
          }

          .item-details {
            grid-column: 1 / -1;
          }

          .quantity-controls,
          .item-subtotal,
          .item-actions {
            grid-column: 1 / -1;
            justify-self: stretch;
          }

          .item-actions {
            flex-direction: row;
            justify-content: center;
          }

          .modal-content {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .enhanced-summary {
            margin-left: 0;
            margin-right: 0;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CartTable;