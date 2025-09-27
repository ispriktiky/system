import React from 'react';

const StageProgressBar = ({ stages, currentStage, overallProgress }) => {
  const getStageStatus = (stage) => {
    if (stage.status === 'completed') return 'completed';
    if (stage.status === 'in_progress') return 'current';
    if (stage.status === 'delayed') return 'delayed';
    return 'pending';
  };

  const getStageColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'current': return 'bg-blue-500';
      case 'delayed': return 'bg-red-500';
      case 'pending': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  const getStageTextColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'current': return 'text-blue-600';
      case 'delayed': return 'text-red-600';
      case 'pending': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  if (!stages || stages.length === 0) {
    return null;
  }

  return (
    <div className=\"w-full\">
      {/* Overall Progress Bar */}
      <div className=\"mb-4\">
        <div className=\"flex justify-between items-center mb-2\">
          <span className=\"text-sm font-medium text-gray-700\">Overall Progress</span>
          <span className=\"text-sm font-medium text-gray-700\">{Math.round(overallProgress || 0)}%</span>
        </div>
        <div className=\"w-full bg-gray-200 rounded-full h-3\">
          <div 
            className=\"bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out\" 
            style={{ width: `${overallProgress || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Stage Steps */}
      <div className=\"relative\">
        <div className=\"flex justify-between items-center\">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage);
            const isLast = index === stages.length - 1;
            
            return (
              <div key={index} className=\"flex-1 relative\">
                {/* Connection Line */}
                {!isLast && (
                  <div 
                    className={`absolute top-3 left-6 right-0 h-0.5 ${
                      status === 'completed' || (index < stages.findIndex(s => getStageStatus(s) === 'current'))
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    }`}
                  ></div>
                )}
                
                {/* Stage Circle */}
                <div className=\"relative flex flex-col items-center\">
                  <div 
                    className={`w-6 h-6 rounded-full border-2 border-white shadow-md ${getStageColor(status)} relative z-10`}
                  >
                    {status === 'completed' && (
                      <svg className=\"w-4 h-4 text-white absolute top-0.5 left-0.5\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
                        <path fillRule=\"evenodd\" d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\" clipRule=\"evenodd\" />
                      </svg>
                    )}
                    {status === 'current' && (
                      <div className=\"w-2 h-2 bg-white rounded-full absolute top-1 left-1 animate-pulse\"></div>
                    )}
                    {status === 'delayed' && (
                      <span className=\"text-white text-xs font-bold absolute top-0 left-1.5\">!</span>
                    )}
                  </div>
                  
                  {/* Stage Name */}
                  <div className=\"mt-2 text-center\">
                    <p className={`text-xs font-medium ${getStageTextColor(status)}`}>
                      {stage.name}
                    </p>
                    {stage.progress > 0 && status !== 'completed' && (
                      <p className=\"text-xs text-gray-500\">{Math.round(stage.progress)}%</p>
                    )}
                    {stage.estimated_completion_at && status === 'current' && (
                      <p className=\"text-xs text-gray-400\">
                        Est: {new Date(stage.estimated_completion_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Stage Details */}
        {currentStage && (
          <div className=\"mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg\">
            <div className=\"flex items-center gap-2\">
              <div className=\"w-2 h-2 bg-blue-500 rounded-full animate-pulse\"></div>
              <span className=\"text-sm font-medium text-blue-800\">
                Currently: {currentStage}
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className=\"mt-4 flex flex-wrap gap-4 text-xs\">
          <div className=\"flex items-center gap-1\">
            <div className=\"w-3 h-3 bg-green-500 rounded-full\"></div>
            <span className=\"text-gray-600\">Completed</span>
          </div>
          <div className=\"flex items-center gap-1\">
            <div className=\"w-3 h-3 bg-blue-500 rounded-full\"></div>
            <span className=\"text-gray-600\">In Progress</span>
          </div>
          <div className=\"flex items-center gap-1\">
            <div className=\"w-3 h-3 bg-red-500 rounded-full\"></div>
            <span className=\"text-gray-600\">Delayed</span>
          </div>
          <div className=\"flex items-center gap-1\">
            <div className=\"w-3 h-3 bg-gray-300 rounded-full\"></div>
            <span className=\"text-gray-600\">Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageProgressBar;