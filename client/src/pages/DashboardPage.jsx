import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Camera, BarChart3, Shield,
  AlertTriangle, Activity, Users, Zap, Settings,
  LogOut, Clock, ChevronRight, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import { geocodeAddress, searchPlaces, getOSRMRoute, calculateBoundingBox, calculateRouteSafetyMetrics } from "../services/openStreetMap.js"
import SafetyScoreBar from '../components/SafetyScoreBar';
import ReportModal from '../components/ReportModal';
import mockRoutes from '../utils/data';

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

  // Autocomplete state
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const originDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);
  const originWrapperRef = useRef(null);
  const destWrapperRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (originWrapperRef.current && !originWrapperRef.current.contains(e.target)) {
        setOriginSuggestions([]);
      }
      if (destWrapperRef.current && !destWrapperRef.current.contains(e.target)) {
        setDestinationSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOriginChange = useCallback((e) => {
    const value = e.target.value;
    setRouteData(prev => ({ ...prev, origin: value }));
    setOriginCoords(null);
    clearTimeout(originDebounceRef.current);
    if (value.length >= 3) {
      originDebounceRef.current = setTimeout(async () => {
        const results = await searchPlaces(value);
        setOriginSuggestions(results.slice(0, 5));
      }, 300);
    } else {
      setOriginSuggestions([]);
    }
  }, []);

  const handleDestChange = useCallback((e) => {
    const value = e.target.value;
    setRouteData(prev => ({ ...prev, destination: value }));
    setDestCoords(null);
    clearTimeout(destDebounceRef.current);
    if (value.length >= 3) {
      destDebounceRef.current = setTimeout(async () => {
        const results = await searchPlaces(value);
        setDestinationSuggestions(results.slice(0, 5));
      }, 300);
    } else {
      setDestinationSuggestions([]);
    }
  }, []);

  const selectOriginSuggestion = useCallback((place) => {
    setRouteData(prev => ({ ...prev, origin: place.display_name }));
    setOriginCoords({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    setOriginSuggestions([]);
  }, []);

  const selectDestSuggestion = useCallback((place) => {
    setRouteData(prev => ({ ...prev, destination: place.display_name }));
    setDestCoords({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    setDestinationSuggestions([]);
  }, []);

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

  const normalizeLocation = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleFindRoutes = async (e) => {
    e.preventDefault();

    if (!routeData.origin || !routeData.destination) {
      alert("Please enter both origin and destination");
      return;
    }

    const normalizedOrigin = normalizeLocation(routeData.origin);
    const normalizedDest = normalizeLocation(routeData.destination);

    // =========================
    // 🌍 LIVE ROUTING (OSRM + OVERPASS)
    // =========================
    console.log("Using LIVE routing...");

    setLoading(true);

    try {
      const [originData, destinationData] = await Promise.all([
        geocodeAddress(routeData.origin),
        geocodeAddress(routeData.destination)
      ]);

      const coordinates = [
        [originData.lng, originData.lat],
        [destinationData.lng, destinationData.lat]
      ];

      const osrmRoutes = await getOSRMRoute(coordinates);

      const allRouteCoords = osrmRoutes.flatMap(route => route.path);
      const bbox = calculateBoundingBox(allRouteCoords, 0.008);

      let streetLights = [], trafficSignals = [], shops = [];
      try {
        console.log(`[Overpass] Fetching safety data for BBox: ${bbox.join(",")}`);
        const safetyResponse = await api.get("/api/overpass", {
          params: { bbox: bbox.join(",") }
        });
        streetLights = safetyResponse.data.streetLights || [];
        trafficSignals = safetyResponse.data.trafficSignals || [];
        shops = safetyResponse.data.shops || [];
        console.log(`[Overpass] Data Loaded: ${streetLights.length} lights, ${trafficSignals.length} signals, ${shops.length} shops`);
      } catch (safetyErr) {
        console.warn('Safety data fetch failed:', safetyErr.message);
      }

      let enhancedRoutes = osrmRoutes.map((route, index) => {
        const safetyMetrics = calculateRouteSafetyMetrics(
          route.path,
          streetLights,
          trafficSignals,
          shops
        );

        const safetyScore = Math.round(
          (safetyMetrics.lightingScore * 0.4) +
          (safetyMetrics.crowdScore * 0.3) +
          (safetyMetrics.openShops * 0.3)
        );

        return {
          routeId: `route-${index}`,
          originalDistance: route.distance,
          originalDuration: route.duration,
          distance: (route.distance / 1000).toFixed(1) + " km",
          estimatedTime: route.duration >= 3600
            ? `${Math.floor(route.duration / 3600)}h ${Math.floor((route.duration % 3600) / 60)}m`
            : route.duration >= 60
              ? `${Math.floor(route.duration / 60)}m ${Math.round(route.duration % 60)}s`
              : `${Math.round(route.duration)}s`,
          estimatedMinutes: Math.round(route.duration / 60),
          safetyScore,
          lightingScore: safetyMetrics.lightingScore,
          crowdScore: safetyMetrics.crowdScore,
          openShops: safetyMetrics.openShops,
          streetLightsCount: safetyMetrics.streetLightsCount,
          trafficSignalsCount: safetyMetrics.trafficSignalsCount,
          shopsCount: safetyMetrics.shopsCount,
          path: route.path,
          geometry: route.geometry,
          aiNarrative: `This specific path provides ${safetyMetrics.streetLightsCount} street lights and ${safetyMetrics.shopsCount} active locations. Lighting coverage is ${safetyMetrics.lightingScore}% effective for this precise segment.`,
          riskFactors: safetyMetrics.lightingScore < 40
            ? ['Poorly lit segment', 'High risk at night']
            : safetyMetrics.lightingScore < 70
              ? ['Moderate visibility', 'Use caution']
              : ['Optimally lit', 'Safe for foot traffic'],
        };
      });

      // Step 1: Find the shortest distance and duration as baselines
      const shortestDistance = Math.min(...enhancedRoutes.map(r => r.originalDistance));
      const fastestDuration = Math.min(...enhancedRoutes.map(r => r.originalDuration));

      // Step 2: Filter out any route that is more than 30% longer than the shortest for candidates
      let candidateRoutes = enhancedRoutes.filter(r => r.originalDistance <= shortestDistance * 1.3);
      if (candidateRoutes.length === 0) candidateRoutes = enhancedRoutes;

      // Step 3: Calculate a "Final Ranking Score" for Safest (balancing safety and efficiency)
      candidateRoutes = candidateRoutes.map(route => {
        const timeOverhead = route.originalDuration / fastestDuration;
        const efficiencyScore = Math.max(0, 100 - (timeOverhead - 1) * 200);
        const combinedScore = Math.round((route.safetyScore * 0.7) + (efficiencyScore * 0.3));
        return { ...route, combinedScore };
      });

      // Step 4: Identify Safest and Fastest candidates
      const safestCandidateRaw = [...candidateRoutes].sort((a, b) => b.combinedScore - a.combinedScore)[0];
      const fastestCandidateRaw = [...enhancedRoutes].sort((a, b) => a.originalDuration - b.originalDuration)[0];

      // Step 5: DEEP FETCH for FASTEST ROUTE (Independent logic as requested)
      console.log("🚀 Performing dedicated POI fetch for Fastest Route...");
      let fastestRouteData = { ...fastestCandidateRaw };
      try {
        // Convert path to server-expected polyline format: "lat,lng lat,lng ..."
        const polylineStr = fastestCandidateRaw.path.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(' ');

        const dedicatedResponse = await api.get("/api/overpass", {
          params: { polyline: polylineStr, radius: 100 }
        });

        const dStreetLights = dedicatedResponse.data.streetLights || [];
        const dTrafficSignals = dedicatedResponse.data.trafficSignals || [];
        const dShops = dedicatedResponse.data.shops || [];

        const dMetrics = calculateRouteSafetyMetrics(
          fastestCandidateRaw.path,
          dStreetLights,
          dTrafficSignals,
          dShops
        );

        const dSafetyScore = Math.round(
          (dMetrics.lightingScore * 0.4) +
          (dMetrics.crowdScore * 0.3) +
          (dMetrics.openShops * 0.3)
        );

        fastestRouteData = {
          ...fastestRouteData,
          safetyScore: dSafetyScore,
          lightingScore: dMetrics.lightingScore,
          crowdScore: dMetrics.crowdScore,
          openShops: dMetrics.openShops,
          streetLightsCount: dMetrics.streetLightsCount,
          trafficSignalsCount: dMetrics.trafficSignalsCount,
          shopsCount: dMetrics.shopsCount,
          aiNarrative: `Fastest Path Analysis: This route offers ${dMetrics.streetLightsCount} lights and ${dMetrics.shopsCount} open venus focused specifically on the quickest path. Efficiency prioritized.`,
          isHighAccuracy: true
        };
        console.log(`✅ Dedicated fetch complete: ${dMetrics.streetLightsCount} lights for fastest route.`);
      } catch (err) {
        console.warn('Dedicated fetch for fastest route failed, using initial data:', err.message);
      }

      // Step 6: Finalise labels and combine into final array
      // We create TWO separate objects to ensure independent rendering even if they share same path
      const finalRoutes = [];

      // Add SAFEST Route
      finalRoutes.push({
        ...safestCandidateRaw,
        routeId: "route-safest",
        label: "Safest Route",
        badge: "SAFEST",
        color: "#10b981",
        recommended: true
      });

      // Add FASTEST Route
      finalRoutes.push({
        ...fastestRouteData,
        routeId: "route-fastest",
        label: "Fastest Route",
        badge: "FASTEST",
        color: "#ef4444",
        recommended: false
      });

      // Add one alternative if available and different
      const alternative = enhancedRoutes.find(r => r.routeId !== safestCandidateRaw.routeId && r.routeId !== fastestCandidateRaw.routeId);
      if (alternative) {
        finalRoutes.push({
          ...alternative,
          routeId: "route-alternative",
          label: "Alternative Route",
          badge: "MODERATE",
          color: "#f59e0b"
        });
      }

      navigate("/map", {
        state: {
          routes: finalRoutes,
          origin: originData,
          destination: destinationData,
          safetyData: { streetLights, trafficSignals, shops }
        }
      });

    } catch (error) {
      console.error("Routing failed:", error);

      const errorMessage = error.response?.status === 404
        ? "One of the addresses could not be located. Please try a simpler address or a main landmark."
        : "Failed to calculate routes. Please check your connection or try again.";

      alert(errorMessage);
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
                {/* ── Origin input with autocomplete ── */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-cyber-light">
                    <MapPin className="w-4 h-4 text-cyber-cyan" />
                    Pickup Location
                  </label>
                  <div className="relative" ref={originWrapperRef}>
                    <input
                      type="text"
                      id="origin-input"
                      value={routeData.origin}
                      onChange={handleOriginChange}
                      placeholder="Enter starting location (e.g., Times Square, NYC)"
                      className="input-cyber w-full pr-10"
                      autoComplete="off"
                      required
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-cyan/40 pointer-events-none" />
                    <AnimatePresence>
                      {originSuggestions.length > 0 && (
                        <motion.ul
                          id="origin-suggestions"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
                          style={{
                            background: 'rgba(18,18,26,0.97)',
                            border: '1px solid rgba(0,245,255,0.25)',
                            boxShadow: '0 8px 32px rgba(0,245,255,0.12)'
                          }}
                        >
                          {originSuggestions.map((place, idx) => (
                            <li
                              key={place.place_id ?? idx}
                              onMouseDown={() => selectOriginSuggestion(place)}
                              className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-150"
                              style={{ borderBottom: idx < originSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-cyber-cyan" />
                              <span className="text-sm text-white/90 leading-snug line-clamp-2">{place.display_name}</span>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-cyber-cyan/50 to-cyber-purple/50" />
                </div>

                {/* ── Destination input with autocomplete ── */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-cyber-light">
                    <MapPin className="w-4 h-4 text-cyber-purple" />
                    Destination
                  </label>
                  <div className="relative" ref={destWrapperRef}>
                    <input
                      type="text"
                      id="destination-input"
                      value={routeData.destination}
                      onChange={handleDestChange}
                      placeholder="Enter destination (e.g., Central Park, NYC)"
                      className="input-cyber w-full pr-10"
                      autoComplete="off"
                      required
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-purple/40 pointer-events-none" />
                    <AnimatePresence>
                      {destinationSuggestions.length > 0 && (
                        <motion.ul
                          id="destination-suggestions"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
                          style={{
                            background: 'rgba(18,18,26,0.97)',
                            border: '1px solid rgba(124,58,237,0.3)',
                            boxShadow: '0 8px 32px rgba(124,58,237,0.12)'
                          }}
                        >
                          {destinationSuggestions.map((place, idx) => (
                            <li
                              key={place.place_id ?? idx}
                              onMouseDown={() => selectDestSuggestion(place)}
                              className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-150"
                              style={{ borderBottom: idx < destinationSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-cyber-purple" />
                              <span className="text-sm text-white/90 leading-snug line-clamp-2">{place.display_name}</span>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
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