import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Header';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  getDashboardData,
  getProductions,
  updateProductionProcess,
  updateProductionPriority,
  getProductionTimeline,
  getEfficiencyReport,
  getCapacityUtilization,
  getResourceAllocation,
  getPerformanceMetrics
} from '../../api/productionApi';
import './ProductionDashboard.css';

const PROCESS_STAGES = [
  'Material Preparation',
  'Cutting & Shaping',
  'Assembly',
  'Sanding & Surface Preparation',
  'Finishing',
  'Quality Check & Packaging'
];

const STAGE_COLORS = {
  'Material Preparation': '#e74c3c',
  'Cutting & Shaping': '#f39c12',
  'Assembly': '#3498db',
  'Sanding & Surface Preparation': '#9b59b6',
  'Finishing': '#2ecc71',
  'Quality Check & Packaging': '#1abc9c'
};

const PRIORITY_COLORS = {
  low: '#95a5a6',
  medium: '#3498db',
  high: '#f39c12',
  urgent: '#e74c3c'
};

const EnhancedProductionDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [productions, setProductions] = useState([]);
  const [filteredProductions, setFilteredProductions] = useState([]);
  const [efficiencyData, setEfficiencyData] = useState(null);
  const [capacityData, setCapacityData] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    dateRange: 7
  });
  
  // Modal states
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineData, setTimelineData] = useState(null);

  useEffect(() => {
    loadDashboardData();
    loadProductions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [productions, filters]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getDashboardData({ date_range: filters.dateRange });
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadProductions = async () => {
    try {
      const data = await getProductions();
      // Filter out alkansya products as they don't need tracking
      const trackableProductions = data.filter(prod => 
        !prod.product_name?.toLowerCase().includes('alkansya')
      );
      setProductions(trackableProductions);
      setFilteredProductions(trackableProductions);
    } catch (err) {
      console.error('Failed to load productions:', err);
      setError('Failed to load production data');
    }
  };

  const loadEfficiencyData = async () => {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const data = await getEfficiencyReport(
        startDate.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );
      setEfficiencyData(data);
    } catch (err) {
      console.error('Failed to load efficiency data:', err);
    }
  };

  const loadCapacityData = async () => {
    try {
      const data = await getCapacityUtilization(30);
      setCapacityData(data);
    } catch (err) {
      console.error('Failed to load capacity data:', err);
    }
  };

  const loadResourceData = async () => {
    try {
      const data = await getResourceAllocation();
      setResourceData(data);
    } catch (err) {
      console.error('Failed to load resource data:', err);
    }
  };

  const loadPerformanceData = async () => {
    try {
      const data = await getPerformanceMetrics('month');
      setPerformanceData(data);
    } catch (err) {
      console.error('Failed to load performance data:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...productions];

    // Search filter
    if (filters.search.trim()) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(prod => 
        prod.product_name?.toLowerCase().includes(search) ||
        prod.id?.toString().includes(search) ||
        prod.production_batch_number?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(prod => prod.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(prod => prod.priority === filters.priority);
    }

    setFilteredProductions(filtered);
  };

  const handleProcessUpdate = async (productionId, processId, newStatus) => {
    try {
      await updateProductionProcess(productionId, processId, {
        status: newStatus,
        notes: `Status updated to ${newStatus} at ${new Date().toLocaleString()}`
      });
      await loadProductions(); // Refresh data
    } catch (err) {
      console.error('Failed to update process:', err);
      setError('Failed to update process status');
    }
  };

  const handlePriorityUpdate = async (productionId, newPriority, reason) => {
    try {
      await updateProductionPriority(productionId, newPriority, reason);
      await loadProductions(); // Refresh data
    } catch (err) {
      console.error('Failed to update priority:', err);
      setError('Failed to update priority');
    }
  };

  const showTimeline = async (production) => {
    try {
      setSelectedProduction(production);
      const data = await getProductionTimeline(production.id);
      setTimelineData(data);
      setShowTimelineModal(true);
    } catch (err) {
      console.error('Failed to load timeline:', err);
      setError('Failed to load production timeline');
    }
  };

  const calculateProgress = (processes) => {
    if (!processes || processes.length === 0) return 0;
    const completedCount = processes.filter(p => p.status === 'completed').length;
    const inProgressCount = processes.filter(p => p.status === 'in_progress').length;
    return ((completedCount + inProgressCount * 0.5) / processes.length) * 100;
  };

  // Data processing for charts
  const stageDistribution = useMemo(() => {
    const distribution = PROCESS_STAGES.map(stage => ({
      name: stage,
      value: filteredProductions.filter(p => p.stage === stage).length,
      color: STAGE_COLORS[stage]
    }));
    return distribution;
  }, [filteredProductions]);

  const priorityDistribution = useMemo(() => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    return priorities.map(priority => ({
      name: priority,
      value: filteredProductions.filter(p => p.priority === priority).length,
      color: PRIORITY_COLORS[priority]
    }));
  }, [filteredProductions]);

  const dailyProgress = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayProductions = filteredProductions.filter(p => 
        p.date && p.date.startsWith(date)
      );
      const completed = dayProductions.filter(p => p.status === 'Completed').length;
      const inProgress = dayProductions.filter(p => p.status === 'In Progress').length;
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed,
        inProgress,
        total: dayProductions.length
      };
    });
  }, [filteredProductions]);

  if (loading) {
    return (
      <AppLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5>Loading Production Dashboard...</h5>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="production-dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
              </button>
              <h1 className="display-6 mb-0">Production Tracking System</h1>
              <p className="text-muted mb-0">Real-time monitoring of woodcraft production</p>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary"
                onClick={() => window.location.reload()}
              >
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/admin/production/new')}
              >
                <i className="fas fa-plus me-1"></i>
                Start Production
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Tabs */}
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="fas fa-tachometer-alt me-1"></i>
                Overview
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'tracking' ? 'active' : ''}`}
                onClick={() => setActiveTab('tracking')}
              >
                <i className="fas fa-tasks me-1"></i>
                Production Tracking
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('analytics');
                  loadEfficiencyData();
                  loadCapacityData();
                  loadPerformanceData();
                }}
              >
                <i className="fas fa-chart-line me-1"></i>
                Analytics
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'resources' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('resources');
                  loadResourceData();
                }}
              >
                <i className="fas fa-cogs me-1"></i>
                Resources
              </button>
            </li>
          </ul>
        </div>

        {/* Tab Content */}
        <div className="tab-content mt-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-pane fade show active">
              {dashboardData && (
                <div className="row g-4">
                  {/* KPI Cards */}
                  <div className="col-12">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <div className="card bg-primary text-white">
                          <div className="card-body">
                            <div className="d-flex justify-content-between">
                              <div>
                                <h4 className="card-title">{dashboardData.overview?.active_productions || 0}</h4>
                                <p className="card-text">Active Productions</p>
                              </div>
                              <div className="card-icon">
                                <i className="fas fa-play-circle fa-2x"></i>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-success text-white">
                          <div className="card-body">
                            <div className="d-flex justify-content-between">
                              <div>
                                <h4 className="card-title">{dashboardData.overview?.completed_this_period || 0}</h4>
                                <p className="card-text">Completed This Week</p>
                              </div>
                              <div className="card-icon">
                                <i className="fas fa-check-circle fa-2x"></i>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-info text-white">
                          <div className="card-body">
                            <div className="d-flex justify-content-between">
                              <div>
                                <h4 className="card-title">{dashboardData.overview?.total_quantity_in_production || 0}</h4>
                                <p className="card-text">Units in Production</p>
                              </div>
                              <div className="card-icon">
                                <i className="fas fa-boxes fa-2x"></i>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-warning text-white">
                          <div className="card-body">
                            <div className="d-flex justify-content-between">
                              <div>
                                <h4 className="card-title">{Math.round(dashboardData.overview?.on_time_delivery_rate || 0)}%</h4>
                                <p className="card-text">On-Time Delivery</p>
                              </div>
                              <div className="card-icon">
                                <i className="fas fa-clock fa-2x"></i>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Production by Stage</h5>
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={stageDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {stageDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Weekly Progress</h5>
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={dailyProgress}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="completed" stackId="1" stroke="#27ae60" fill="#27ae60" />
                            <Area type="monotone" dataKey="inProgress" stackId="1" stroke="#3498db" fill="#3498db" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Workload by Stage */}
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Current Workload by Stage</h5>
                      </div>
                      <div className="card-body">
                        {dashboardData.workload_by_stage && dashboardData.workload_by_stage.map((stage, index) => (
                          <div key={index} className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="fw-medium">{stage.stage}</span>
                              <div>
                                <span className="badge bg-primary me-2">{stage.count} orders</span>
                                <span className="badge bg-info">{stage.total_quantity} units</span>
                              </div>
                            </div>
                            <div className="progress" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar" 
                                role="progressbar" 
                                style={{ 
                                  width: `${Math.min(100, (stage.count / 10) * 100)}%`,
                                  backgroundColor: STAGE_COLORS[stage.stage]
                                }}
                              ></div>
                            </div>
                            <small className="text-muted">
                              Avg. time in stage: {Math.round(stage.avg_days_in_stage || 0)} days
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Production Tracking Tab */}
          {activeTab === 'tracking' && (
            <div className="tab-pane fade show active">
              {/* Filters */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Search</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by product, ID, or batch..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      >
                        <option value="all">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Hold">Hold</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Priority</label>
                      <select
                        className="form-select"
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                      >
                        <option value="all">All Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Date Range</label>
                      <select
                        className="form-select"
                        value={filters.dateRange}
                        onChange={(e) => setFilters({ ...filters, dateRange: parseInt(e.target.value) })}
                      >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                      </select>
                    </div>
                    <div className="col-md-2 d-flex align-items-end">
                      <button
                        className="btn btn-outline-secondary w-100"
                        onClick={() => setFilters({ search: '', status: 'all', priority: 'all', dateRange: 7 })}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Production Cards */}
              <div className="row g-4">
                {filteredProductions.map((production) => (
                  <div key={production.id} className="col-lg-6">
                    <div className={`card h-100 shadow-sm border-start border-4 production-card`}
                         style={{ borderLeftColor: STAGE_COLORS[production.stage] || '#6c757d' }}>
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-0">{production.product_name}</h6>
                          <small className="text-muted">ID: {production.id} | Batch: {production.production_batch_number || 'N/A'}</small>
                        </div>
                        <div className="d-flex gap-1">
                          <span className={`badge ${
                            production.priority === 'urgent' ? 'bg-danger' :
                            production.priority === 'high' ? 'bg-warning text-dark' :
                            production.priority === 'medium' ? 'bg-info text-dark' : 'bg-secondary'
                          }`}>
                            {production.priority}
                          </span>
                          <span className={`badge ${
                            production.status === 'Completed' ? 'bg-success' :
                            production.status === 'In Progress' ? 'bg-primary' :
                            production.status === 'Hold' ? 'bg-warning text-dark' : 'bg-secondary'
                          }`}>
                            {production.status}
                          </span>
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="row mb-3">
                          <div className="col-6">
                            <small className="text-muted">Quantity</small>
                            <div className="fw-bold">{production.quantity}</div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Current Stage</small>
                            <div className="fw-bold">{production.stage}</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <small>Progress</small>
                            <small>{Math.round(calculateProgress(production.processes))}%</small>
                          </div>
                          <div className="progress" style={{ height: '8px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              role="progressbar" 
                              style={{ width: `${calculateProgress(production.processes)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Process Timeline */}
                        {production.processes && production.processes.length > 0 && (
                          <div className="process-timeline">
                            {PROCESS_STAGES.map((stageName, index) => {
                              const process = production.processes.find(p => p.process_name === stageName);
                              const status = process?.status || 'pending';
                              
                              return (
                                <div key={index} className={`process-step ${status}`}>
                                  <div className="process-indicator">
                                    <div className="process-dot"></div>
                                    {index < PROCESS_STAGES.length - 1 && <div className="process-line"></div>}
                                  </div>
                                  <div className="process-content">
                                    <div className="process-title">{stageName}</div>
                                    {process && (
                                      <div className="process-details">
                                        {process.started_at && (
                                          <small className="text-muted">
                                            Started: {new Date(process.started_at).toLocaleDateString()}
                                          </small>
                                        )}
                                        {process.completed_at && (
                                          <small className="text-success d-block">
                                            Completed: {new Date(process.completed_at).toLocaleDateString()}
                                          </small>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-3 d-flex gap-2">
                          <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => showTimeline(production)}
                          >
                            <i className="fas fa-timeline me-1"></i>
                            View Timeline
                          </button>
                          {production.status === 'In Progress' && (
                            <button 
                              className="btn btn-outline-success btn-sm"
                              onClick={() => {
                                // Handle next stage progression
                                const currentStageIndex = PROCESS_STAGES.indexOf(production.stage);
                                const nextStage = PROCESS_STAGES[currentStageIndex + 1];
                                if (nextStage) {
                                  // Update to next stage
                                }
                              }}
                            >
                              <i className="fas fa-forward me-1"></i>
                              Next Stage
                            </button>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="mt-3 pt-2 border-top">
                          <div className="row text-center">
                            <div className="col-4">
                              <small className="text-muted">Started</small>
                              <div className="small">
                                {production.date ? new Date(production.date).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <div className="col-4">
                              <small className="text-muted">Est. Completion</small>
                              <div className="small">
                                {production.estimated_completion_date ? 
                                  new Date(production.estimated_completion_date).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <div className="col-4">
                              <small className="text-muted">Actual Completion</small>
                              <div className="small">
                                {production.actual_completion_date ? 
                                  new Date(production.actual_completion_date).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProductions.length === 0 && (
                <div className="text-center py-5">
                  <i className="fas fa-search fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No productions found</h5>
                  <p className="text-muted">Try adjusting your filters or start a new production.</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="tab-pane fade show active">
              <div className="row g-4">
                {/* Performance Metrics */}
                {performanceData && (
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Key Performance Indicators</h5>
                      </div>
                      <div className="card-body">
                        <div className="row text-center">
                          <div className="col-md-2">
                            <div className="metric-card">
                              <h4 className="text-primary">{performanceData.kpis?.throughput || 0}</h4>
                              <small>Throughput</small>
                            </div>
                          </div>
                          <div className="col-md-2">
                            <div className="metric-card">
                              <h4 className="text-info">{performanceData.kpis?.average_lead_time_days || 0} days</h4>
                              <small>Avg Lead Time</small>
                            </div>
                          </div>
                          <div className="col-md-2">
                            <div className="metric-card">
                              <h4 className="text-success">{performanceData.kpis?.quality_rate_percentage || 0}%</h4>
                              <small>Quality Rate</small>
                            </div>
                          </div>
                          <div className="col-md-2">
                            <div className="metric-card">
                              <h4 className="text-warning">{performanceData.kpis?.on_time_delivery_percentage || 0}%</h4>
                              <small>On-Time Delivery</small>
                            </div>
                          </div>
                          <div className="col-md-2">
                            <div className="metric-card">
                              <h4 className="text-danger">{performanceData.kpis?.resource_utilization_percentage || 0}%</h4>
                              <small>Resource Utilization</small>
                            </div>
                          </div>
                          <div className="col-md-2">
                            <div className="metric-card">
                              <h4 className="text-secondary">{performanceData.production_summary?.completion_rate || 0}%</h4>
                              <small>Completion Rate</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Efficiency Chart */}
                {efficiencyData && (
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Process Efficiency</h5>
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={efficiencyData.process_efficiency}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="process_name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="efficiency_percentage" fill="#3498db" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Capacity Utilization */}
                {capacityData && (
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Capacity Utilization (Last 30 Days)</h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <div className="row text-center">
                            <div className="col-4">
                              <h6 className="text-success">{capacityData.summary?.average_utilization || 0}%</h6>
                              <small>Average</small>
                            </div>
                            <div className="col-4">
                              <h6 className="text-warning">{capacityData.summary?.peak_utilization || 0}%</h6>
                              <small>Peak</small>
                            </div>
                            <div className="col-4">
                              <h6 className="text-info">{capacityData.summary?.lowest_utilization || 0}%</h6>
                              <small>Lowest</small>
                            </div>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={capacityData.daily_utilization?.slice(-14)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="utilization_percentage" stroke="#e74c3c" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="tab-pane fade show active">
              {resourceData && (
                <div className="row g-4">
                  {/* Current Allocation */}
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Current Resource Allocation</h5>
                      </div>
                      <div className="card-body">
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead>
                              <tr>
                                <th>Stage</th>
                                <th>Productions</th>
                                <th>Total Quantity</th>
                                <th>Avg Time in Stage</th>
                                <th>Urgency Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resourceData.current_allocation?.map((stage, index) => (
                                <tr key={index}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      <div 
                                        className="stage-indicator me-2"
                                        style={{ backgroundColor: STAGE_COLORS[stage.stage] }}
                                      ></div>
                                      {stage.stage}
                                    </div>
                                  </td>
                                  <td>{stage.productions_count}</td>
                                  <td>{stage.total_quantity}</td>
                                  <td>{Math.round(stage.avg_time_in_stage_hours)} hours</td>
                                  <td>
                                    <div className="progress" style={{ height: '20px', width: '80px' }}>
                                      <div 
                                        className="progress-bar bg-warning" 
                                        role="progressbar" 
                                        style={{ width: `${Math.min(100, stage.urgency_score)}%` }}
                                      >
                                        {Math.round(stage.urgency_score)}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimization Suggestions */}
                  <div className="col-md-4">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Optimization Suggestions</h5>
                      </div>
                      <div className="card-body">
                        {resourceData.optimization_suggestions?.length > 0 ? (
                          resourceData.optimization_suggestions.map((suggestion, index) => (
                            <div key={index} className={`alert alert-${
                              suggestion.priority === 'high' ? 'warning' : 
                              suggestion.priority === 'medium' ? 'info' : 'secondary'
                            } alert-dismissible`}>
                              <h6 className="alert-heading">{suggestion.type}</h6>
                              <p className="mb-1">{suggestion.message}</p>
                              <small className="text-muted">{suggestion.impact}</small>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted">
                            <i className="fas fa-check-circle fa-3x mb-3"></i>
                            <p>No optimization suggestions at this time. Your resource allocation looks good!</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottlenecks */}
                    <div className="card mt-3">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Current Bottlenecks</h5>
                      </div>
                      <div className="card-body">
                        {resourceData.bottlenecks?.length > 0 ? (
                          resourceData.bottlenecks.map((bottleneck, index) => (
                            <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-medium">{bottleneck.stage}</span>
                              <span className="badge bg-danger">{bottleneck.productions_count} orders</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted text-center">
                            <i className="fas fa-thumbs-up fa-2x mb-2"></i>
                            <p>No bottlenecks detected!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline Modal */}
        {showTimelineModal && selectedProduction && timelineData && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Production Timeline - {selectedProduction.product_name}</h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowTimelineModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="production-timeline-detail">
                    <div className="timeline-header mb-4">
                      <div className="row">
                        <div className="col-md-6">
                          <strong>Overall Progress:</strong> {timelineData.overall_progress}%
                        </div>
                        <div className="col-md-6">
                          <strong>Status:</strong> 
                          <span className={`badge ms-2 ${
                            selectedProduction.status === 'Completed' ? 'bg-success' :
                            selectedProduction.status === 'In Progress' ? 'bg-primary' : 'bg-secondary'
                          }`}>
                            {selectedProduction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="timeline-processes">
                      {timelineData.timeline?.map((process, index) => (
                        <div key={index} className={`timeline-item ${process.status}`}>
                          <div className="timeline-marker"></div>
                          <div className="timeline-content">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1">{process.process_name}</h6>
                                <p className="text-muted mb-1">Order: {process.process_order}</p>
                                {process.started_at && (
                                  <small className="text-info">
                                    Started: {new Date(process.started_at).toLocaleString()}
                                  </small>
                                )}
                                {process.completed_at && (
                                  <small className="text-success d-block">
                                    Completed: {new Date(process.completed_at).toLocaleString()}
                                  </small>
                                )}
                                {process.notes && (
                                  <small className="text-muted d-block mt-1">
                                    Notes: {process.notes}
                                  </small>
                                )}
                              </div>
                              <div className="text-end">
                                <span className={`badge ${
                                  process.status === 'completed' ? 'bg-success' :
                                  process.status === 'in_progress' ? 'bg-primary' :
                                  process.status === 'delayed' ? 'bg-warning text-dark' : 'bg-secondary'
                                }`}>
                                  {process.status}
                                </span>
                                {process.is_delayed && (
                                  <div className="mt-1">
                                    <span className="badge bg-danger">Delayed</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Duration info */}
                            <div className="duration-info mt-2">
                              <div className="row">
                                <div className="col-6">
                                  <small className="text-muted">Estimated: {process.estimated_duration} min</small>
                                </div>
                                <div className="col-6">
                                  <small className="text-muted">Actual: {process.actual_duration || 'N/A'} min</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowTimelineModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default EnhancedProductionDashboard;