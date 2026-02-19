import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  getSafetyData,
  cancelPendingOverpassRequest,
  filterSafetyDataForRoute
} from "../services/openStreetMap";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const streetLightIcon = L.divIcon({
  html: `<div style="background:#fbbf24;width:10px;height:10px;border-radius:50%;border:2px solid #b45309"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const shopIcon = L.divIcon({
  html: `<div style="background:#10b981;width:12px;height:12px;border-radius:50%;border:2px solid #047857"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const trafficSignalIcon = L.divIcon({
  html: `<div style="background:#ef4444;width:10px;height:10px;border-radius:50%;border:2px solid #b91c1c"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const MAX_MARKERS = 150;

const MapBounds = ({ routes }) => {
  const map = useMap();

  useEffect(() => {
    if (routes.length > 0 && routes[0].path?.length > 0) {
      const bounds = L.latLngBounds(routes[0].path);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [routes, map]);

  return null;
};

const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
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
  const [lastFingerprint, setLastFingerprint] = useState("");

  const fetchIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const primaryRoute = routes[0];
  const routeFingerprint = useMemo(() => {
    if (!primaryRoute?.path?.length) return "";
    const path = primaryRoute.path;
    const start = path[0];
    const end = path[path.length - 1];
    return `${start[0].toFixed(4)},${start[1].toFixed(4)}-${end[0].toFixed(4)},${end[1].toFixed(4)}`;
  }, [primaryRoute]);

  const debouncedFingerprint = useDebouncedValue(routeFingerprint, 500);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!debouncedFingerprint || !showSafetyData || routes.length === 0) {
        return;
      }

      if (debouncedFingerprint === lastFingerprint) {
        return;
      }

      const currentFetchId = ++fetchIdRef.current;

      cancelPendingOverpassRequest();

      setLoading(true);

      try {
        const primaryPath = routes[0].path;
        if (!primaryPath || primaryPath.length < 2) {
          return;
        }

        const data = await getSafetyData(primaryPath, 150);

        if (!isMountedRef.current) return;
        if (currentFetchId !== fetchIdRef.current) return;

        setSafetyData(data);
        setLastFingerprint(debouncedFingerprint);

        console.log(`[MapView] Safety data loaded: ${data.streetLights.length} lights, ${data.trafficSignals.length} signals, ${data.shops.length} shops`);
      } catch (error) {
        if (error.name !== "AbortError" && error.code !== "ERR_CANCELED") {
          console.error("Safety data error:", error);
        }
      } finally {
        if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      fetchIdRef.current++;
    };
  }, [debouncedFingerprint, showSafetyData, routes, lastFingerprint]);

  useEffect(() => {
    return () => {
      cancelPendingOverpassRequest();
    };
  }, []);

  const filteredSafetyData = useMemo(() => {
    if (!selectedRoute?.path || !showSafetyData) {
      return safetyData;
    }

    const filtered = filterSafetyDataForRoute(
      selectedRoute.path,
      safetyData.streetLights,
      safetyData.trafficSignals,
      safetyData.shops
    );

    return filtered;
  }, [selectedRoute, safetyData, showSafetyData]);

  const limitedMarkers = useMemo(() => {
    const { streetLights, trafficSignals, shops } = filteredSafetyData;

    const allMarkers = [
      ...streetLights.map((l, i) => ({ type: "light", data: l, key: `light-${i}`, dist: l.distance })),
      ...trafficSignals.map((s, i) => ({ type: "signal", data: s, key: `signal-${i}`, dist: s.distance })),
      ...shops.map((s, i) => ({ type: "shop", data: s, key: `shop-${i}`, dist: s.distance }))
    ];

    allMarkers.sort((a, b) => a.dist - b.dist);

    return allMarkers.slice(0, MAX_MARKERS);
  }, [filteredSafetyData]);

  const getRouteColor = useCallback((route) => {
    if (!route?.safetyScore) return "#3b82f6";
    if (route.safetyScore >= 80) return "#10b981";
    if (route.safetyScore >= 50) return "#f59e0b";
    return "#ef4444";
  }, []);

  const routePolylines = useMemo(() => {
    return routes.map((route, index) => ({
      id: route.routeId || index,
      positions: route.path || [],
      color: getRouteColor(route),
      weight: selectedRoute?.routeId === route.routeId ? 8 : 4,
      opacity: selectedRoute?.routeId === route.routeId ? 1 : 0.6
    }));
  }, [routes, selectedRoute, getRouteColor]);

  const handleRouteClick = useCallback((routeId) => {
    const route = routes.find((r) => r.routeId === routeId);
    if (route) onRouteSelect?.(route);
  }, [routes, onRouteSelect]);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routePolylines.map((polyline) => (
          <Polyline
            key={polyline.id}
            positions={polyline.positions}
            pathOptions={{
              color: polyline.color,
              weight: polyline.weight,
              opacity: polyline.opacity
            }}
            eventHandlers={{
              click: () => handleRouteClick(polyline.id)
            }}
          />
        ))}

        {showSafetyData && limitedMarkers.map((marker) => {
          const icons = {
            light: streetLightIcon,
            signal: trafficSignalIcon,
            shop: shopIcon
          };
          const labels = {
            light: `Street Light (${Math.round(marker.dist)}m)`,
            signal: `Traffic Signal (${Math.round(marker.dist)}m)`,
            shop: `Shop${marker.data.type ? ` (${marker.data.type})` : ""} (${Math.round(marker.dist)}m)`
          };

          return (
            <Marker
              key={marker.key}
              position={[marker.data.lat, marker.data.lng]}
              icon={icons[marker.type]}
            >
              <Popup>{labels[marker.type]}</Popup>
            </Marker>
          );
        })}

        {origin && (
          <Marker position={[origin.lat, origin.lng]}>
            <Popup>Origin</Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        <MapBounds routes={routes} />
      </MapContainer>

      {loading && (
        <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1.5 text-xs rounded shadow-lg z-[1000]">
          Loading safety data...
        </div>
      )}

      {!loading && showSafetyData && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1.5 text-xs rounded shadow-lg z-[1000]">
          {filteredSafetyData.streetLights.length} lights, {filteredSafetyData.trafficSignals.length} signals, {filteredSafetyData.shops.length} shops
        </div>
      )}
    </div>
  );
};

export default MapView;
