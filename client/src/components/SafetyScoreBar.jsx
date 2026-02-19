import React from 'react';

const SafetyScoreBar = ({ score, size = 'md', showLabel = true }) => {
  const getColor = () => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getLabel = () => {
    if (score >= 80) return 'Safe';
    if (score >= 50) return 'Moderate';
    return 'Risky';
  };

  const sizeClasses = {
    sm: { container: 'h-2', text: 'text-xs' },
    md: { container: 'h-3', text: 'text-sm' },
    lg: { container: 'h-4', text: 'text-base' }
  };

  const classes = sizeClasses[size];

  return (
    <div>
      <div className={`w-full ${classes.container} bg-white/10 rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ 
            width: `${score}%`,
            backgroundColor: getColor()
          }}
        />
      </div>
      {showLabel && (
        <div className={`flex justify-between mt-2 ${classes.text}`}>
          <span className="text-cyber-light">Safety Level</span>
          <span style={{ color: getColor() }} className="font-semibold">
            {getLabel()} ({score}%)
          </span>
        </div>
      )}
    </div>
  );
};

export default SafetyScoreBar;