import React from 'react';

const ProductionStats = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Productions',
      value: stats.total_productions || 0,
      icon: '📊',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-500'
    },
    {
      title: 'In Progress',
      value: stats.in_progress || 0,
      icon: '⚡',
      gradient: 'from-yellow-500 to-orange-500',
      bgColor: 'from-yellow-50 to-orange-100',
      textColor: 'text-yellow-700',
      iconBg: 'bg-yellow-500'
    },
    {
      title: 'Completed Today',
      value: stats.completed_today || 0,
      icon: '✅',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      textColor: 'text-green-700',
      iconBg: 'bg-green-500'
    },
    {
      title: 'Delayed Orders',
      value: stats.delayed || 0,
      icon: '⚠️',
      gradient: 'from-red-500 to-red-600',
      bgColor: 'from-red-50 to-red-100',
      textColor: 'text-red-700',
      iconBg: 'bg-red-500'
    },
    {
      title: 'Tracked Items',
      value: stats.requiring_tracking || 0,
      icon: '🎯',
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      textColor: 'text-purple-700',
      iconBg: 'bg-purple-500'
    },
    {
      title: 'Alkansya Ready',
      value: stats.alkansya_ready || 0,
      icon: '🏺',
      gradient: 'from-indigo-500 to-indigo-600',
      bgColor: 'from-indigo-50 to-indigo-100',
      textColor: 'text-indigo-700',
      iconBg: 'bg-indigo-500'
    },
    {
      title: 'Avg. Completion Time',
      value: `${stats.average_completion_time || 0}h`,
      icon: '⏱️',
      gradient: 'from-teal-500 to-teal-600',
      bgColor: 'from-teal-50 to-teal-100',
      textColor: 'text-teal-700',
      iconBg: 'bg-teal-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {statCards.map((stat, index) => (
        <div 
          key={index} 
          className={`relative overflow-hidden bg-gradient-to-br ${stat.bgColor} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20`}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
          
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.iconBg} rounded-xl p-3 shadow-lg`}>
                <span className="text-2xl text-white">{stat.icon}</span>
              </div>
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${stat.gradient} shadow-sm`}></div>
            </div>
            
            <div>
              <p className={`text-3xl font-bold ${stat.textColor} leading-none`}>{stat.value}</p>
              <p className="text-sm font-medium text-gray-600 mt-2 leading-tight">{stat.title}</p>
            </div>
            
            {/* Subtle animation indicator */}
            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${stat.gradient} w-full transform transition-all duration-500`}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductionStats;