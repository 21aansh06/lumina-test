import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Navigation, Camera, BarChart3, Shield, 
  AlertTriangle, Activity, Users, Zap, Settings,
  LogOut, Clock, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import { geocodeAddress, getOSRMRoute, getStreetLights, getTrafficSignals, getShops, calculateBoundingBox, calculateRouteSafetyMetrics } from '../services/openStreetMap';
import SafetyScoreBar from '../components/SafetyScoreBar';
import ReportModal from '../components/ReportModal';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [routeData, setRouteData] = useState({
    origin: '',
    destination: ''
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleFindRoutes = async (e) => {
    e.preventDefault();
    if (!routeData.origin || !routeData.destination) {
      alert('Please enter both origin and destination');
      return;
    }
    
    setLoading(true);
    try {
      // Step 1: Geocode addresses to coordinates using OpenStreetMap/Nominatim
      console.log('Geocoding addresses...');
      const [originData, destinationData] = await Promise.all([
        geocodeAddress(routeData.origin),
        geocodeAddress(routeData.destination)
      ]);

      console.log('Origin:', originData);
      console.log('Destination:', destinationData);

      // Step 2: Get routes from OSRM
      console.log('Calculating routes with OSRM...');
      const coordinates = [
        [originData.lng, originData.lat],
        [destinationData.lng, destinationData.lat]
      ];
      
      const osrmRoutes = await getOSRMRoute(coordinates);
      console.log('OSRM routes:', osrmRoutes);

      // Step 3: Fetch safety data (street lights, traffic signals, shops) using Overpass API
      console.log('Fetching safety data from Overpass API...');
      const allRouteCoords = osrmRoutes.flatMap(route => route.path);
      const bbox = calculateBoundingBox(allRouteCoords, 0.02);
      
      const [streetLights, trafficSignals, shops] = await Promise.all([
        getStreetLights(bbox),
        getTrafficSignals(bbox),
        getShops(bbox)
      ]);

      console.log(`Found ${streetLights.length} street lights`);
      console.log(`Found ${trafficSignals.length} traffic signals`);
      console.log(`Found ${shops.length} shops`);

      // Step 4: Calculate safety scores for each route
      const enhancedRoutes = osrmRoutes.map((route, index) => {
        const safetyMetrics = calculateRouteSafetyMetrics(
          route.path,
          streetLights,
          trafficSignals,
          shops
        );

        // Calculate overall safety score
        const safetyScore = Math.round(
          (safetyMetrics.lightingScore * 0.4) + 
          (safetyMetrics.crowdScore * 0.3) + 
          (safetyMetrics.openShops * 0.3)
        );

        // Determine route label and badge
        let label, badge, color;
        if (index === 0) {
          label = 'Route A - Safest';
          badge = 'SAFEST';
          color = '#10b981';
        } else if (index === 1) {
          label = 'Route B - Moderate';
          badge = 'MODERATE';
          color = '#f59e0b';
        } else {
          label = 'Route C - Fastest';
          badge = 'RISKY';
          color = '#ef4444';
        }

        // Convert duration from seconds to minutes
        const durationMinutes = Math.round(route.duration / 60);

        return {
          routeId: `route-${String.fromCharCode(97 + index)}`,
          label,
          badge,
          color,
          estimatedTime: `${durationMinutes} mins`,
          estimatedMinutes: durationMinutes,
          distance: route.distance,
          safetyScore,
          lightingScore: safetyMetrics.lightingScore,
          crowdScore: safetyMetrics.crowdScore,
          openShops: safetyMetrics.openShops,
          streetLightsCount: safetyMetrics.streetLightsCount,
          trafficSignalsCount: safetyMetrics.trafficSignalsCount,
          shopsCount: safetyMetrics.shopsCount,
          path: route.path,
          geometry: route.geometry,
          aiNarrative: `This route has ${safetyMetrics.streetLightsCount} street lights and ${safetyMetrics.shopsCount} nearby shops. Lighting coverage is ${safetyMetrics.lightingScore > 70 ? 'excellent' : safetyMetrics.lightingScore > 50 ? 'moderate' : 'limited'}.`,
          riskFactors: safetyMetrics.lightingScore < 50 ? ['Limited street lighting', 'Poor visibility'] : 
                      safetyMetrics.lightingScore < 70 ? ['Moderate lighting', 'Some dark areas'] : 
                      ['Well-lit areas', 'Good visibility'],
          recommended: index === 0
        };
      });

      // Sort by safety score
      enhancedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
      
      // Update badges after sorting
      enhancedRoutes[0].badge = 'SAFEST';
      enhancedRoutes[0].recommended = true;
      if (enhancedRoutes[1]) enhancedRoutes[1].badge = 'MODERATE';
      if (enhancedRoutes[2]) enhancedRoutes[2].badge = 'RISKY';

      console.log('Enhanced routes with safety data:', enhancedRoutes);

      // Navigate to map with route data
      navigate('/map', { 
        state: { 
          routes: enhancedRoutes,
          origin: { 
            lat: originData.lat, 
            lng: originData.lng, 
            name: originData.displayName 
          },
          destination: { 
            lat: destinationData.lat, 
            lng: destinationData.lng, 
            name: destinationData.displayName 
          },
          safetyData: {
            streetLights,
            trafficSignals,
            shops
          }
        } 
      });
    } catch (error) {
      console.error('Route calculation failed:', error);
      alert('Failed to calculate routes: ' + (error.message || 'Unknown error'));
    }
    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-cyber-black">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyber-cyan" />
              <span className="text-xl font-display font-bold text-gradient">Lumina</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-cyber-green animate-pulse' : 'bg-cyber-red'}`} />
                <span className="text-sm text-cyber-light">{connected ? 'Live' : 'Offline'}</span>
              </div>
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-cyber-cyan/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-cyber-cyan">
                      {user?.name?.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium hidden md:block">{user?.name}</span>
                <button onClick={logout} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <LogOut className="w-5 h-5 text-cyber-light" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold mb-2">
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-cyber-light">
            Stay safe tonight. Let OpenStreetMap & OSRM find the safest route using real street light data.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Route Input Panel */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Navigation className="w-5 h-5 text-cyber-cyan" />
                <h2 className="text-xl font-semibold">Plan Your Journey</h2>
              </div>

              <form onSubmit={handleFindRoutes} className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-cyber-light">
                    <MapPin className="w-4 h-4 text-cyber-cyan" />
                    Pickup Location
                  </label>
                  <input
                    type="text"
                    value={routeData.origin}
                    onChange={(e) => setRouteData({ ...routeData, origin: e.target.value })}
                    placeholder="Enter starting location (e.g., Times Square, NYC)"
                    className="input-cyber w-full"
                    required
                  />
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-cyber-cyan/50 to-cyber-purple/50" />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-cyber-light">
                    <MapPin className="w-4 h-4 text-cyber-purple" />
                    Destination
                  </label>
                  <input
                    type="text"
                    value={routeData.destination}
                    onChange={(e) => setRouteData({ ...routeData, destination: e.target.value })}
                    placeholder="Enter destination (e.g., Central Park, NYC)"
                    className="input-cyber w-full"
                    required
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Analyzing Street Lights & Routes...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Find Safe Routes (OSRM + Overpass)</span>
                    </>
                  )}
                </motion.button>

                <p className="text-xs text-cyber-light mt-2 text-center">
                  Uses OpenStreetMap, OSRM, and Overpass API to analyze street lights, traffic signals, and shops
                </p>
              </form>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowReportModal(true)}
                className="glass glass-hover p-4 rounded-xl flex items-center gap-3 text-left"
              >
                <div className="p-3 rounded-lg bg-cyber-amber/10">
                  <Camera className="w-5 h-5 text-cyber-amber" />
                </div>
                <div>
                  <div className="font-medium">Report Unsafe Area</div>
                  <div className="text-sm text-cyber-light">Upload photo & location</div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/analytics')}
                className="glass glass-hover p-4 rounded-xl flex items-center gap-3 text-left"
              >
                <div className="p-3 rounded-lg bg-cyber-purple/10">
                  <BarChart3 className="w-5 h-5 text-cyber-purple" />
                </div>
                <div>
                  <div className="font-medium">View Analytics</div>
                  <div className="text-sm text-cyber-light">Safety insights & trends</div>
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* Status Panel */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* City Safety Index */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyber-cyan" />
                  City Safety Index
                </h3>
                <span className="text-2xl font-display font-bold text-cyber-cyan">
                  {stats?.citySafetyIndex || '--'}%
                </span>
              </div>
              <SafetyScoreBar score={stats?.citySafetyIndex || 0} size="lg" />
            </div>

            {/* Active Incidents */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-cyber-amber" />
                  Active Incidents
                </h3>
                <span className="text-2xl font-display font-bold text-cyber-amber">
                  {stats?.activeIncidents || 0}
                </span>
              </div>
              <p className="text-sm text-cyber-light">
                Real-time monitoring via OpenStreetMap data
              </p>
            </div>

            {/* Agent Status */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyber-purple" />
                AI Agent Status
              </h3>
              <div className="space-y-3">
                {['Scout', 'Verifier', 'Guardian'].map((agent, index) => (
                  <div key={agent} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
                      <span className="text-sm">{agent}</span>
                    </div>
                    <span className="text-xs text-cyber-green px-2 py-1 rounded-full bg-cyber-green/10">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyber-light" />
                System Status
              </h3>
              <div className="space-y-3 text-sm text-cyber-light">
                <div className="flex justify-between">
                  <span>Monitored Roads</span>
                  <span className="text-white">{stats?.totalRoads || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>OSRM Routing</span>
                  <span className="text-cyber-green">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Overpass API</span>
                  <span className="text-cyber-green">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update</span>
                  <span className="text-white">Just now</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
};

export default DashboardPage;