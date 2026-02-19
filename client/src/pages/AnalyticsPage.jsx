import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, TrendingUp, AlertTriangle, MapPin, 
  Shield, Clock, Activity, BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell
} from 'recharts';

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/api/analytics/${user._id}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#00f5ff', '#7c3aed', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyber-cyan" />
      </div>
    );
  }

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
              <BarChart3 className="w-6 h-6 text-cyber-cyan" />
              <span className="text-xl font-display font-bold text-gradient">Analytics</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total Trips', value: analytics?.stats?.totalTrips || 0, icon: MapPin },
            { label: 'Safest Routes', value: analytics?.stats?.safestRouteSelections || 0, icon: Shield },
            { label: 'Reports', value: analytics?.stats?.feedbackCount || 0, icon: AlertTriangle },
            { label: 'Trust Score', value: `${analytics?.stats?.trustScore || 0}/100`, icon: Activity }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-5 h-5 text-cyber-cyan" />
                <span className="text-sm text-cyber-light">{stat.label}</span>
              </div>
              <div className="text-3xl font-display font-bold text-white">{stat.value}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Safety Trend */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-cyber-cyan" />
              <h3 className="font-semibold">Safety Score Trend (Last 7 Days)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics?.safetyTrend?.labels?.map((label, i) => ({
                    day: label,
                    score: analytics?.safetyTrend?.data?.[i] || 0
                  })) || []}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="#a0a0b0" />
                  <YAxis stroke="#a0a0b0" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12121a', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelStyle={{ color: '#a0a0b0' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#00f5ff" 
                    strokeWidth={2}
                    dot={{ fill: '#00f5ff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Incidents by Type */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-cyber-amber" />
              <h3 className="font-semibold">Incidents by Type (Last 30 Days)</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(analytics?.incidentsByType || {}).map(([type, count]) => ({
                    type: type.charAt(0).toUpperCase() + type.slice(1),
                    count
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="type" stroke="#a0a0b0" />
                  <YAxis stroke="#a0a0b0" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12121a', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Risk Factor Breakdown */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-cyber-purple" />
              <h3 className="font-semibold">Risk Factor Analysis</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={[
                    { factor: 'Lighting', score: 75, fullMark: 100 },
                    { factor: 'Crowd', score: 60, fullMark: 100 },
                    { factor: 'Shops', score: 80, fullMark: 100 },
                    { factor: 'Visibility', score: 65, fullMark: 100 },
                    { factor: 'Police', score: 70, fullMark: 100 }
                  ]}
                >
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="factor" stroke="#a0a0b0" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#a0a0b0" />
                  <Radar
                    name="Safety Factors"
                    dataKey="score"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.3}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#12121a', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* City Safety Index */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-cyber-green" />
              <h3 className="font-semibold">City Safety Index</h3>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Safe', value: 75 },
                        { name: 'Remaining', value: 25 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell fill="#00f5ff" />
                      <Cell fill="rgba(255,255,255,0.1)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-display font-bold text-cyber-cyan">75%</div>
                    <div className="text-sm text-cyber-light">Safe</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Trips */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-cyber-cyan" />
            <h3 className="font-semibold">Recent Trips</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="pb-3 text-sm text-cyber-light font-medium">Route</th>
                  <th className="pb-3 text-sm text-cyber-light font-medium">Safety Score</th>
                  <th className="pb-3 text-sm text-cyber-light font-medium">Time</th>
                  <th className="pb-3 text-sm text-cyber-light font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.recentTrips?.map((trip, index) => (
                  <tr key={index} className="border-b border-white/5 last:border-0">
                    <td className="py-4">
                      <div className="text-sm">{trip.origin} → {trip.destination}</div>
                      <div className="text-xs text-cyber-light">{trip.routeLabel}</div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        trip.safetyScore >= 80 ? 'bg-cyber-green/20 text-cyber-green' :
                        trip.safetyScore >= 50 ? 'bg-cyber-amber/20 text-cyber-amber' :
                        'bg-cyber-red/20 text-cyber-red'
                      }`}>
                        {trip.safetyScore}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-cyber-light">{trip.estimatedTime}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        trip.status === 'completed' ? 'bg-cyber-green/20 text-cyber-green' :
                        trip.status === 'ongoing' ? 'bg-cyber-cyan/20 text-cyber-cyan' :
                        'bg-cyber-red/20 text-cyber-red'
                      }`}>
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-cyber-light">
                      No trips recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsPage;