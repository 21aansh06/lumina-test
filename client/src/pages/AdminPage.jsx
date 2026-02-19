import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Flame, Megaphone, Droplets, Activity,
  Terminal, AlertTriangle, CheckCircle, Clock, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

const AdminPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchIncidents();

    if (socket) {
      socket.on('scout_log', (data) => {
        addLog('SCOUT', data);
      });
      socket.on('verifier_log', (data) => {
        addLog('VERIFIER', data);
      });
      socket.on('guardian_log', (data) => {
        addLog('GUARDIAN', data);
      });
      socket.on('incident_update', (data) => {
        addLog('SYSTEM', { message: data.message, timestamp: data.timestamp });
        fetchStats();
        fetchIncidents();
      });
    }

    return () => {
      if (socket) {
        socket.off('scout_log');
        socket.off('verifier_log');
        socket.off('guardian_log');
        socket.off('incident_update');
      }
    };
  }, [socket]);

  const addLog = (agent, data) => {
    setLogs(prev => [{
      agent,
      step: data.step,
      message: data.message,
      timestamp: data.timestamp || new Date().toISOString()
    }, ...prev].slice(0, 50));
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const response = await api.get('/api/admin/incidents');
      setIncidents(response.data.incidents);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  };

  const simulateIncident = async (type) => {
    setLoading(true);
    
    const scenarios = {
      fire: 'Massive fire reported near Central Market with smoke visible for miles',
      protest: 'Large protest blocking Main Street causing major safety concerns and traffic disruption',
      flood: 'Severe flooding reported in downtown area, streets impassable'
    };

    try {
      const response = await api.post('/api/admin/simulate-incident', {
        text: scenarios[type],
        type
      });
      
      if (response.data.success) {
        addLog('ADMIN', { step: 'SIMULATE', message: `Triggered ${type} simulation`, timestamp: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      addLog('ERROR', { step: 'FAILED', message: error.message, timestamp: new Date().toISOString() });
    }
    
    setLoading(false);
  };

  const resolveIncident = async (incidentId) => {
    try {
      await api.patch(`/api/admin/incidents/${incidentId}/resolve`);
      fetchIncidents();
      fetchStats();
    } catch (error) {
      console.error('Failed to resolve incident:', error);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-cyber-light hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <Terminal className="w-6 h-6 text-cyber-cyan" />
              <span className="text-xl font-display font-bold text-gradient">Admin Panel</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Simulation Controls */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyber-cyan" />
            Incident Simulation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => simulateIncident('fire')}
              disabled={loading}
              className="glass glass-hover p-6 rounded-xl flex items-center gap-4 border-l-4 border-cyber-red"
            >
              <div className="p-3 rounded-lg bg-cyber-red/20">
                <Flame className="w-6 h-6 text-cyber-red" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Simulate Fire</div>
                <div className="text-sm text-cyber-light">Trigger fire incident</div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => simulateIncident('protest')}
              disabled={loading}
              className="glass glass-hover p-6 rounded-xl flex items-center gap-4 border-l-4 border-cyber-amber"
            >
              <div className="p-3 rounded-lg bg-cyber-amber/20">
                <Megaphone className="w-6 h-6 text-cyber-amber" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Simulate Protest</div>
                <div className="text-sm text-cyber-light">Trigger protest event</div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => simulateIncident('flood')}
              disabled={loading}
              className="glass glass-hover p-6 rounded-xl flex items-center gap-4 border-l-4 border-cyber-cyan"
            >
              <div className="p-3 rounded-lg bg-cyber-cyan/20">
                <Droplets className="w-6 h-6 text-cyber-cyan" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Simulate Flooding</div>
                <div className="text-sm text-cyber-light">Trigger flood event</div>
              </div>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Live Logs */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyber-cyan" />
                <h3 className="font-semibold">AI Agent Logs</h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-cyber-light">
                <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
                Live
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-cyber-light text-center py-8">
                  Waiting for agent activity...
                </div>
              ) : (
                logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`mb-2 ${
                      log.agent === 'SCOUT' ? 'text-cyber-cyan' :
                      log.agent === 'VERIFIER' ? 'text-cyber-purple' :
                      log.agent === 'GUARDIAN' ? 'text-cyber-amber' :
                      log.agent === 'ERROR' ? 'text-cyber-red' :
                      'text-white'
                    }`}
                  >
                    <span className="text-cyber-light">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="ml-2 font-bold">[{log.agent}]</span>
                    <span className="ml-2">{log.step}:</span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Active Incidents */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-cyber-amber" />
                <h3 className="font-semibold">Active Incidents</h3>
              </div>
              <button 
                onClick={fetchIncidents}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-cyber-light" />
              </button>
            </div>
            <div className="space-y-3 h-96 overflow-y-auto">
              {incidents.length === 0 ? (
                <div className="text-cyber-light text-center py-8">
                  No active incidents
                </div>
              ) : (
                incidents.map(incident => (
                  <motion.div
                    key={incident._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            incident.severity >= 7 ? 'bg-cyber-red' :
                            incident.severity >= 4 ? 'bg-cyber-amber' :
                            'bg-cyber-green'
                          }`} />
                          <span className="font-semibold capitalize">{incident.type}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                            Severity: {incident.severity}/10
                          </span>
                        </div>
                        <p className="text-sm text-cyber-light mt-1">{incident.locationName}</p>
                        <p className="text-xs text-cyber-light mt-1">{incident.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-cyber-light">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(incident.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => resolveIncident(incident._id)}
                        className="p-2 hover:bg-cyber-green/20 rounded-lg transition-colors"
                        title="Resolve incident"
                      >
                        <CheckCircle className="w-5 h-5 text-cyber-green" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* System Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Roads', value: stats?.totalRoads || 0 },
            { label: 'Active Incidents', value: stats?.activeIncidents || 0 },
            { label: 'City Safety Index', value: `${stats?.citySafetyIndex || 0}%` },
            { label: 'AI Agents', value: '3 Active' }
          ].map((stat, index) => (
            <div key={index} className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-display font-bold text-cyber-cyan">{stat.value}</div>
              <div className="text-sm text-cyber-light">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPage;