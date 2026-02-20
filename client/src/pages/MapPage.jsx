import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Navigation, Clock, Shield, AlertTriangle,
  Play, Square, AlertCircle, CheckCircle, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MapView from '../components/MapView';
import RouteCard from '../components/RouteCard';
import GuardianAlert from '../components/GuardianAlert';
import FeedbackForm from '../components/FeedbackForm';

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket, startTrip, endTrip, sendLocation } = useSocket();

  const [routes, setRoutes] = useState(location.state?.routes || []);
  const [origin] = useState(location.state?.origin || null);
  const [destination] = useState(location.state?.destination || null);
  const [safetyData] = useState(location.state?.safetyData || { streetLights: [], trafficSignals: [], shops: [] });
  const [selectedRoute, setSelectedRoute] = useState(location.state?.routes?.[0] || null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [guardianAlert, setGuardianAlert] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Listen for socket events
  React.useEffect(() => {
    if (!socket) return;

    socket.on('CHECK_IN', (data) => {
      setGuardianAlert({ type: 'checkin', ...data });
    });

    socket.on('SOS_ALERT', (data) => {
      setGuardianAlert({ type: 'sos', ...data });
    });

    socket.on('incident_update', (data) => {
      console.log('Incident update:', data);
    });

    return () => {
      socket.off('CHECK_IN');
      socket.off('SOS_ALERT');
      socket.off('incident_update');
    };
  }, [socket]);

  const handleStartTrip = () => {
    if (!selectedRoute) return;

    const tripId = `trip-${Date.now()}`;
    setActiveTrip({
      id: tripId,
      route: selectedRoute,
      startTime: new Date()
    });

    startTrip(tripId);

    // Start location tracking simulation
    const interval = setInterval(() => {
      if (selectedRoute?.path?.length > 0) {
        const randomIndex = Math.floor(Math.random() * selectedRoute.path.length);
        const coord = selectedRoute.path[randomIndex];
        sendLocation(coord[0], coord[1]);
      }
    }, 10000);

    setActiveTrip(prev => ({ ...prev, interval }));
  };

  const handleEndTrip = () => {
    if (activeTrip?.interval) {
      clearInterval(activeTrip.interval);
    }
    endTrip();
    setActiveTrip(null);
    setShowFeedback(true);
  };

  const handleGuardianResponse = (response) => {
    setGuardianAlert(null);
  };

  return (
    <div className="min-h-screen bg-cyber-black flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/10 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-cyber-light hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-4">
              {origin && destination && (
                <>
                  <span className="text-sm text-cyber-light truncate max-w-[150px]">{origin.name || 'Origin'}</span>
                  <Navigation className="w-4 h-4 text-cyber-cyan" />
                  <span className="text-sm text-cyber-light truncate max-w-[150px]">{destination.name || 'Destination'}</span>
                </>
              )}
            </div>
            {activeTrip && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-green/20 border border-cyber-green/50">
                <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
                <span className="text-sm text-cyber-green">Trip Active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Map - Using Leaflet with OpenStreetMap */}
        <div className="flex-1 relative">
          <MapView
            routes={routes}
            selectedRoute={selectedRoute}
            onRouteSelect={setSelectedRoute}
            origin={origin}
            destination={destination}
            showSafetyData={true}
            initialSafetyData={safetyData}
          />
        </div>

        {/* Route Selection Panel */}
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-[500px] glass border-l border-white/10 overflow-y-auto z-20"
        >
          <div className="p-6">
            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyber-cyan" />
              Route Comparison
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Left Column: Safest */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-cyber-green uppercase tracking-widest px-1">Safest Route</h3>
                {routes
                  .filter(r => r.badge.includes("SAFEST"))
                  .map((route, index) => (
                    <RouteCard
                      key={route.routeId}
                      route={route}
                      isSelected={selectedRoute?.routeId === route.routeId}
                      onClick={() => setSelectedRoute(route)}
                      index={index}
                    />
                  ))}
              </div>

              {/* Right Column: Fastest */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-cyber-red uppercase tracking-widest px-1">Fastest Route</h3>
                {routes
                  .filter(r => r.badge.includes("FASTEST"))
                  .map((route, index) => (
                    <RouteCard
                      key={route.routeId}
                      route={route}
                      isSelected={selectedRoute?.routeId === route.routeId}
                      onClick={() => setSelectedRoute(route)}
                      index={index}
                    />
                  ))}
              </div>
            </div>

            {/* Alternatives section if any */}
            {routes.filter(r => r.badge === "ALTERNATIVE" || r.badge === "MODERATE").length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-bold text-cyber-light uppercase tracking-widest mb-4 px-1">Alternative Options</h3>
                <div className="space-y-4">
                  {routes.filter(r => r.badge === "ALTERNATIVE" || r.badge === "MODERATE").map((route, index) => (
                    <RouteCard
                      key={route.routeId}
                      route={route}
                      isSelected={selectedRoute?.routeId === route.routeId}
                      onClick={() => setSelectedRoute(route)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedRoute && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-6 pt-6 border-t border-white/10"
              >
                <div className="glass rounded-xl p-4 mb-4">
                  <h3 className="font-semibold mb-2">Safety Analysis</h3>
                  <p className="text-sm text-cyber-light mb-3">{selectedRoute.aiNarrative}</p>

                  {/* Street lights info */}
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-cyber-cyan/10 p-2 rounded text-center">
                      <div className="text-cyber-cyan font-bold">{selectedRoute.streetLightsCount || 0}</div>
                      <div className="text-cyber-light">Street Lights</div>
                    </div>
                    <div className="bg-cyber-green/10 p-2 rounded text-center">
                      <div className="text-cyber-green font-bold">{selectedRoute.shopsCount || 0}</div>
                      <div className="text-cyber-light">Shops</div>
                    </div>
                    <div className="bg-cyber-amber/10 p-2 rounded text-center">
                      <div className="text-cyber-amber font-bold">{selectedRoute.trafficSignalsCount || 0}</div>
                      <div className="text-cyber-light">Traffic Signals</div>
                    </div>
                  </div>

                  {selectedRoute.riskFactors?.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs text-cyber-light uppercase tracking-wider">Risk Factors</span>
                      <ul className="mt-1 space-y-1">
                        {selectedRoute.riskFactors.map((factor, idx) => (
                          <li key={idx} className="text-sm flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-cyber-amber" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {!activeTrip ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartTrip}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Safe Trip
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleEndTrip}
                    className="w-full py-3 px-6 rounded-lg bg-cyber-red hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Square className="w-5 h-5" />
                    End Trip
                  </motion.button>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Guardian Alert */}
      <AnimatePresence>
        {guardianAlert && (
          <GuardianAlert
            alert={guardianAlert}
            onResponse={handleGuardianResponse}
          />
        )}
      </AnimatePresence>

      {/* Feedback Form */}
      {showFeedback && (
        <FeedbackForm
          trip={activeTrip}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
};

export default MapPage;