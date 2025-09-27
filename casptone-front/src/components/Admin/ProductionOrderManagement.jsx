import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Header';
import {
  getProductions,
  startProduction,
  createBatchProduction,
  updateProductionPriority,
  getDashboardData
} from '../../api/productionApi';
import api from '../../api/client';
import './ProductionOrderManagement.css';

const ProductionOrderManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [productions, setProductions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  
  // Modal states
  const [showNewProductionModal, setShowNewProductionModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  
  // Form states
  const [newProduction, setNewProduction] = useState({
    product_id: '',
    quantity: 1,
    priority: 'medium',
    order_id: '',
    user_id: localStorage.getItem('userId') || 1
  });
  
  const [batchProduction, setBatchProduction] = useState({
    product_id: '',
    priority: 'medium',
    user_id: localStorage.getItem('userId') || 1,
    orders: []
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [ordersData, productsData, productionsData] = await Promise.all([
        loadOrders(),
        loadProducts(),
        getProductions()
      ]);
      
      // Filter orders that need production (tables and chairs, not alkansya)
      const productionOrders = ordersData.filter(order => 
        order.items?.some(item => 
          !item.product?.name?.toLowerCase().includes('alkansya')
        ) && order.status !== 'completed'
      );
      
      setPendingOrders(productionOrders);
      setProductions(productionsData.filter(p => !p.product_name?.toLowerCase().includes('alkansya')));
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    const response = await api.get('/orders');
    setOrders(response.data);
    return response.data;
  };

  const loadProducts = async () => {
    const response = await api.get('/products');
    // Filter out alkansya products
    const trackableProducts = response.data.filter(product =>
      !product.name?.toLowerCase().includes('alkansya')
    );
    setProducts(trackableProducts);
    return trackableProducts;
  };

  const handleNewProduction = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const result = await startProduction(newProduction);
      
      if (result.message && result.message.includes('alkansya')) {
        setError(result.message);
        return;
      }

      setSuccess('Production started successfully!');
      setShowNewProductionModal(false);
      setNewProduction({
        product_id: '',
        quantity: 1,
        priority: 'medium',
        order_id: '',
        user_id: localStorage.getItem('userId') || 1
      });
      
      // Refresh data
      await loadInitialData();
      
    } catch (err) {
      console.error('Failed to start production:', err);
      setError('Failed to start production');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchProduction = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const batchData = {
        ...batchProduction,
        batch_quantity: batchProduction.orders.reduce((sum, order) => sum + order.quantity, 0),
        orders: batchProduction.orders
      };

      const result = await createBatchProduction(batchData);
      
      if (result.message && result.message.includes('alkansya')) {
        setError(result.message);
        return;
      }

      setSuccess(`Batch production created successfully! Batch: ${result.batch_number}`);
      setShowBatchModal(false);
      setBatchProduction({
        product_id: '',
        priority: 'medium',
        user_id: localStorage.getItem('userId') || 1,
        orders: []
      });
      setSelectedOrders([]);
      
      // Refresh data
      await loadInitialData();
      
    } catch (err) {
      console.error('Failed to create batch production:', err);
      setError('Failed to create batch production');
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = async (productionId, newPriority) => {
    try {
      await updateProductionPriority(productionId, newPriority, 'Priority updated from order management');
      setSuccess('Priority updated successfully');
      await loadInitialData();
    } catch (err) {
      console.error('Failed to update priority:', err);
      setError('Failed to update priority');
    }
  };

  const handleOrderSelection = (order) => {
    const isSelected = selectedOrders.find(o => o.order_id === order.id);
    
    if (isSelected) {
      setSelectedOrders(prev => prev.filter(o => o.order_id !== order.id));
    } else {
      // Calculate total quantity for this order's trackable items
      const trackableItems = order.items?.filter(item => 
        !item.product?.name?.toLowerCase().includes('alkansya')
      ) || [];
      
      const totalQuantity = trackableItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      
      setSelectedOrders(prev => [...prev, {
        order_id: order.id,
        quantity: totalQuantity,
        customer_name: order.user?.name || 'Unknown'
      }]);
    }
  };

  const prepareBatchProduction = () => {
    if (selectedOrders.length === 0) {
      setError('Please select at least one order for batch production');
      return;
    }

    setBatchProduction(prev => ({
      ...prev,
      orders: selectedOrders
    }));
    setShowBatchModal(true);
  };

  const getOrderStatus = (order) => {
    const hasProduction = productions.some(p => p.order_id === order.id);
    if (hasProduction) return 'In Production';
    if (order.status === 'completed') return 'Completed';
    if (order.status === 'confirmed') return 'Ready for Production';
    return 'Pending';
  };

  const getOrderStatusClass = (status) => {
    switch (status) {
      case 'In Production': return 'bg-primary';
      case 'Completed': return 'bg-success';
      case 'Ready for Production': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const calculateEstimatedDuration = (quantity) => {
    // Rough estimate: 2 weeks for standard table/chair production
    const baseWeeks = 2;
    const additionalDays = Math.ceil(quantity / 10) * 2; // 2 extra days per 10 units
    return `${baseWeeks} weeks${additionalDays > 0 ? ` + ${additionalDays} days` : ''}`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5>Loading Order Management...</h5>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="production-order-management">
        {/* Header */}
        <div className="management-header">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/admin/production')}>
                ← Back to Production
              </button>
              <h1 className="display-6 mb-0">Production Order Management</h1>
              <p className="text-muted mb-0">Manage and initiate production for tables and chairs</p>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-success"
                onClick={() => setShowNewProductionModal(true)}
              >
                <i className="fas fa-plus me-1"></i>
                New Production
              </button>
              <button 
                className="btn btn-primary"
                onClick={prepareBatchProduction}
                disabled={selectedOrders.length === 0}
              >
                <i className="fas fa-layer-group me-1"></i>
                Batch Production ({selectedOrders.length})
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}
          
          {success && (
            <div className="alert alert-success alert-dismissible fade show">
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}
        </div>

        <div className="row g-4">
          {/* Pending Orders */}
          <div className="col-lg-8">
            <div className="card orders-card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-clipboard-list me-2"></i>
                  Orders Requiring Production
                  <span className="badge bg-primary ms-2">{pendingOrders.length}</span>
                </h5>
              </div>
              <div className="card-body">
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <h5 className="text-muted">No orders require production</h5>
                    <p className="text-muted">All current orders are either completed or for pre-made items (alkansya).</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th width="50">
                            <input 
                              type="checkbox" 
                              className="form-check-input"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const allOrders = pendingOrders.map(order => {
                                    const trackableItems = order.items?.filter(item => 
                                      !item.product?.name?.toLowerCase().includes('alkansya')
                                    ) || [];
                                    const totalQuantity = trackableItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                                    
                                    return {
                                      order_id: order.id,
                                      quantity: totalQuantity,
                                      customer_name: order.user?.name || 'Unknown'
                                    };
                                  });
                                  setSelectedOrders(allOrders);
                                } else {
                                  setSelectedOrders([]);
                                }
                              }}
                            />
                          </th>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Products</th>
                          <th>Quantity</th>
                          <th>Order Date</th>
                          <th>Status</th>
                          <th>Est. Duration</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingOrders.map(order => {
                          const trackableItems = order.items?.filter(item => 
                            !item.product?.name?.toLowerCase().includes('alkansya')
                          ) || [];
                          
                          const totalQuantity = trackableItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                          const status = getOrderStatus(order);
                          const isSelected = selectedOrders.find(o => o.order_id === order.id);
                          
                          return (
                            <tr key={order.id} className={isSelected ? 'table-active' : ''}>
                              <td>
                                <input 
                                  type="checkbox" 
                                  className="form-check-input"
                                  checked={!!isSelected}
                                  onChange={() => handleOrderSelection(order)}
                                />
                              </td>
                              <td>
                                <strong>#{order.id}</strong>
                              </td>
                              <td>{order.user?.name || 'Unknown Customer'}</td>
                              <td>
                                <div className="product-list">
                                  {trackableItems.map((item, idx) => (
                                    <div key={idx} className="product-item">
                                      <span className="product-name">{item.product?.name}</span>
                                      <span className="product-quantity">×{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <span className="badge bg-info">{totalQuantity} units</span>
                              </td>
                              <td>
                                {new Date(order.created_at).toLocaleDateString()}
                              </td>
                              <td>
                                <span className={`badge ${getOrderStatusClass(status)}`}>
                                  {status}
                                </span>
                              </td>
                              <td>
                                <small className="text-muted">
                                  {calculateEstimatedDuration(totalQuantity)}
                                </small>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  {status === 'Ready for Production' && (
                                    <button 
                                      className="btn btn-sm btn-success me-1"
                                      onClick={() => {
                                        setNewProduction({
                                          ...newProduction,
                                          order_id: order.id,
                                          quantity: totalQuantity,
                                          product_id: trackableItems[0]?.product?.id || ''
                                        });
                                        setShowNewProductionModal(true);
                                      }}
                                    >
                                      <i className="fas fa-play"></i>
                                    </button>
                                  )}
                                  <button 
                                    className="btn btn-sm btn-outline-info"
                                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Productions */}
          <div className="col-lg-4">
            <div className="card productions-card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-cogs me-2"></i>
                  Active Productions
                  <span className="badge bg-warning ms-2">
                    {productions.filter(p => p.status !== 'Completed').length}
                  </span>
                </h5>
              </div>
              <div className="card-body">
                <div className="productions-list">
                  {productions.filter(p => p.status !== 'Completed').length === 0 ? (
                    <div className="text-center py-4">
                      <i className="fas fa-pause-circle fa-2x text-muted mb-2"></i>
                      <p className="text-muted mb-0">No active productions</p>
                    </div>
                  ) : (
                    productions.filter(p => p.status !== 'Completed').map(production => (
                      <div key={production.id} className="production-item mb-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="production-title">{production.product_name}</h6>
                            <p className="production-details mb-1">
                              <small>ID: #{production.id} | Qty: {production.quantity}</small>
                            </p>
                            <p className="production-stage mb-2">
                              <span className="badge bg-primary">{production.stage}</span>
                            </p>
                          </div>
                          <div className="priority-control">
                            <select
                              className="form-select form-select-sm"
                              value={production.priority}
                              onChange={(e) => handlePriorityChange(production.id, e.target.value)}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="production-progress">
                          <div className="progress mb-1" style={{ height: '4px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ width: `${Math.random() * 100}%` }}
                            ></div>
                          </div>
                          <div className="d-flex justify-content-between">
                            <small className="text-muted">
                              Started: {new Date(production.date).toLocaleDateString()}
                            </small>
                            <small className="text-muted">
                              {production.estimated_completion_date ? 
                                `Due: ${new Date(production.estimated_completion_date).toLocaleDateString()}` : 
                                'No due date'
                              }
                            </small>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card mt-3">
              <div className="card-header">
                <h6 className="card-title mb-0">
                  <i className="fas fa-chart-bar me-2"></i>
                  Quick Stats
                </h6>
              </div>
              <div className="card-body">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value text-info">{pendingOrders.length}</div>
                    <div className="stat-label">Pending Orders</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value text-warning">{productions.filter(p => p.status !== 'Completed').length}</div>
                    <div className="stat-label">In Production</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value text-success">{productions.filter(p => p.status === 'Completed').length}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value text-danger">{productions.filter(p => p.priority === 'urgent').length}</div>
                    <div className="stat-label">Urgent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Production Modal */}
        {showNewProductionModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Start New Production</h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowNewProductionModal(false)}
                  ></button>
                </div>
                <form onSubmit={handleNewProduction}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Product</label>
                      <select
                        className="form-select"
                        value={newProduction.product_id}
                        onChange={(e) => setNewProduction({...newProduction, product_id: e.target.value})}
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - ${product.price}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newProduction.quantity}
                        onChange={(e) => setNewProduction({...newProduction, quantity: parseInt(e.target.value)})}
                        min="1"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Priority</label>
                      <select
                        className="form-select"
                        value={newProduction.priority}
                        onChange={(e) => setNewProduction({...newProduction, priority: e.target.value})}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Link to Order (Optional)</label>
                      <select
                        className="form-select"
                        value={newProduction.order_id}
                        onChange={(e) => setNewProduction({...newProduction, order_id: e.target.value})}
                      >
                        <option value="">No specific order</option>
                        {pendingOrders.map(order => (
                          <option key={order.id} value={order.id}>
                            Order #{order.id} - {order.user?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowNewProductionModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success" disabled={loading}>
                      {loading ? 'Starting...' : 'Start Production'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Batch Production Modal */}
        {showBatchModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Batch Production</h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowBatchModal(false)}
                  ></button>
                </div>
                <form onSubmit={handleBatchProduction}>
                  <div className="modal-body">
                    <div className="mb-4">
                      <h6>Selected Orders ({selectedOrders.length})</h6>
                      <div className="selected-orders-list">
                        {selectedOrders.map((order, index) => (
                          <div key={index} className="selected-order-item">
                            <span>Order #{order.order_id} - {order.customer_name}</span>
                            <span className="badge bg-info">{order.quantity} units</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2">
                        <strong>Total Quantity: {selectedOrders.reduce((sum, order) => sum + order.quantity, 0)} units</strong>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Product Type</label>
                      <select
                        className="form-select"
                        value={batchProduction.product_id}
                        onChange={(e) => setBatchProduction({...batchProduction, product_id: e.target.value})}
                        required
                      >
                        <option value="">Select Product Type</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Batch Priority</label>
                      <select
                        className="form-select"
                        value={batchProduction.priority}
                        onChange={(e) => setBatchProduction({...batchProduction, priority: e.target.value})}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      <strong>Batch Production Benefits:</strong>
                      <ul className="mb-0 mt-2">
                        <li>Optimized resource utilization</li>
                        <li>Reduced setup time</li>
                        <li>Estimated completion: 2-3 weeks for {selectedOrders.reduce((sum, order) => sum + order.quantity, 0)} units</li>
                      </ul>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowBatchModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Batch Production'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProductionOrderManagement;