import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeAddress, getOSRMRoute, getStreetLights, getTrafficSignals, getShops, calculateBoundingBox, calculateRouteSafetyMetrics } from '../services/openStreetMap';

// Fix Leaflet default icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const streetLightIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color: #fbbf24; width: 8px; height: 8px; border-radius: 50%; border: 2px solid #f59e0b;'></div>",
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const shopIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color: #10b981; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #059669;'></div>",
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const trafficSignalIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color: #ef4444; width: 8px; height: 8px; border-radius: 50%; border: 2px solid #dc2626;'></div>",
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Map bounds fitter component
const MapBounds = ({ routes }) => {
  const map = useMap();
  
  useEffect(() => {
    if (routes && routes.length > 0 && routes[0].path) {
      const bounds = L.latLngBounds(routes[0].path.map(coord => [coord[0], coord[1]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, map]);
  
  return null;
};

const MapView = ({ 
  routes = [], 
  selectedRoute, 
  onRouteSelect, 
  origin, 
  destination,
  showSafetyData = true 
}) => {
  const [safetyData, setSafetyData] = useState({
    streetLights: [],
    trafficSignals: [],
    shops: []
  });
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState([40.7128, -74.0060]); // Default NYC

  // Fetch safety data when routes change
  useEffect(() => {
    const fetchSafetyData = async () => {
      if (!routes.length || !showSafetyData) return;
      
      setLoading(true);
      try {
        // Calculate bounding box from all routes
        const allCoords = routes.flatMap(route => route.path || []);
        if (allCoords.length > 0) {
          const bbox = calculateBoundingBox(allCoords, 0.02);
          
          // Fetch data in parallel
          const [lights, signals, shopsData] = await Promise.all([
            getStreetLights(bbox),
            getTrafficSignals(bbox),
            getShops(bbox)
          ]);
          
          setSafetyData({
            streetLights: lights.slice(0, 100), // Limit to 100 markers for performance
            trafficSignals: signals.slice(0, 50),
            shops: shopsData.slice(0, 50)
          });
        }
      } catch (error) {
        console.error('Error fetching safety data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSafetyData();
  }, [routes, showSafetyData]);

  // Get route color based on safety score
  const getRouteColor = (route) => {
    if (!route) return '#00f5ff';
    if (route.safetyScore >= 80) return '#10b981'; // Green
    if (route.safetyScore >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  // Memoize route polylines
  const routePolylines = useMemo(() => {
    return routes.map((route, index) => ({
      id: route.routeId || index,
      positions: route.path?.map(coord => [coord[0], coord[1]]) || [],
      color: getRouteColor(route),
      weight: selectedRoute?.routeId === route.routeId ? 8 : 4,
      opacity: selectedRoute?.routeId === route.routeId ? 1 : 0.6,
      dashArray: route.routeId === 'route-c' ? '10, 10' : null
    }));
  }, [routes, selectedRoute]);

  // Default center if no routes
  useEffect(() => {
    if (routes.length > 0 && routes[0].path && routes[0].path.length > 0) {
      const midIndex = Math.floor(routes[0].path.length / 2);
      setCenter([routes[0].path[midIndex][0], routes[0].path[midIndex][1]]);
    }
  }, [routes]);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route Polylines */}
        {routePolylines.map((polyline) => (
          <Polyline
            key={polyline.id}
            positions={polyline.positions}
            pathOptions={{
              color: polyline.color,
              weight: polyline.weight,
              opacity: polyline.opacity,
              dashArray: polyline.dashArray
            }}
            eventHandlers={{
              click: () => {
                const route = routes.find(r => r.routeId === polyline.id);
                if (route) onRouteSelect?.(route);
              }
            }}
          />
        ))}

        {/* Street Lights */}
        {showSafetyData && safetyData.streetLights.map((light) => (
          <Marker
            key={`light-${light.id}`}
            position={[light.lat, light.lng]}
            icon={streetLightIcon}
          >
            <Popup>
              <div className="text-xs">
                <strong>Street Light</strong><br />
                ID: {light.id}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Traffic Signals */}
        {showSafetyData && safetyData.trafficSignals.map((signal) => (
          <Marker
            key={`signal-${signal.id}`}
            position={[signal.lat, signal.lng]}
            icon={trafficSignalIcon}
          >
            <Popup>
              <div className="text-xs">
                <strong>Traffic Signal</strong><br />
                ID: {signal.id}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Shops */}
        {showSafetyData && safetyData.shops.map((shop) => (
          <Marker
            key={`shop-${shop.id}`}
            position={[shop.lat, shop.lng]}
            icon={shopIcon}
          >
            <Popup>
              <div className="text-xs">
                <strong>{shop.tags.name || 'Shop'}</strong><br />
                Type: {shop.tags.shop || shop.tags.amenity || 'Commercial'}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Origin Marker */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]}>
            <Popup>Origin: {origin.name}</Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>Destination: {destination.name}</Popup>
          </Marker>
        )}

        {/* Fit bounds to routes */}
        <MapBounds routes={routes} />
      </MapContainer>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
          Loading safety data...
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-xs space-y-2">
        <div className="font-semibold mb-2">Safety Data</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-yellow-500"></div>
          <span>Street Lights ({safetyData.streetLights.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-600"></div>
          <span>Open Shops ({safetyData.shops.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-600"></div>
          <span>Traffic Signals ({safetyData.trafficSignals.length})</span>
        </div>
      </div>

      {/* Route info */}
      {selectedRoute && (
        <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg text-xs">
          <div className="font-semibold mb-1">{selectedRoute.label}</div>
          <div>Safety Score: {selectedRoute.safetyScore}/100</div>
          <div>Time: {selectedRoute.estimatedTime}</div>
          {selectedRoute.lightingScore && (
            <div>Lighting: {selectedRoute.lightingScore}/100</div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapView;