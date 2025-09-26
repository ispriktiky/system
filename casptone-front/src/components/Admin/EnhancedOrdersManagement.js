import React, { useState, useEffect } from "react";
import api from "../../api/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const EnhancedOrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    paymentMethod: "",
    paymentStatus: "",
    searchTerm: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);

  // Status options with colors
  const statusOptions = [
    { value: "pending", label: "Pending", color: "warning", icon: "⏳" },
    { value: "ready_for_delivery", label: "Ready for Delivery", color: "info", icon: "📦" },
    { value: "delivered", label: "Delivered", color: "success", icon: "✅" },
    { value: "completed", label: "Completed", color: "success", icon: "🎉" },
    { value: "cancelled", label: "Cancelled", color: "danger", icon: "❌" }
  ];

  const paymentStatusOptions = [
    { value: "unpaid", label: "Unpaid", color: "danger" },
    { value: "cod_pending", label: "COD Pending", color: "warning" },
    { value: "paid", label: "Paid", color: "success" },
    { value: "failed", label: "Failed", color: "danger" },
    { value: "refunded", label: "Refunded", color: "secondary" }
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get("/orders");
      setOrders(response.data);
      setFilteredOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setOrderItems(response.data.items || []);
    } catch (error) {
      console.error("Error fetching order items:", error);
      toast.error("Failed to load order details");
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Date filter
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate).setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.checkout_date).getTime();
        return orderDate >= start && orderDate <= end;
      });
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Payment method filter
    if (filters.paymentMethod) {
      filtered = filtered.filter(order => order.payment_method === filters.paymentMethod);
    }

    // Payment status filter
    if (filters.paymentStatus) {
      filtered = filtered.filter(order => order.payment_status === filters.paymentStatus);
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toString().includes(searchLower) ||
        order.user?.name?.toLowerCase().includes(searchLower) ||
        order.user?.email?.toLowerCase().includes(searchLower) ||
        order.shipping_address?.toLowerCase().includes(searchLower) ||
        order.contact_phone?.includes(filters.searchTerm)
      );
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      await fetchOrders();
      setShowStatusModal(false);
      toast.success(`Order #${orderId} status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    fetchOrderItems(order.id);
    setShowDetailsModal(true);
  };

  const handleStatusChange = (order) => {
    setSelectedOrder(order);
    setShowStatusModal(true);
  };

  const getStatusBadge = (status) => {
    const statusInfo = statusOptions.find(opt => opt.value === status) || statusOptions[0];
    return (
      <span className={`badge bg-${statusInfo.color} me-2`}>
        {statusInfo.icon} {statusInfo.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusInfo = paymentStatusOptions.find(opt => opt.value === status) || paymentStatusOptions[0];
    return (
      <span className={`badge bg-${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getPaymentMethodBadge = (method) => {
    const methodInfo = {
      cod: { label: "Cash on Delivery", color: "secondary", icon: "💵" },
      maya: { label: "Maya", color: "primary", icon: "💳" },
      gcash: { label: "GCash", color: "info", icon: "💳" }
    };
    const info = methodInfo[method] || { label: method?.toUpperCase(), color: "dark", icon: "💳" };
    return (
      <span className={`badge bg-${info.color} me-2`}>
        {info.icon} {info.label}
      </span>
    );
  };

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body bg-gradient" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                <div className="row align-items-center text-white">
                  <div className="col-md-8">
                   <h2 className="card-title mb-1 fw-bold text-dark">
                    🛒 Order Dashboard
                  </h2>

                    <p className="card-text mb-0 opacity-75">
                      Manage customer orders, track deliveries, and handle payments
                    </p>
                  </div>
                  <div className="col-md-4 text-end">
                    <div className="d-flex flex-column align-items-end">
                      <h4 className="mb-1">{filteredOrders.length}</h4>
                      <small className="opacity-75">Total Orders</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Filters */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="minimalist-filters">
              <div className="search-section">
                <div className="search-box">
                  <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="M21 21l-4.35-4.35"></path>
                  </svg>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search orders, customers, or phone numbers..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  />
                  {filters.searchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => setFilters({...filters, searchTerm: ''})}
                    >
                      ×
                    </button>
                  )}
                  {filteredOrders.length !== orders.length && (
                    <div className="results-count">
                      {filteredOrders.length} of {orders.length}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="filters-section">
                <select
                  className="minimal-select"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">All Status</option>
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.icon} {status.label}
                    </option>
                  ))}
                </select>

                <select
                  className="minimal-select"
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                >
                  <option value="">All Payment</option>
                  <option value="cod">💵 COD</option>
                  <option value="maya">💳 Maya</option>
                  <option value="gcash">💳 GCash</option>
                </select>

                <select
                  className="minimal-select"
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                >
                  <option value="">Payment Status</option>
                  {paymentStatusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>

                <div className="date-range">
                  <input
                    type="date"
                    className="minimal-date"
                    placeholder="From"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                  <span className="date-separator">–</span>
                  <input
                    type="date"
                    className="minimal-date"
                    placeholder="To"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="actions-section">
                {(() => {
                  const activeFilters = [
                    filters.searchTerm,
                    filters.status,
                    filters.paymentMethod,
                    filters.paymentStatus,
                    filters.startDate,
                    filters.endDate
                  ].filter(Boolean).length;
                  
                  return activeFilters > 0 && (
                    <div className="filter-count">
                      <span className="count-badge">{activeFilters}</span>
                      <button
                        className="clear-btn"
                        onClick={() => setFilters({
                          startDate: "",
                          endDate: "",
                          status: "",
                          paymentMethod: "",
                          paymentStatus: "",
                          searchTerm: ""
                        })}
                        title={`Clear ${activeFilters} active filter${activeFilters > 1 ? 's' : ''}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  );
                })()}
                <button className="refresh-btn" onClick={fetchOrders} title="Refresh orders">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-light border-0 d-flex justify-content-between align-items-center">
                <span className="text-muted">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <div className="card-body p-0">
                {currentOrders.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="display-1 text-muted">📦</div>
                    <h4 className="text-muted mt-3">No orders found</h4>
                    <p className="text-muted">Try adjusting your filters or check back later.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th scope="col" className="fw-semibold">Order ID</th>
                          <th scope="col" className="fw-semibold">Customer Info</th>
                          <th scope="col" className="fw-semibold">Contact & Address</th>
                          <th scope="col" className="fw-semibold">Order Details</th>
                          <th scope="col" className="fw-semibold">Payment</th>
                          <th scope="col" className="fw-semibold">Status</th>
                          <th scope="col" className="fw-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentOrders.map((order) => (
                          <motion.tr 
                            key={order.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="align-middle"
                          >
                            <td>
                              <div className="fw-bold text-primary">#{order.id}</div>
                              <small className="text-muted">
                                {new Date(order.checkout_date).toLocaleDateString('en-PH')}
                              </small>
                            </td>
                            <td>
                              <div>
                                <div className="fw-semibold">{order.user?.name || 'Unknown'}</div>
                                <small className="text-muted">{order.user?.email}</small>
                              </div>
                            </td>
                            <td>
                              <div>
                                {order.contact_phone && (
                                  <div className="small">
                                    📞 
                                    {order.contact_phone}
                                  </div>
                                )}
                                {order.shipping_address && (
                                  <div className="small text-muted mt-1">
                                    📍 
                                    {order.shipping_address.length > 30 
                                      ? `${order.shipping_address.substring(0, 30)}...`
                                      : order.shipping_address
                                    }
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="fw-bold text-success">
                                ₱{parseFloat(order.total_price).toFixed(2)}
                              </div>
                              <small className="text-muted">
                                {order.items?.length || 0} items
                              </small>
                            </td>
                            <td>
                              <div className="d-flex flex-column gap-1">
                                {getPaymentMethodBadge(order.payment_method)}
                                {getPaymentStatusBadge(order.payment_status)}
                              </div>
                            </td>
                            <td>
                              {getStatusBadge(order.status)}
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => handleViewDetails(order)}
                                  title="View Details"
                                >
                                  👁️
                                </button>
                                <button
                                  className="btn btn-outline-info"
                                  onClick={() => handleStatusChange(order)}
                                  title="Change Status"
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="card-footer bg-light border-0">
                  <nav aria-label="Orders pagination">
                    <ul className="pagination pagination-sm mb-0 justify-content-center">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      {[...Array(totalPages)].map((_, index) => (
                        <li key={index + 1} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => paginate(index + 1)}
                          >
                            {index + 1}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    🧾 
                    Order #{selectedOrder.id} Details
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowDetailsModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="fw-bold text-primary">Customer Information</h6>
                      <div className="card bg-light border-0 mb-3">
                        <div className="card-body">
                          <p className="mb-1"><strong>Name:</strong> {selectedOrder.user?.name || 'Unknown'}</p>
                          <p className="mb-1"><strong>Email:</strong> {selectedOrder.user?.email || 'N/A'}</p>
                          <p className="mb-1"><strong>Phone:</strong> {selectedOrder.contact_phone || 'N/A'}</p>
                          <p className="mb-0"><strong>Address:</strong> {selectedOrder.shipping_address || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="fw-bold text-primary">Order Information</h6>
                      <div className="card bg-light border-0 mb-3">
                        <div className="card-body">
                          <p className="mb-1"><strong>Order Date:</strong> {new Date(selectedOrder.checkout_date).toLocaleString('en-PH')}</p>
                          <p className="mb-1"><strong>Total:</strong> <span className="text-success fw-bold">₱{parseFloat(selectedOrder.total_price).toFixed(2)}</span></p>
                          <p className="mb-1"><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                          <p className="mb-1"><strong>Payment:</strong> {getPaymentMethodBadge(selectedOrder.payment_method)} {getPaymentStatusBadge(selectedOrder.payment_status)}</p>
                          {selectedOrder.transaction_ref && (
                            <p className="mb-0"><strong>Transaction Ref:</strong> <code>{selectedOrder.transaction_ref}</code></p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <h6 className="fw-bold text-primary">Order Items</h6>
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="fw-semibold">{item.product?.name || 'Unknown Product'}</div>
                            </td>
                            <td>{item.quantity}</td>
                            <td>₱{parseFloat(item.price || 0).toFixed(2)}</td>
                            <td className="fw-bold">₱{(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Change Modal */}
        {showStatusModal && selectedOrder && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title">
                    ✏️ 
                    Update Order Status
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowStatusModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info">
                    ℹ️ 
                    Updating status for Order #{selectedOrder.id}
                  </div>
                  <p><strong>Current Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                  <hr />
                  <h6 className="fw-bold">Select New Status:</h6>
                  <div className="list-group">
                    {statusOptions.map((status) => (
                      <button
                        key={status.value}
                        className={`list-group-item list-group-item-action d-flex align-items-center ${
                          selectedOrder.status === status.value ? 'active' : ''
                        }`}
                        onClick={() => updateOrderStatus(selectedOrder.id, status.value)}
                        disabled={selectedOrder.status === status.value}
                      >
                        <span className="me-3">{status.icon}</span>
                        <div>
                          <div className="fw-semibold">{status.label}</div>
                          <small className="text-muted">
                            {status.value === 'pending' && 'Order is awaiting processing'}
                            {status.value === 'ready_for_delivery' && 'Order is ready to be delivered'}
                            {status.value === 'delivered' && 'Order has been delivered to customer'}
                            {status.value === 'completed' && 'Order is fully completed'}
                            {status.value === 'cancelled' && 'Order has been cancelled'}
                          </small>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowStatusModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default EnhancedOrdersManagement;

// Add CSS styles for minimalist filters
const styles = `
.minimalist-filters {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 0;
}

.search-section {
  flex: 1;
  min-width: 300px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.results-count {
  position: absolute;
  bottom: -24px;
  left: 44px;
  font-size: 12px;
  color: #6b7280;
  background: #f9fafb;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-weight: 500;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #6b7280;
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 2px solid transparent;
  background: #f8fafc;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  transition: all 0.2s ease;
  outline: none;
}

.search-input:focus {
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.clear-search {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #6b7280;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.clear-search:hover {
  background: #f3f4f6;
  color: #374151;
}

.filters-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.minimal-select {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  min-width: 120px;
}

.minimal-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.minimal-select:hover {
  border-color: #d1d5db;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.date-range:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.minimal-date {
  padding: 6px 8px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  outline: none;
  cursor: pointer;
  min-width: 120px;
}

.date-separator {
  color: #9ca3af;
  font-weight: 600;
  font-size: 16px;
  user-select: none;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.filter-count {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 4px 8px;
}

.count-badge {
  background: #f59e0b;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1;
}

.clear-btn, .refresh-btn {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #6b7280;
}

.clear-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.refresh-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}

.clear-btn svg, .refresh-btn svg {
  transition: transform 0.2s ease;
}

.refresh-btn:hover svg {
  transform: rotate(180deg);
}

/* Active filter indicators */
.minimal-select:not([value=""]), 
.minimal-date:not([value=""]) {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1e40af;
}

.search-input:not([value=""]) {
  background: #eff6ff;
  border-color: #93c5fd;
}

/* Responsive design */
@media (max-width: 768px) {
  .minimalist-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-section {
    min-width: auto;
  }
  
  .filters-section {
    justify-content: space-between;
  }
  
  .minimal-select {
    min-width: auto;
    flex: 1;
  }
  
  .actions-section {
    margin-left: 0;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .date-range {
    justify-content: space-between;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  styleSheet.setAttribute('data-component', 'EnhancedOrdersManagement');
  
  // Remove existing styles for this component
  const existingStyles = document.querySelector('style[data-component="EnhancedOrdersManagement"]');
  if (existingStyles) {
    existingStyles.remove();
  }
  
  document.head.appendChild(styleSheet);
}
