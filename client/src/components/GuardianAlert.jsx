import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, X, Phone, CheckCircle } from 'lucide-react';

const GuardianAlert = ({ alert, onResponse }) => {
  const isCheckIn = alert.type === 'checkin';
  const isSOS = alert.type === 'sos';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`glass rounded-2xl p-6 max-w-md w-full border-2 ${
          isSOS ? 'border-cyber-red shadow-red-500/50' : 'border-cyber-amber'
        }`}
        style={{
          boxShadow: isSOS 
            ? '0 0 40px rgba(239, 68, 68, 0.5), inset 0 0 40px rgba(239, 68, 68, 0.1)' 
            : '0 0 40px rgba(245, 158, 11, 0.3)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${isSOS ? 'bg-cyber-red/20 animate-pulse' : 'bg-cyber-amber/20'}`}>
              {isSOS ? (
                <AlertTriangle className="w-8 h-8 text-cyber-red" />
              ) : (
                <Shield className="w-8 h-8 text-cyber-amber" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isSOS ? 'SOS Alert!' : 'Guardian Check-In'}
              </h3>
              <p className="text-sm text-cyber-light">
                {isSOS ? 'Emergency situation detected' : 'Safety check required'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => onResponse('dismiss')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-cyber-light" />
          </button>
        </div>

        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <p className="text-lg mb-2">{alert.message}</p>
          {alert.safetyScore && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-cyber-light">Current zone safety:</span>
              <span className={`font-semibold ${
                alert.safetyScore >= 50 ? 'text-cyber-amber' : 'text-cyber-red'
              }`}>
                {alert.safetyScore}/100
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResponse('I\'m Safe')}
            className="py-3 px-4 rounded-lg bg-cyber-green/20 border border-cyber-green/50 text-cyber-green font-semibold flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            I'm Safe
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResponse('Send SOS')}
            className="py-3 px-4 rounded-lg bg-cyber-red/20 border border-cyber-red/50 text-cyber-red font-semibold flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            Send SOS
          </motion.button>
        </div>

        {isSOS && (
          <p className="mt-4 text-xs text-center text-cyber-light">
            Emergency contact will be notified immediately
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default GuardianAlert;