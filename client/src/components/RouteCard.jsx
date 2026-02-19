import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const RouteCard = ({ route, isSelected, onClick, index }) => {
  const getBadgeColor = () => {
    if (route.badge === 'SAFEST') return 'bg-cyber-green/20 text-cyber-green border-cyber-green/50';
    if (route.badge === 'MODERATE') return 'bg-cyber-amber/20 text-cyber-amber border-cyber-amber/50';
    return 'bg-cyber-red/20 text-cyber-red border-cyber-red/50';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-cyber-green';
    if (score >= 50) return 'text-cyber-amber';
    return 'text-cyber-red';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all ${
        isSelected 
          ? 'bg-cyber-cyan/10 border-2 border-cyber-cyan' 
          : 'glass glass-hover border border-white/10'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: route.color || '#00f5ff' }}
          />
          <div>
            <div className="font-semibold">{route.label}</div>
            <div className="flex items-center gap-1 text-sm text-cyber-light">
              <Clock className="w-3 h-3" />
              {route.estimatedTime}
            </div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor()}`}>
          {route.badge}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-2xl font-display font-bold ${getScoreColor(route.safetyScore)}`}>
              {route.safetyScore}
            </div>
            <div className="text-xs text-cyber-light">Safety Score</div>
          </div>
          {route.recommended && (
            <div className="flex items-center gap-1 text-cyber-green">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Recommended</span>
            </div>
          )}
        </div>
      </div>

      {/* Mini score bars */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-cyber-light w-16">Lighting</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyber-cyan rounded-full"
              style={{ width: `${route.lightingScore}%` }}
            />
          </div>
          <span className="text-xs w-8 text-right">{route.lightingScore}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-cyber-light w-16">Crowd</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyber-purple rounded-full"
              style={{ width: `${route.crowdScore}%` }}
            />
          </div>
          <span className="text-xs w-8 text-right">{route.crowdScore}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-cyber-light w-16">Shops</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyber-amber rounded-full"
              style={{ width: `${route.openShops}%` }}
            />
          </div>
          <span className="text-xs w-8 text-right">{route.openShops}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default RouteCard;