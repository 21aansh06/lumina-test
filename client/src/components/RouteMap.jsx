import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import routeApi from '../services/routeApi';

const ROUTE_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];
const ROUTE_WEIGHT = 5;

export default function RouteMap({ origin, destination, onRouteSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([40.7128, -74.006], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (origin && destination) {
      fetchRoutes(origin, destination);
    }
  }, [origin, destination]);

  async function fetchRoutes(origin, destination) {
    setLoading(true);
    setError(null);
    
    try {
      const data = await routeApi.calculateRoutes(origin, destination);
      setRoutes(data.routes);
      renderRoutes(data.routes);
      
      if (data.routes.length > 0) {
        fitMapToRoutes(data.routes);
        setSelectedRouteId(data.routes[0].id);
        onRouteSelect?.(data.routes[0]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate routes');
    } finally {
      setLoading(false);
    }
  }

  function renderRoutes(routeData) {
    routeLayersRef.current.forEach(layer => mapInstanceRef.current.removeLayer(layer));
    routeLayersRef.current = [];

    routeData.forEach((route, index) => {
      const coordinates = route.path.map(([lng, lat]) => [lat, lng]);
      
      const polyline = L.polyline(coordinates, {
        color: ROUTE_COLORS[index % ROUTE_COLORS.length],
        weight: ROUTE_WEIGHT,
        opacity: route.id === selectedRouteId ? 1 : 0.6
      }).addTo(mapInstanceRef.current);

      polyline.on('click', () => {
        setSelectedRouteId(route.id);
        highlightRoute(route.id);
        onRouteSelect?.(route);
      });

      polyline.bindTooltip(`${route.label}: ${route.duration_min} min`, {
        permanent: false,
        direction: 'center'
      });

      routeLayersRef.current.push(polyline);
    });
  }

  function highlightRoute(routeId) {
    routeLayersRef.current.forEach((layer, index) => {
      const route = routes[index];
      if (route.id === routeId) {
        layer.setStyle({ opacity: 1, weight: ROUTE_WEIGHT + 2 });
        layer.bringToFront();
      } else {
        layer.setStyle({ opacity: 0.5, weight: ROUTE_WEIGHT });
      }
    });
  }

  function fitMapToRoutes(routeData) {
    const allCoords = routeData.flatMap(r => r.path.map(([lng, lat]) => [lat, lng]));
    const bounds = L.latLngBounds(allCoords);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  }

  return (
    <div className="route-map-container">
      <div ref={mapRef} className="h-[500px] w-full rounded-lg shadow-lg" />
      
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Calculating routes...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
