import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Header';
import {
  getProductions,
  updateProductionProcess,
  getDashboardData
} from '../../api/productionApi';
import './RealTimeProductionTracker.css';

const RealTimeProductionTracker = () => {
  const navigate = useNavigate();
  const [productions, setProductions] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Real-time connection refs
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);

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

  useEffect(() => {
    initializeRealTimeTracking();
    loadInitialData();
    
    return () => {
      cleanupConnections();
    };
  }, []);

  const initializeRealTimeTracking = () => {
    // Try WebSocket connection first
    connectWebSocket();
    
    // Fallback to polling if WebSocket fails
    pollingIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        loadProductionData();
      }
    }, 5000); // Poll every 5 seconds as fallback
  };

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/production`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError('');
        
        // Clear polling since we have WebSocket
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealTimeUpdate(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
        
        // Resume polling as fallback
        if (!pollingIntervalRef.current) {
          pollingIntervalRef.current = setInterval(loadProductionData, 5000);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Real-time connection error. Using fallback mode.');
      };
      
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      setError('Real-time connection failed. Using polling mode.');
    }
  };

  const handleRealTimeUpdate = (data) => {
    switch (data.type) {
      case 'PRODUCTION_UPDATED':
        updateProductionInList(data.production);
        addNotification({
          id: Date.now(),
          type: 'info',
          message: `Production #${data.production.id} updated to ${data.production.stage}`,
          timestamp: new Date(),
          productionId: data.production.id
        });
        break;
        
      case 'PROCESS_UPDATED':
        updateProcessInProduction(data.productionId, data.process);
        addNotification({
          id: Date.now(),
          type: 'success',
          message: `${data.process.process_name} ${data.process.status} for production #${data.productionId}`,
          timestamp: new Date(),
          productionId: data.productionId
        });
        break;
        
      case 'PRODUCTION_COMPLETED':
        updateProductionInList(data.production);
        addNotification({
          id: Date.now(),
          type: 'success',
          message: `🎉 Production #${data.production.id} completed!`,
          timestamp: new Date(),
          productionId: data.production.id
        });
        break;
        
      case 'PRODUCTION_DELAYED':
        updateProductionInList(data.production);
        addNotification({
          id: Date.now(),
          type: 'warning',
          message: `⚠️ Production #${data.production.id} delayed in ${data.production.stage}`,
          timestamp: new Date(),
          productionId: data.production.id
        });
        break;
        
      case 'BOTTLENECK_DETECTED':
        addNotification({
          id: Date.now(),
          type: 'danger',
          message: `🚨 Bottleneck detected in ${data.stage} - ${data.count} productions backed up`,
          timestamp: new Date(),
          stage: data.stage
        });
        break;
        
      default:
        console.log('Unknown real-time update type:', data.type);
    }
  };

  const updateProductionInList = (updatedProduction) => {
    setProductions(prev => 
      prev.map(production => 
        production.id === updatedProduction.id ? { ...production, ...updatedProduction } : production
      )
    );
  };

  const updateProcessInProduction = (productionId, updatedProcess) => {
    setProductions(prev => 
      prev.map(production => {
        if (production.id === productionId) {
          const updatedProcesses = production.processes?.map(process =>
            process.id === updatedProcess.id ? { ...process, ...updatedProcess } : process
          ) || [];
          
          return { ...production, processes: updatedProcesses };
        }
        return production;
      })
    );
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep only last 50 notifications
    
    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 10000);
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productionsData, dashboardDataResponse] = await Promise.all([
        loadProductionData(),
        getDashboardData({ date_range: 1 })
      ]);
      
      setDashboardData(dashboardDataResponse);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load production data');
    } finally {
      setLoading(false);
    }
  };

  const loadProductionData = async () => {
    try {
      const data = await getProductions();
      // Filter out alkansya products as they don't need tracking
      const trackableProductions = data.filter(prod => 
        !prod.product_name?.toLowerCase().includes('alkansya')
      );
      setProductions(trackableProductions);
      return trackableProductions;
    } catch (err) {
      console.error('Failed to load productions:', err);
      throw err;
    }
  };

  const cleanupConnections = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };

  const handleProcessStatusUpdate = async (productionId, processId, newStatus) => {
    try {
      await updateProductionProcess(productionId, processId, {
        status: newStatus,
        notes: `Status updated to ${newStatus} at ${new Date().toLocaleString()}`
      });
      
      // The real-time update will be handled by WebSocket/polling
      addNotification({
        id: Date.now(),
        type: 'info',
        message: `Process status updated to ${newStatus}`,
        timestamp: new Date(),
        productionId
      });
    } catch (err) {
      console.error('Failed to update process status:', err);
      setError('Failed to update process status');
    }
  };

  const calculateOverallProgress = (processes) => {
    if (!processes || processes.length === 0) return 0;
    const completedCount = processes.filter(p => p.status === 'completed').length;
    const inProgressCount = processes.filter(p => p.status === 'in_progress').length;
    return ((completedCount + inProgressCount * 0.5) / processes.length) * 100;
  };

  const getActiveProductionsByStage = () => {
    const stageGroups = PROCESS_STAGES.reduce((acc, stage) => {
      acc[stage] = productions.filter(p => p.stage === stage && p.status !== 'Completed');
      return acc;
    }, {});
    
    return stageGroups;
  };

  const getRecentNotifications = () => {
    return notifications.slice(0, 10); // Show last 10 notifications
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5>Initializing Real-Time Tracking...</h5>
          </div>
        </div>
      </AppLayout>
    );
  }

  const stageGroups = getActiveProductionsByStage();

  return (
    <AppLayout>
      <div className="real-time-tracker">
        {/* Header */}
        <div className="tracker-header">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/admin/production')}>
                ← Back to Production
              </button>
              <h1 className="display-6 mb-0">Real-Time Production Tracking</h1>
              <p className="text-muted mb-0">Live monitoring of woodcraft production processes</p>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="connection-status">
                <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
                <span className="status-text">
                  {isConnected ? 'Live' : 'Polling Mode'}
                </span>
              </div>
              <button 
                className="btn btn-outline-primary"
                onClick={() => window.location.reload()}
              >
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-warning alert-dismissible fade show">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}
        </div>

        <div className="row g-4">
          {/* Live Production Board */}
          <div className="col-lg-9">
            <div className="card production-board">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-broadcast-tower me-2"></i>
                  Live Production Board
                  <span className="badge bg-primary ms-2">{productions.filter(p => p.status !== 'Completed').length}</span>
                </h5>
              </div>
              <div className="card-body">
                <div className="production-stages">
                  {PROCESS_STAGES.map(stage => (
                    <div key={stage} className="stage-column">
                      <div 
                        className="stage-header"
                        style={{ backgroundColor: STAGE_COLORS[stage] }}
                      >
                        <h6 className="stage-title">{stage}</h6>
                        <span className="stage-count">{stageGroups[stage]?.length || 0}</span>
                      </div>
                      
                      <div className="stage-items">
                        {stageGroups[stage]?.map(production => (
                          <div 
                            key={production.id} 
                            className={`production-item ${production.priority}`}
                            style={{ borderLeftColor: STAGE_COLORS[stage] }}
                          >
                            <div className="production-header">
                              <div className="production-title">
                                {production.product_name}
                              </div>
                              <div className="production-badges">
                                <span className={`badge priority-${production.priority}`}>
                                  {production.priority}
                                </span>
                                <span className={`badge status-${production.status?.toLowerCase().replace(' ', '-')}`}>
                                  {production.status}
                                </span>
                              </div>
                            </div>
                            
                            <div className="production-details">
                              <div className="detail-item">
                                <i className="fas fa-hashtag"></i>
                                <span>#{production.id}</span>
                              </div>
                              <div className="detail-item">
                                <i className="fas fa-boxes"></i>
                                <span>{production.quantity} units</span>
                              </div>
                              {production.estimated_completion_date && (
                                <div className="detail-item">
                                  <i className="fas fa-calendar-alt"></i>
                                  <span>{new Date(production.estimated_completion_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="progress-container">
                              <div className="progress" style={{ height: '6px' }}>
                                <div 
                                  className="progress-bar bg-success" 
                                  role="progressbar" 
                                  style={{ width: `${calculateOverallProgress(production.processes)}%` }}
                                ></div>
                              </div>
                              <small className="progress-text">
                                {Math.round(calculateOverallProgress(production.processes))}% complete
                              </small>
                            </div>
                            
                            {/* Process Controls */}
                            {production.processes && (
                              <div className="process-controls">
                                {production.processes
                                  .filter(p => p.process_name === stage)
                                  .map(process => (
                                    <div key={process.id} className="process-control">
                                      <select
                                        className="form-select form-select-sm"
                                        value={process.status}
                                        onChange={(e) => handleProcessStatusUpdate(
                                          production.id, 
                                          process.id, 
                                          e.target.value
                                        )}
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="delayed">Delayed</option>
                                      </select>
                                    </div>
                                  ))}
                              </div>
                            )}
                            
                            {/* Time in Stage */}
                            <div className="time-in-stage">
                              <small className="text-muted">
                                In stage: {Math.floor(Math.random() * 24)} hours
                              </small>
                            </div>
                          </div>
                        ))}
                        
                        {stageGroups[stage]?.length === 0 && (
                          <div className="empty-stage">
                            <i className="fas fa-check-circle text-success fa-2x mb-2"></i>
                            <p className="text-muted mb-0">No items in this stage</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="col-lg-3">
            <div className="card notifications-panel">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-bell me-2"></i>
                  Live Updates
                  <span className="badge bg-danger ms-2">{notifications.length}</span>
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="notifications-list">
                  {getRecentNotifications().map(notification => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.type}`}
                    >
                      <button
                        className="btn-close notification-close"
                        onClick={() => removeNotification(notification.id)}
                      ></button>
                      
                      <div className="notification-content">
                        <div className="notification-message">
                          {notification.message}
                        </div>
                        <div className="notification-time">
                          {notification.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {notification.productionId && (
                        <div className="notification-action">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              // Scroll to production item
                              const element = document.querySelector(`[data-production-id="${notification.productionId}"]`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {notifications.length === 0 && (
                    <div className="empty-notifications">
                      <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                      <p className="text-muted mb-0">No new updates</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card mt-3">
              <div className="card-header">
                <h6 className="card-title mb-0">
                  <i className="fas fa-chart-pie me-2"></i>
                  Quick Stats
                </h6>
              </div>
              <div className="card-body">
                <div className="quick-stats">
                  <div className="stat-item">
                    <div className="stat-value text-primary">
                      {productions.filter(p => p.status === 'In Progress').length}
                    </div>
                    <div className="stat-label">Active</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value text-success">
                      {productions.filter(p => p.status === 'Completed').length}
                    </div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value text-warning">
                      {productions.filter(p => p.priority === 'urgent').length}
                    </div>
                    <div className="stat-label">Urgent</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value text-danger">
                      {productions.filter(p => 
                        p.processes?.some(process => process.status === 'delayed')
                      ).length}
                    </div>
                    <div className="stat-label">Delayed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default RealTimeProductionTracker;