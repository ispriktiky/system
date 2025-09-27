import React, { useState, useEffect } from 'react';
import { productionTrackingApi } from '../api/productionTrackingApi';
import ProductionCard from './ProductionCard';
import StageProgressBar from './StageProgressBar';
import ProductionStats from './ProductionStats';
import CreateProductionModal from './CreateProductionModal';

const ProductionTrackingDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    product_type: 'all',
    status: 'all',
    requires_tracking: '',
    search: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0
  });

  useEffect(() => {
    loadDashboardData();
    loadProductions();
  }, [filters]);

  const loadDashboardData = async () => {
    try {
      const response = await productionTrackingApi.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const loadProductions = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page,
        per_page: pagination.per_page
      };
      
      const response = await productionTrackingApi.getProductions(params);
      setProductions(response.data.data || response.data);
      setPagination({
        current_page: response.data.current_page || 1,
        per_page: response.data.per_page || 15,
        total: response.data.total || 0
      });
    } catch (error) {
      console.error('Failed to load productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCreateProduction = async (data) => {
    try {
      await productionTrackingApi.createProduction(data);
      setShowCreateModal(false);
      loadDashboardData();
      loadProductions();
    } catch (error) {
      console.error('Failed to create production:', error);
      alert('Failed to create production order');
    }
  };

  const handleStageAction = async (productionId, action, data) => {
    try {
      switch (action) {
        case 'start':
          await productionTrackingApi.startStage(productionId, data);
          break;
        case 'complete':
          await productionTrackingApi.completeStage(productionId, data);
          break;
        case 'progress':
          await productionTrackingApi.updateStageProgress(productionId, data);
          break;
      }
      
      loadDashboardData();
      loadProductions();
    } catch (error) {
      console.error(`Failed to ${action} stage:`, error);
      alert(`Failed to ${action} stage`);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className=\"flex items-center justify-center min-h-screen\">
        <div className=\"animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500\"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 shadow-lg">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-6">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">Production Control Center</h1>
                  <p className="text-blue-100 text-lg mt-1">Advanced woodcraft production tracking & analytics</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 border border-white/20 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Production Order
            </button>
          </div>

          {/* Enhanced Stats Cards */}
          {dashboardData && (
            <div className="mt-8">
              <ProductionStats stats={dashboardData.stats} />
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">

        {/* Modern Filters Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Smart Filters & Search</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                Product Type
              </label>
              <select
                value={filters.product_type}
                onChange={(e) => handleFilterChange('product_type', e.target.value)}
                className="w-full bg-white border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-gray-700 font-medium"
              >
                <option value="all">🌟 All Types</option>
                <option value="table">🪑 Tables</option>
                <option value="chair">🪑 Chairs</option>
                <option value="alkansya">🏺 Alkansya</option>
                <option value="custom">⚙️ Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Production Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-white border-2 border-gray-200 hover:border-green-300 focus:border-green-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-green-100 transition-all duration-200 text-gray-700 font-medium"
              >
                <option value="all">📊 All Status</option>
                <option value="Pending">⏳ Pending</option>
                <option value="In Progress">⚡ In Progress</option>
                <option value="Completed">✅ Completed</option>
                <option value="Hold">🛑 On Hold</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                Tracking Mode
              </label>
              <select
                value={filters.requires_tracking}
                onChange={(e) => handleFilterChange('requires_tracking', e.target.value)}
                className="w-full bg-white border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-gray-700 font-medium"
              >
                <option value="">🎯 All Items</option>
                <option value="true">📈 With Tracking</option>
                <option value="false">⚡ No Tracking</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                Quick Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by batch, product name..."
                  className="w-full bg-white border-2 border-gray-200 hover:border-yellow-300 focus:border-yellow-500 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-4 focus:ring-yellow-100 transition-all duration-200 text-gray-700 font-medium placeholder-gray-400"
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Quick Insights */}
        {dashboardData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {/* Delayed Productions Alert */}
            {dashboardData.delayed_productions?.length > 0 && (
              <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-500 rounded-xl p-2 shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-red-800">Urgent Attention</h3>
                      <p className="text-red-600 text-sm">{dashboardData.delayed_productions.length} delayed productions</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {dashboardData.delayed_productions.slice(0, 3).map(production => (
                      <div key={production.id} className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-red-100 hover:bg-white/90 transition-all duration-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">{production.product_name}</p>
                            <p className="text-sm text-gray-600">#{production.production_batch_number}</p>
                          </div>
                          <div className="text-right">
                            <div className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-sm font-bold">
                              {production.delay_hours}h overdue
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{production.current_stage}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            {dashboardData.upcoming_deadlines?.length > 0 && (
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-yellow-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-yellow-500 rounded-xl p-2 shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-800">Upcoming Deadlines</h3>
                      <p className="text-yellow-600 text-sm">{dashboardData.upcoming_deadlines.length} due within 3 days</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {dashboardData.upcoming_deadlines.slice(0, 3).map(production => (
                      <div key={production.id} className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-yellow-100 hover:bg-white/90 transition-all duration-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">{production.product_name}</p>
                            <p className="text-sm text-gray-600">#{production.production_batch_number}</p>
                          </div>
                          <div className="text-right">
                            <div className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-sm font-bold">
                              {new Date(production.estimated_completion_date).toLocaleDateString()}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{production.current_stage}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-500 rounded-xl p-2 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-800">Quick Actions</h3>
                    <p className="text-green-600 text-sm">Manage your production flow</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="w-full bg-white/70 hover:bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-green-100 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 group-hover:text-green-700">New Production</p>
                        <p className="text-sm text-gray-600">Start a new order</p>
                      </div>
                      <svg className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </button>
                  
                  <div className="w-full bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">Analytics</p>
                        <p className="text-sm text-gray-600">View performance</p>
                      </div>
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Productions List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-3 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Production Orders</h2>
                  <p className="text-gray-600 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      {pagination.total} total productions
                    </span>
                    {loading && (
                      <span className="inline-flex items-center gap-1 text-blue-600">
                        <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                        Updating...
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* View Toggle Buttons */}
              <div className="flex bg-white rounded-xl p-1 shadow-sm border">
                <button className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium transition-all">
                  📋 List View
                </button>
                <button className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-800 text-sm font-medium transition-all">
                  📊 Grid View
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
                </div>
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-700">Loading Productions</h3>
                <p className="text-gray-500 mt-2">Fetching the latest production data...</p>
                <div className="flex justify-center mt-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : productions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-6">
                <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Productions Found</h3>
                <p className="text-gray-500 mb-6">No productions match your current search criteria.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => {
                      setFilters({
                        product_type: 'all',
                        status: 'all', 
                        requires_tracking: '',
                        search: ''
                      });
                    }}
                    className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  >
                    🔄 Clear Filters
                  </button>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    ➕ Create New Production
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100/50">
              {productions.map(production => (
                <div key={production.id} className="hover:bg-gray-50/50 transition-all duration-200">
                  <ProductionCard
                    production={production}
                    onStageAction={handleStageAction}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Pagination */}
          {pagination.total > pagination.per_page && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-6 border-t border-gray-200/50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Page {pagination.current_page}
                  </div>
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-800">
                      {((pagination.current_page - 1) * pagination.per_page) + 1}-{Math.min(pagination.current_page * pagination.per_page, pagination.total)}
                    </span> of <span className="font-semibold text-gray-800">{pagination.total}</span> productions
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => loadProductions(pagination.current_page - 1)}
                    disabled={pagination.current_page <= 1}
                    className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-gray-700 font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.per_page)) }, (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === pagination.current_page;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => loadProductions(pageNum)}
                          className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                            isActive 
                              ? 'bg-blue-500 text-white shadow-lg scale-105' 
                              : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => loadProductions(pagination.current_page + 1)}
                    disabled={pagination.current_page * pagination.per_page >= pagination.total}
                    className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-gray-700 font-medium shadow-sm"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>

        </div>
      </div>

      {/* Create Production Modal */}
      {showCreateModal && (
        <CreateProductionModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProduction}
        />
      )}
    </div>
  );
};

export default ProductionTrackingDashboard;