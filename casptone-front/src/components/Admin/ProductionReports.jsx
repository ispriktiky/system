import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../Header';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  getEfficiencyReport,
  getCapacityUtilization,
  getPerformanceMetrics,
  getDashboardData,
  exportProductionCsv
} from '../../api/productionApi';
import './ProductionReports.css';

const ProductionReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Report data states
  const [efficiencyReport, setEfficiencyReport] = useState(null);
  const [capacityReport, setCapacityReport] = useState(null);
  const [performanceReport, setPerformanceReport] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('comprehensive');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    loadAllReports();
  }, [dateRange, selectedPeriod]);

  const loadAllReports = async () => {
    try {
      setLoading(true);
      setError('');

      const [efficiency, capacity, performance, dashboard] = await Promise.all([
        getEfficiencyReport(dateRange.startDate, dateRange.endDate),
        getCapacityUtilization(30),
        getPerformanceMetrics(selectedPeriod),
        getDashboardData({ date_range: 30 })
      ]);

      setEfficiencyReport(efficiency);
      setCapacityReport(capacity);
      setPerformanceReport(performance);
      setDashboardData(dashboard);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    // Create a comprehensive report content
    const reportContent = generateReportContent();
    
    // Create a new window with the report content
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Production Report - ${dateRange.startDate} to ${dateRange.endDate}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #007bff; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #007bff;
              margin-bottom: 10px;
            }
            .report-title {
              font-size: 20px;
              margin-bottom: 5px;
            }
            .report-period {
              font-size: 14px;
              color: #666;
            }
            .section { 
              margin-bottom: 30px; 
              break-inside: avoid;
            }
            .section-title { 
              font-size: 18px; 
              font-weight: bold; 
              color: #007bff; 
              border-bottom: 2px solid #eee; 
              padding-bottom: 10px; 
              margin-bottom: 15px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .kpi-card {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              border-left: 4px solid #007bff;
            }
            .kpi-value {
              font-size: 24px;
              font-weight: bold;
              color: #007bff;
              margin-bottom: 5px;
            }
            .kpi-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .table th, .table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .table th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            .efficiency-high { color: #28a745; font-weight: bold; }
            .efficiency-medium { color: #ffc107; font-weight: bold; }
            .efficiency-low { color: #dc3545; font-weight: bold; }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${reportContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateReportContent = () => {
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <div class="header">
        <div class="company-name">Unick Enterprises Inc.</div>
        <div class="report-title">Production Tracking System - Comprehensive Report</div>
        <div class="report-period">Period: ${dateRange.startDate} to ${dateRange.endDate}</div>
        <div class="report-period">Generated on: ${currentDate}</div>
      </div>

      ${generateKPISection()}
      ${generateEfficiencySection()}
      ${generateCapacitySection()}
      ${generateWorkloadSection()}
      ${generateRecommendationsSection()}

      <div class="footer">
        <p>This report was generated automatically by the Production Tracking System</p>
        <p>For questions or clarifications, please contact the Production Management Team</p>
      </div>
    `;
  };

  const generateKPISection = () => {
    if (!performanceReport) return '';
    
    const kpis = performanceReport.kpis || {};
    
    return `
      <div class="section">
        <div class="section-title">Key Performance Indicators</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-value">${kpis.throughput || 0}</div>
            <div class="kpi-label">Total Throughput</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${kpis.average_lead_time_days || 0} days</div>
            <div class="kpi-label">Average Lead Time</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${kpis.quality_rate_percentage || 0}%</div>
            <div class="kpi-label">Quality Rate</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${kpis.on_time_delivery_percentage || 0}%</div>
            <div class="kpi-label">On-Time Delivery</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${kpis.resource_utilization_percentage || 0}%</div>
            <div class="kpi-label">Resource Utilization</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${performanceReport.production_summary?.completion_rate || 0}%</div>
            <div class="kpi-label">Completion Rate</div>
          </div>
        </div>
      </div>
    `;
  };

  const generateEfficiencySection = () => {
    if (!efficiencyReport) return '';
    
    let tableRows = '';
    if (efficiencyReport.process_efficiency) {
      tableRows = efficiencyReport.process_efficiency.map(process => {
        const efficiencyClass = process.efficiency_percentage >= 80 ? 'efficiency-high' : 
                              process.efficiency_percentage >= 60 ? 'efficiency-medium' : 'efficiency-low';
        return `
          <tr>
            <td>${process.process_name}</td>
            <td>${process.avg_actual_duration || 0} min</td>
            <td>${process.avg_estimated_duration || 0} min</td>
            <td class="${efficiencyClass}">${process.efficiency_percentage || 0}%</td>
            <td>${process.total_completed || 0}</td>
            <td>${process.delayed_count || 0}</td>
          </tr>
        `;
      }).join('');
    }
    
    return `
      <div class="section">
        <div class="section-title">Process Efficiency Analysis</div>
        <table class="table">
          <thead>
            <tr>
              <th>Process</th>
              <th>Avg Actual Duration</th>
              <th>Avg Estimated Duration</th>
              <th>Efficiency %</th>
              <th>Completed</th>
              <th>Delayed</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  };

  const generateCapacitySection = () => {
    if (!capacityReport) return '';
    
    const summary = capacityReport.summary || {};
    
    return `
      <div class="section">
        <div class="section-title">Capacity Utilization Summary</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-value">${summary.average_utilization || 0}%</div>
            <div class="kpi-label">Average Utilization</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${summary.peak_utilization || 0}%</div>
            <div class="kpi-label">Peak Utilization</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${summary.lowest_utilization || 0}%</div>
            <div class="kpi-label">Lowest Utilization</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${summary.daily_capacity_hours || 8} hrs</div>
            <div class="kpi-label">Daily Capacity</div>
          </div>
        </div>
      </div>
    `;
  };

  const generateWorkloadSection = () => {
    if (!dashboardData?.workload_by_stage) return '';
    
    let tableRows = '';
    if (dashboardData.workload_by_stage) {
      tableRows = dashboardData.workload_by_stage.map(stage => `
        <tr>
          <td>${stage.stage}</td>
          <td>${stage.count}</td>
          <td>${stage.total_quantity}</td>
          <td>${Math.round(stage.avg_days_in_stage || 0)} days</td>
        </tr>
      `).join('');
    }
    
    return `
      <div class="section">
        <div class="section-title">Current Workload by Stage</div>
        <table class="table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Active Orders</th>
              <th>Total Units</th>
              <th>Avg Time in Stage</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  };

  const generateRecommendationsSection = () => {
    const recommendations = generateRecommendations();
    
    return `
      <div class="section">
        <div class="section-title">Recommendations & Action Items</div>
        <ul>
          ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `;
  };

  const generateRecommendations = () => {
    const recommendations = [];
    
    // Efficiency-based recommendations
    if (efficiencyReport?.process_efficiency) {
      const lowEfficiencyProcesses = efficiencyReport.process_efficiency
        .filter(p => (p.efficiency_percentage || 0) < 70);
      
      if (lowEfficiencyProcesses.length > 0) {
        recommendations.push(
          `Improve efficiency in ${lowEfficiencyProcesses.map(p => p.process_name).join(', ')} processes - currently below 70% efficiency`
        );
      }
    }
    
    // Capacity-based recommendations
    if (capacityReport?.summary) {
      const avgUtilization = capacityReport.summary.average_utilization || 0;
      if (avgUtilization < 60) {
        recommendations.push('Consider increasing production volume or reallocating resources - capacity utilization is below 60%');
      } else if (avgUtilization > 90) {
        recommendations.push('High capacity utilization detected - consider expanding capacity or optimizing workflows');
      }
    }
    
    // Performance-based recommendations
    if (performanceReport?.kpis) {
      const onTimeDelivery = performanceReport.kpis.on_time_delivery_percentage || 0;
      if (onTimeDelivery < 85) {
        recommendations.push('Focus on improving on-time delivery - currently below industry standard of 85%');
      }
      
      const qualityRate = performanceReport.kpis.quality_rate_percentage || 0;
      if (qualityRate < 95) {
        recommendations.push('Implement additional quality control measures - quality rate should be above 95%');
      }
    }
    
    // Workload-based recommendations
    if (dashboardData?.workload_by_stage) {
      const bottleneckStage = dashboardData.workload_by_stage
        .sort((a, b) => (b.avg_days_in_stage || 0) - (a.avg_days_in_stage || 0))[0];
      
      if (bottleneckStage && (bottleneckStage.avg_days_in_stage || 0) > 3) {
        recommendations.push(
          `Address bottleneck in ${bottleneckStage.stage} stage - average time exceeds 3 days`
        );
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Production metrics are within acceptable ranges - continue current operations');
      recommendations.push('Monitor trends closely and maintain quality standards');
      recommendations.push('Consider implementing predictive maintenance to prevent future issues');
    }
    
    return recommendations;
  };

  const exportToCSV = () => {
    exportProductionCsv({
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      type: 'comprehensive'
    });
  };

  const getEfficiencyTrendData = () => {
    if (!efficiencyReport?.process_efficiency) return [];
    
    return efficiencyReport.process_efficiency.map(process => ({
      name: process.process_name.replace(/\s+/g, '\n'),
      efficiency: process.efficiency_percentage || 0,
      completed: process.total_completed || 0,
      delayed: process.delayed_count || 0
    }));
  };

  const getCapacityTrendData = () => {
    if (!capacityReport?.daily_utilization) return [];
    
    return capacityReport.daily_utilization.slice(-7).map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      utilization: day.utilization_percentage || 0,
      productions: day.productions_count || 0
    }));
  };

  const getWorkloadData = () => {
    if (!dashboardData?.workload_by_stage) return [];
    
    return dashboardData.workload_by_stage.map((stage, index) => ({
      stage: stage.stage.replace(/\s+/g, '\n'),
      count: stage.count || 0,
      quantity: stage.total_quantity || 0,
      avgDays: stage.avg_days_in_stage || 0,
      color: ['#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#2ecc71', '#1abc9c'][index % 6]
    }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5>Generating Production Reports...</h5>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="production-reports">
        {/* Header */}
        <div className="reports-header">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/admin/production')}>
                ← Back to Production
              </button>
              <h1 className="display-6 mb-0">Production Reports & Analytics</h1>
              <p className="text-muted mb-0">Comprehensive production performance analysis</p>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-success" onClick={exportToCSV}>
                <i className="fas fa-file-csv me-1"></i>
                Export CSV
              </button>
              <button className="btn btn-primary" onClick={generatePDF}>
                <i className="fas fa-file-pdf me-1"></i>
                Generate PDF Report
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

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Period</label>
                  <select
                    className="form-select"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="quarter">Quarter</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Report Type</label>
                  <select
                    className="form-select"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="comprehensive">Comprehensive</option>
                    <option value="efficiency">Efficiency Only</option>
                    <option value="capacity">Capacity Only</option>
                    <option value="performance">Performance Only</option>
                  </select>
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={loadAllReports}
                  >
                    <i className="fas fa-sync-alt me-1"></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="row g-4">
          {/* KPI Summary */}
          {performanceReport && (
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-chart-line me-2"></i>
                    Key Performance Indicators
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-md-2">
                      <div className="kpi-metric">
                        <div className="kpi-value text-primary">
                          {performanceReport.kpis?.throughput || 0}
                        </div>
                        <div className="kpi-label">Throughput</div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="kpi-metric">
                        <div className="kpi-value text-info">
                          {performanceReport.kpis?.average_lead_time_days || 0} days
                        </div>
                        <div className="kpi-label">Avg Lead Time</div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="kpi-metric">
                        <div className="kpi-value text-success">
                          {performanceReport.kpis?.quality_rate_percentage || 0}%
                        </div>
                        <div className="kpi-label">Quality Rate</div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="kpi-metric">
                        <div className="kpi-value text-warning">
                          {performanceReport.kpis?.on_time_delivery_percentage || 0}%
                        </div>
                        <div className="kpi-label">On-Time Delivery</div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="kpi-metric">
                        <div className="kpi-value text-danger">
                          {performanceReport.kpis?.resource_utilization_percentage || 0}%
                        </div>
                        <div className="kpi-label">Resource Utilization</div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="kpi-metric">
                        <div className="kpi-value text-secondary">
                          {performanceReport.production_summary?.completion_rate || 0}%
                        </div>
                        <div className="kpi-label">Completion Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Process Efficiency Chart */}
          {efficiencyReport && (
            <div className="col-lg-8">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-cogs me-2"></i>
                    Process Efficiency Analysis
                  </h5>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={getEfficiencyTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="efficiency" fill="#3498db" name="Efficiency %" />
                      <Bar dataKey="completed" fill="#27ae60" name="Completed" />
                      <Bar dataKey="delayed" fill="#e74c3c" name="Delayed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Process Efficiency Table */}
          {efficiencyReport && (
            <div className="col-lg-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-table me-2"></i>
                    Efficiency Metrics
                  </h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Process</th>
                          <th>Efficiency</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {efficiencyReport.process_efficiency?.map((process, index) => (
                          <tr key={index}>
                            <td className="small">{process.process_name}</td>
                            <td>
                              <span className={`badge ${
                                (process.efficiency_percentage || 0) >= 80 ? 'bg-success' :
                                (process.efficiency_percentage || 0) >= 60 ? 'bg-warning text-dark' : 'bg-danger'
                              }`}>
                                {process.efficiency_percentage || 0}%
                              </span>
                            </td>
                            <td>
                              <div className="small">
                                <div>✅ {process.total_completed || 0}</div>
                                <div>⏰ {process.delayed_count || 0}</div>
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
          )}

          {/* Capacity Utilization */}
          {capacityReport && (
            <div className="col-lg-6">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-chart-area me-2"></i>
                    Capacity Utilization Trend
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="metric-small">
                          <div className="metric-value text-success">
                            {capacityReport.summary?.average_utilization || 0}%
                          </div>
                          <div className="metric-label">Average</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="metric-small">
                          <div className="metric-value text-warning">
                            {capacityReport.summary?.peak_utilization || 0}%
                          </div>
                          <div className="metric-label">Peak</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="metric-small">
                          <div className="metric-value text-info">
                            {capacityReport.summary?.lowest_utilization || 0}%
                          </div>
                          <div className="metric-label">Lowest</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={getCapacityTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="utilization" 
                        stroke="#e74c3c" 
                        fill="#e74c3c" 
                        fillOpacity={0.3}
                        name="Utilization %" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Workload Distribution */}
          {dashboardData?.workload_by_stage && (
            <div className="col-lg-6">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-tasks me-2"></i>
                    Workload Distribution
                  </h5>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getWorkloadData()}
                        dataKey="count"
                        nameKey="stage"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ stage, count }) => `${stage}: ${count}`}
                      >
                        {getWorkloadData().map((entry, index) => (
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
          )}

          {/* Recommendations */}
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-lightbulb me-2"></i>
                  Recommendations & Action Items
                </h5>
              </div>
              <div className="card-body">
                <div className="recommendations-list">
                  {generateRecommendations().map((recommendation, index) => (
                    <div key={index} className="recommendation-item">
                      <div className="recommendation-icon">
                        <i className="fas fa-arrow-right text-primary"></i>
                      </div>
                      <div className="recommendation-text">
                        {recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-chart-bar me-2"></i>
                  Report Summary
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <div className="summary-stat">
                      <div className="stat-icon bg-primary">
                        <i className="fas fa-calendar-alt text-white"></i>
                      </div>
                      <div className="stat-content">
                        <h6>Report Period</h6>
                        <p className="mb-0">{dateRange.startDate} to {dateRange.endDate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="summary-stat">
                      <div className="stat-icon bg-success">
                        <i className="fas fa-check-circle text-white"></i>
                      </div>
                      <div className="stat-content">
                        <h6>Productions Analyzed</h6>
                        <p className="mb-0">{performanceReport?.production_summary?.total_started || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="summary-stat">
                      <div className="stat-icon bg-info">
                        <i className="fas fa-clock text-white"></i>
                      </div>
                      <div className="stat-content">
                        <h6>Report Generated</h6>
                        <p className="mb-0">{new Date().toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="summary-stat">
                      <div className="stat-icon bg-warning">
                        <i className="fas fa-star text-white"></i>
                      </div>
                      <div className="stat-content">
                        <h6>Overall Rating</h6>
                        <p className="mb-0">
                          {performanceReport?.kpis?.quality_rate_percentage >= 90 ? 'Excellent' :
                           performanceReport?.kpis?.quality_rate_percentage >= 80 ? 'Good' : 
                           performanceReport?.kpis?.quality_rate_percentage >= 70 ? 'Fair' : 'Needs Improvement'}
                        </p>
                      </div>
                    </div>
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

export default ProductionReports;