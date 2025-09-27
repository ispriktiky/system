import React, { useState } from 'react';
import StageProgressBar from './StageProgressBar';

const ProductionCard = ({ production, onStageAction }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not started';
    return new Date(dateString).toLocaleString();
  };

  const getCurrentStageLog = () => {
    if (!production.stage_logs || !production.requires_tracking) return null;
    
    return production.stage_logs.find(log => 
      log.production_stage?.name === production.current_stage && 
      log.status !== 'completed'
    );
  };

  const canStartStage = (stageLog) => {
    return stageLog && stageLog.status === 'pending';
  };

  const canCompleteStage = (stageLog) => {
    return stageLog && stageLog.status === 'in_progress';
  };

  const currentStageLog = getCurrentStageLog();

  return (
    <div className=\"p-6 hover:bg-gray-50 transition-colors\">
      <div className=\"flex justify-between items-start mb-4\">
        <div className=\"flex-1\">
          <div className=\"flex items-center gap-3 mb-2\">
            <h3 className=\"text-lg font-semibold text-gray-900\">{production.product_name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(production.status)}`}>
              {production.status}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(production.priority)}`}>
              {production.priority?.toUpperCase()}
            </span>
            {production.product_type && (
              <span className=\"px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800\">
                {production.product_type.toUpperCase()}
              </span>
            )}
          </div>
          
          <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3\">
            <div>
              <span className=\"font-medium\">Batch:</span> {production.production_batch_number || 'N/A'}
            </div>
            <div>
              <span className=\"font-medium\">Quantity:</span> {production.quantity}
            </div>
            <div>
              <span className=\"font-medium\">Started:</span> {formatDateTime(production.production_started_at)}
            </div>
            <div>
              <span className=\"font-medium\">Est. Completion:</span> {formatDate(production.estimated_completion_date)}
            </div>
          </div>

          {/* Current Stage */}
          <div className=\"mb-3\">
            <span className=\"text-sm font-medium text-gray-700\">Current Stage: </span>
            <span className=\"text-sm text-blue-600 font-medium\">{production.current_stage}</span>
            {production.is_delayed && (
              <span className=\"ml-2 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800\">
                {production.delay_hours}h delayed
              </span>
            )}
          </div>

          {/* Progress Bar for tracked items */}
          {production.requires_tracking && production.stage_progress && (
            <div className=\"mb-4\">
              <StageProgressBar 
                stages={production.stage_progress.stages}
                currentStage={production.current_stage}
                overallProgress={production.overall_progress}
              />
            </div>
          )}

          {/* Quick Actions */}
          {production.requires_tracking && currentStageLog && (
            <div className=\"flex gap-2 mb-4\">
              {canStartStage(currentStageLog) && (
                <button
                  onClick={() => onStageAction(production.id, 'start', { 
                    stage_id: currentStageLog.id,
                    notes: 'Stage started from dashboard'
                  })}
                  className=\"px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors\"
                >
                  Start Stage
                </button>
              )}
              
              {canCompleteStage(currentStageLog) && (
                <button
                  onClick={() => onStageAction(production.id, 'complete', { 
                    stage_id: currentStageLog.id,
                    notes: 'Stage completed from dashboard'
                  })}
                  className=\"px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors\"
                >
                  Complete Stage
                </button>
              )}

              {currentStageLog.status === 'in_progress' && (
                <button
                  onClick={() => {
                    const progress = prompt('Enter progress percentage (0-100):', currentStageLog.progress_percentage || '0');
                    if (progress !== null && !isNaN(progress)) {
                      onStageAction(production.id, 'progress', {
                        stage_id: currentStageLog.id,
                        progress: Math.min(100, Math.max(0, parseFloat(progress))),
                        notes: 'Progress updated from dashboard'
                      });
                    }
                  }}
                  className=\"px-4 py-2 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 transition-colors\"
                >
                  Update Progress
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          {production.notes && (
            <div className=\"text-sm text-gray-600\">
              <span className=\"font-medium\">Notes:</span> {production.notes}
            </div>
          )}
        </div>

        <div className=\"flex items-center gap-2 ml-4\">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className=\"px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors\"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <div className=\"border-t border-gray-200 pt-4 mt-4\">
          {production.requires_tracking && production.stage_logs ? (
            <div className=\"space-y-4\">
              <h4 className=\"font-semibold text-gray-900\">Production Stages</h4>
              <div className=\"space-y-3\">
                {production.stage_logs
                  .sort((a, b) => a.production_stage?.order_sequence - b.production_stage?.order_sequence)
                  .map((stageLog, index) => (
                  <div key={stageLog.id} className=\"border border-gray-200 rounded-lg p-4\">
                    <div className=\"flex justify-between items-start mb-2\">
                      <div className=\"flex-1\">
                        <h5 className=\"font-medium text-gray-900\">{stageLog.production_stage?.name}</h5>
                        <p className=\"text-sm text-gray-600\">{stageLog.production_stage?.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stageLog.status === 'completed' ? 'bg-green-100 text-green-800' :
                        stageLog.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        stageLog.status === 'delayed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {stageLog.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className=\"grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 mb-2\">
                      <div>Started: {formatDateTime(stageLog.started_at)}</div>
                      <div>Completed: {formatDateTime(stageLog.completed_at)}</div>
                      <div>Progress: {stageLog.progress_percentage || 0}%</div>
                      <div>Worker: {stageLog.assigned_worker?.name || 'Not assigned'}</div>
                    </div>

                    {stageLog.progress_percentage > 0 && (
                      <div className=\"w-full bg-gray-200 rounded-full h-2 mb-2\">
                        <div 
                          className=\"bg-blue-600 h-2 rounded-full transition-all duration-300\" 
                          style={{ width: `${stageLog.progress_percentage || 0}%` }}
                        ></div>
                      </div>
                    )}

                    {stageLog.notes && (
                      <p className=\"text-sm text-gray-700 italic\">{stageLog.notes}</p>
                    )}

                    {stageLog.issues && stageLog.issues.length > 0 && (
                      <div className=\"mt-2\">
                        <span className=\"text-xs font-medium text-red-600\">Issues: </span>
                        <span className=\"text-xs text-red-600\">{stageLog.issues.join(', ')}</span>
                      </div>
                    )}

                    {/* Quick Actions for this specific stage */}
                    <div className=\"flex gap-2 mt-2\">
                      {stageLog.status === 'pending' && (
                        <button
                          onClick={() => onStageAction(production.id, 'start', { 
                            stage_id: stageLog.id,
                            notes: `Started ${stageLog.production_stage?.name}`
                          })}
                          className=\"px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors\"
                        >
                          Start
                        </button>
                      )}
                      
                      {stageLog.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => onStageAction(production.id, 'complete', { 
                              stage_id: stageLog.id,
                              notes: `Completed ${stageLog.production_stage?.name}`
                            })}
                            className=\"px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors\"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => {
                              const progress = prompt('Enter progress percentage (0-100):', stageLog.progress_percentage || '0');
                              if (progress !== null && !isNaN(progress)) {
                                onStageAction(production.id, 'progress', {
                                  stage_id: stageLog.id,
                                  progress: Math.min(100, Math.max(0, parseFloat(progress))),
                                  notes: `Progress updated for ${stageLog.production_stage?.name}`
                                });
                              }
                            }}
                            className=\"px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors\"
                          >
                            Update Progress
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className=\"text-center py-4 text-gray-500\">
              <p>🏺 Alkansya products don't require detailed tracking.</p>
              <p className=\"text-sm\">These items are ready for packaging and delivery.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductionCard;