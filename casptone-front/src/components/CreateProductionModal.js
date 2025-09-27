import React, { useState, useEffect } from 'react';

const CreateProductionModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    product_id: '',
    product_type: 'table',
    quantity: 1,
    priority: 'medium',
    notes: '',
    order_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Load products and orders for the form
    loadProducts();
    loadOrders();
  }, []);

  const loadProducts = async () => {
    try {
      // This would call your existing products API
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setProducts(data.data || data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadOrders = async () => {
    try {
      // This would call your existing orders API
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setOrders(data.data || data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to create production:', error);
    } finally {
      setLoading(false);
    }
  };

  const productTypeDescriptions = {
    alkansya: 'No tracking required - Ready for immediate packaging and delivery',
    table: '6-stage production process taking approximately 2 weeks',
    chair: '6-stage production process taking approximately 2 weeks',
    custom: '6-stage production process with custom timeline'
  };

  return (
    <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50\">
      <div className=\"bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-screen overflow-y-auto\">
        <div className=\"p-6\">
          <div className=\"flex justify-between items-center mb-6\">
            <h2 className=\"text-2xl font-bold text-gray-900\">Create Production Order</h2>
            <button
              onClick={onClose}
              className=\"text-gray-400 hover:text-gray-600 transition-colors\"
            >
              <svg className=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M6 18L18 6M6 6l12 12\" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className=\"space-y-6\">
            {/* Product Selection */}
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                Product *
              </label>
              <select
                name=\"product_id\"
                value={formData.product_id}
                onChange={handleChange}
                required
                className=\"w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500\"
              >
                <option value=\"\">Select a product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - ₱{product.price}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type */}
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                Product Type *
              </label>
              <select
                name=\"product_type\"
                value={formData.product_type}
                onChange={handleChange}
                required
                className=\"w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500\"
              >
                <option value=\"table\">Table</option>
                <option value=\"chair\">Chair</option>
                <option value=\"alkansya\">Alkansya</option>
                <option value=\"custom\">Custom</option>
              </select>
              <p className=\"text-sm text-gray-600 mt-1\">
                {productTypeDescriptions[formData.product_type]}
              </p>
            </div>

            {/* Quantity */}
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                Quantity *
              </label>
              <input
                type=\"number\"
                name=\"quantity\"
                value={formData.quantity}
                onChange={handleChange}
                min=\"1\"
                required
                className=\"w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500\"
              />
            </div>

            {/* Priority */}
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                Priority
              </label>
              <select
                name=\"priority\"
                value={formData.priority}
                onChange={handleChange}
                className=\"w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500\"
              >
                <option value=\"low\">Low</option>
                <option value=\"medium\">Medium</option>
                <option value=\"high\">High</option>
                <option value=\"urgent\">Urgent</option>
              </select>
            </div>

            {/* Order Association (Optional) */}
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                Link to Order (Optional)
              </label>
              <select
                name=\"order_id\"
                value={formData.order_id}
                onChange={handleChange}
                className=\"w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500\"
              >
                <option value=\"\">No order association</option>
                {orders.filter(order => order.status !== 'completed').map(order => (
                  <option key={order.id} value={order.id}>
                    Order #{order.id} - {order.customer_name} - ₱{order.total_amount}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                Notes
              </label>
              <textarea
                name=\"notes\"
                value={formData.notes}
                onChange={handleChange}
                rows=\"3\"
                placeholder=\"Additional notes or special instructions...\"
                className=\"w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500\"
              />
            </div>

            {/* Production Process Preview */}
            {formData.product_type !== 'alkansya' && (
              <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-4\">
                <h4 className=\"font-medium text-blue-800 mb-2\">📊 Production Process</h4>
                <p className=\"text-sm text-blue-700 mb-3\">
                  This {formData.product_type} will go through 6 production stages:
                </p>
                <div className=\"grid grid-cols-2 gap-2 text-sm\">
                  <div className=\"flex items-center gap-2\">
                    <div className=\"w-2 h-2 bg-blue-500 rounded-full\"></div>
                    <span>Material Preparation</span>
                  </div>
                  <div className=\"flex items-center gap-2\">
                    <div className=\"w-2 h-2 bg-blue-500 rounded-full\"></div>
                    <span>Cutting & Shaping</span>
                  </div>
                  <div className=\"flex items-center gap-2\">
                    <div className=\"w-2 h-2 bg-blue-500 rounded-full\"></div>
                    <span>Assembly</span>
                  </div>
                  <div className=\"flex items-center gap-2\">
                    <div className=\"w-2 h-2 bg-blue-500 rounded-full\"></div>
                    <span>Sanding & Surface Prep</span>
                  </div>
                  <div className=\"flex items-center gap-2\">
                    <div className=\"w-2 h-2 bg-blue-500 rounded-full\"></div>
                    <span>Finishing</span>
                  </div>
                  <div className=\"flex items-center gap-2\">
                    <div className=\"w-2 h-2 bg-blue-500 rounded-full\"></div>
                    <span>Quality Check & Packaging</span>
                  </div>
                </div>
                <p className=\"text-sm text-blue-600 mt-3\">
                  ⏱️ Estimated completion: 2 weeks from start
                </p>
              </div>
            )}

            {formData.product_type === 'alkansya' && (
              <div className=\"bg-green-50 border border-green-200 rounded-lg p-4\">
                <h4 className=\"font-medium text-green-800 mb-2\">🏺 Alkansya Production</h4>
                <p className=\"text-sm text-green-700\">
                  Alkansya products are produced in bulk and kept in inventory. 
                  This order will be immediately available for packaging and delivery 
                  without going through the detailed production tracking process.
                </p>
                <p className=\"text-sm text-green-600 mt-2\">
                  ⚡ Status: Ready for immediate delivery
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className=\"flex gap-4 pt-6 border-t border-gray-200\">
              <button
                type=\"button\"
                onClick={onClose}
                className=\"flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors\"
              >
                Cancel
              </button>
              <button
                type=\"submit\"
                disabled={loading || !formData.product_id}
                className=\"flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors\"
              >
                {loading ? 'Creating...' : 'Create Production Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProductionModal;