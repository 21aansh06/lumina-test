import axios from "axios";

const OSRM_API_URL = "https://router.project-osrm.org";
const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:5000/api";

const EARTH_RADIUS_M = 6371000;

let pendingOverpassController = null;

export const geocodeAddress = async (address) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/geocode`, {
      params: { q: address }
    });

    const data = response.data;

    if (Array.isArray(data) && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }

    throw new Error("Address not found");
  } catch (error) {
    console.error("Geocoding error:", error.message);
    throw error;
  }
};

export const searchPlaces = async (query) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/search`, {
      params: { q: query }
    });

    return response.data || [];
  } catch (error) {
    console.error("Place search error:", error.message);
    return [];
  }
};

export const getOSRMRoute = async (coordinates) => {
  try {
    const coordsString = coordinates.map((c) => c.join(",")).join(";");

    const response = await axios.get(
      `${OSRM_API_URL}/route/v1/driving/${coordsString}`,
      {
        params: {
          overview: "full",
          geometries: "geojson",
          steps: true,
          alternatives: true
        },
        timeout: 15000
      }
    );

    if (response.data.code !== "Ok") {
      throw new Error("Route calculation failed");
    }

    let routes = response.data.routes;

    // If only 1 route, we duplicate it with an offset for demo purposes if needed, 
    // but better to just work with what OSRM gives us.
    // The requirement says "up to 5 alternative routes".

    return routes.slice(0, 5).map((route, index) => {
      const offsetMeters = index * 8; // 8m separation for each alternative
      const path = [];

      for (let i = 0; i < route.geometry.coordinates.length; i++) {
        const [lng, lat] = route.geometry.coordinates[i];

        if (i === 0) {
          path.push([lat, lng]);
          continue;
        }

        const [prevLng, prevLat] = route.geometry.coordinates[i - 1];

        const dx = lng - prevLng;
        const dy = lat - prevLat;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) {
          path.push([lat, lng]);
          continue;
        }

        // Perpendicular unit vector for visual separation of routes on map
        const ux = -dy / length;
        const uy = dx / length;

        const offsetLng = lng + ux * (offsetMeters / 111320);
        const offsetLat = lat + uy * (offsetMeters / 110540);

        path.push([offsetLat, offsetLng]);
      }

      return {
        routeId: `route-${String.fromCharCode(97 + index)}`,
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        legs: route.legs,
        path
      };
    });

  } catch (error) {
    console.error("OSRM routing error:", error.message);
    throw error;
  }
};



const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

const haversineDistanceM = (lat1, lng1, lat2, lng2) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
};

const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return Math.atan2(y, x);
};

const crossTrackDistanceM = (lat1, lng1, lat2, lng2, lat3, lng3) => {
  const d13 = haversineDistanceM(lat1, lng1, lat3, lng3) / EARTH_RADIUS_M;
  const θ13 = calculateBearing(lat1, lng1, lat3, lng3);
  const θ12 = calculateBearing(lat1, lng1, lat2, lng2);

  const dxt = Math.asin(Math.sin(d13) * Math.sin(θ13 - θ12)) * EARTH_RADIUS_M;

  return Math.abs(dxt);
};

const alongTrackDistanceM = (lat1, lng1, lat2, lng2, lat3, lng3) => {
  const d13 = haversineDistanceM(lat1, lng1, lat3, lng3) / EARTH_RADIUS_M;
  const θ13 = calculateBearing(lat1, lng1, lat3, lng3);
  const θ12 = calculateBearing(lat1, lng1, lat2, lng2);

  const dxt = Math.asin(Math.sin(d13) * Math.sin(θ13 - θ12));

  const dat = Math.acos(Math.cos(d13) / Math.cos(dxt)) * EARTH_RADIUS_M;

  return dat;
};

const distanceToSegmentM = (pLat, pLng, lat1, lng1, lat2, lng2) => {
  const d12 = haversineDistanceM(lat1, lng1, lat2, lng2);

  if (d12 < 1) {
    return haversineDistanceM(lat1, lng1, pLat, pLng);
  }

  const dat = alongTrackDistanceM(lat1, lng1, lat2, lng2, pLat, pLng);

  if (dat < 0) {
    return haversineDistanceM(lat1, lng1, pLat, pLng);
  }

  if (dat > d12) {
    return haversineDistanceM(lat2, lng2, pLat, pLng);
  }

  return crossTrackDistanceM(lat1, lng1, lat2, lng2, pLat, pLng);
};

const distanceToRouteM = (pLat, pLng, routePath) => {
  let minDist = Infinity;

  for (let i = 0; i < routePath.length - 1; i++) {
    const [lat1, lng1] = routePath[i];
    const [lat2, lng2] = routePath[i + 1];

    const dist = distanceToSegmentM(pLat, pLng, lat1, lng1, lat2, lng2);

    if (dist < minDist) minDist = dist;
  }

  return minDist;
};

const buildPolylineString = (routePath, sampleInterval = 3) => {
  const sampled = [];
  for (let i = 0; i < routePath.length; i += sampleInterval) {
    sampled.push(routePath[i]);
  }
  if (sampled.length === 0) {
    return routePath.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(" ");
  }
  const lastPoint = routePath[routePath.length - 1];
  const lastSampled = sampled[sampled.length - 1];
  if (lastSampled[0] !== lastPoint[0] || lastSampled[1] !== lastPoint[1]) {
    sampled.push(lastPoint);
  }
  return sampled.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(" ");
};

const fetchOverpassData = async (routePath, searchRadius, signal) => {
  // Format as "lat,lng lat,lng ..." for the backend
  const polylineStr = routePath
    .map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
    .join(" ");

  console.log(`[SafetyData] Fetching from backend with radius ${searchRadius}m`);

  const response = await axios.get(`${API_BASE_URL}/overpass`, {
    params: {
      polyline: polylineStr,
      radius: searchRadius
    },
    signal,
    timeout: 30000
  });

  // The backend already returns { streetLights, trafficSignals, shops }
  const { streetLights, trafficSignals, shops } = response.data;
  const elements = [
    ...streetLights.map(l => ({ ...l, tags: { ...l.tags, highway: 'street_lamp' } })),
    ...trafficSignals.map(s => ({ ...s, tags: { ...s.tags, highway: 'traffic_signals' } })),
    ...shops.map(s => ({ ...s, tags: { ...s.tags } }))
  ];

  return elements;
};

export const getSafetyData = async (routePath, baseRadius = 150) => {
  if (!routePath || routePath.length < 2) {
    console.log('[SafetyData] No route path provided');
    return { streetLights: [], trafficSignals: [], shops: [] };
  }

  if (pendingOverpassController) {
    pendingOverpassController.abort();
  }

  const controller = new AbortController();
  pendingOverpassController = controller;

  let elements = [];
  let attemptRadius = baseRadius;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      elements = await fetchOverpassData(routePath, attemptRadius, controller.signal);

      if (elements.length > 0 || attempt >= maxAttempts) {
        break;
      }

      attemptRadius += 50;
    } catch (error) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
        return { streetLights: [], trafficSignals: [], shops: [] };
      }

      if (error.response?.status === 429 || error.response?.status === 504) {
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attemptRadius += 50;
          continue;
        }
      }

      console.error("Overpass error:", error.message);
      return { streetLights: [], trafficSignals: [], shops: [] };
    }
  }

  pendingOverpassController = null;

  const streetLights = [];
  const trafficSignals = [];
  const shops = [];
  const seen = new Set();

  const LIGHT_THRESHOLD = 10;
  const SIGNAL_THRESHOLD = 30;
  const SHOP_THRESHOLD = 75;

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;

    if (lat == null || lng == null) continue;

    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distance = distanceToRouteM(lat, lng, routePath);

    if (el.tags?.highway === "street_lamp") {
      if (distance <= LIGHT_THRESHOLD) {
        streetLights.push({ lat, lng, distance });
      }
    } else if (el.tags?.highway === "traffic_signals") {
      if (distance <= SIGNAL_THRESHOLD) {
        trafficSignals.push({ lat, lng, distance });
      }
    } else if (el.tags?.shop) {
      if (distance <= SHOP_THRESHOLD) {
        shops.push({ lat, lng, distance, type: el.tags.shop });
      }
    }
  }

  console.log(`[SafetyData] Filtered: ${streetLights.length} lights (≤${LIGHT_THRESHOLD}m), ${trafficSignals.length} signals (≤${SIGNAL_THRESHOLD}m), ${shops.length} shops (≤${SHOP_THRESHOLD}m)`);

  return { streetLights, trafficSignals, shops };
};

export const cancelPendingOverpassRequest = () => {
  if (pendingOverpassController) {
    pendingOverpassController.abort();
    pendingOverpassController = null;
  }
};

export const calculateBoundingBox = (coordinates, padding = 0.01) => {
  const lats = coordinates.map((c) => c[0]);
  const lngs = coordinates.map((c) => c[1]);

  return [
    Math.min(...lngs) - padding,
    Math.min(...lats) - padding,
    Math.max(...lngs) + padding,
    Math.max(...lats) + padding
  ];
};

const calculateRouteLengthKm = (routePath) => {
  let total = 0;

  for (let i = 0; i < routePath.length - 1; i++) {
    const [lat1, lng1] = routePath[i];
    const [lat2, lng2] = routePath[i + 1];
    total += haversineDistanceM(lat1, lng1, lat2, lng2);
  }

  return total / 1000;
};

// ── Time-aware helpers ─────────────────────────────────────────────────────────

/**
 * Returns a 0–1 multiplier representing typical pedestrian crowd density
 * for a given hour of the day (24-hour clock).
 * Based on real-world foot-traffic patterns:
 *   Late night (0–5):  near-empty streets
 *   Early morning (6–8): light commuters
 *   Business hours (9–21): normal activity
 *   Evening (21–23): winding down
 */
const getTimeOfDayFactor = (hour) => {
  if (hour >= 0 && hour < 5) return 0.12;  // 12 AM–5 AM: Very quiet, but not absolute zero
  if (hour >= 5 && hour < 7) return 0.25;  // 5–7 AM: Early commuters
  if (hour >= 7 && hour < 9) return 0.60;  // 7–9 AM: Morning commute
  if (hour >= 9 && hour < 21) return 1.00;  // 9 AM–9 PM: Peak activity
  if (hour >= 21 && hour < 23) return 0.50;  // 9–11 PM: Tapering off
  return 0.25;                                // 11 PM–midnight: Late night
};

/**
 * Category tags that may stay open 24 hours or late night.
 */
const LATE_NIGHT_SHOP_TYPES = new Set([
  'convenience', 'supermarket', 'pharmacy', 'chemist',
  'fuel', 'gas_station', 'petrol', 'kiosk', 'bakery',
  'atm', 'vending_machine', 'hospital', 'clinic'
]);

/**
 * Best-effort check: is this OSM shop element likely open at `hour`?
 * 1. Try to honour the opening_hours tag (simple 24/7 / "Mo-Su HH:MM-HH:MM" patterns).
 * 2. Fall back to category heuristic.
 * 3. If we can't tell, treat daytime as open and late-night (10 PM–7 AM) as closed.
 */
const isShopLikelyOpen = (tags, hour) => {
  const oh = (tags?.opening_hours || '').trim().toLowerCase();

  // Explicit 24-hours tag
  if (oh === '24/7' || oh === 'mo-su 00:00-24:00') return true;

  // Simple single-range pattern: "HH:MM-HH:MM"
  const rangeMatch = oh.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
  if (rangeMatch) {
    const openH = parseInt(rangeMatch[1], 10);
    const closeH = parseInt(rangeMatch[3], 10);
    if (closeH > openH) return hour >= openH && hour < closeH;
    // Overnight range e.g. 22:00-06:00
    if (closeH < openH) return hour >= openH || hour < closeH;
  }

  // Category heuristic for shops with no opening_hours data
  const shopType = (tags?.shop || tags?.amenity || '').toLowerCase();
  if (LATE_NIGHT_SHOP_TYPES.has(shopType)) return true;

  // Default: typical retail hours 7 AM–10 PM
  return hour >= 7 && hour < 22;
};

export const calculateRouteSafetyMetrics = (
  routePath,
  streetLights = [],
  trafficSignals = [],
  shops = []
) => {
  if (!routePath || routePath.length === 0) {
    return {
      lightingScore: 50,
      crowdScore: 50,
      openShops: 50,
      streetLightsCount: 0,
      trafficSignalsCount: 0,
      shopsCount: 0,
      routeLength: 0
    };
  }

  const hour = new Date().getHours(); // real local hour
  const timeFactor = getTimeOfDayFactor(hour);

  const routeLengthKm = calculateRouteLengthKm(routePath);
  const lightsCount = streetLights.length;
  const signalsCount = trafficSignals.length;

  // Only count shops that are actually open right now
  const openShopsList = shops.filter(s => isShopLikelyOpen(s.tags, hour));
  const openShopsCount = openShopsList.length;

  const expectedLightsPerKm = 15;
  const expectedSignalsPerKm = 3;
  const expectedShopsPerKm = 10;

  const lightsRatio = routeLengthKm > 0 ? lightsCount / (routeLengthKm * expectedLightsPerKm) : 0;
  const signalsRatio = routeLengthKm > 0 ? signalsCount / (routeLengthKm * expectedSignalsPerKm) : 0;
  const shopsRatio = routeLengthKm > 0 ? openShopsCount / (routeLengthKm * expectedShopsPerKm) : 0;

  // Lighting is physical — unaffected by time of day (lights ARE on at night)
  const lightingScore = Math.min(100, Math.round(lightsRatio * 100));

  // Crowd and shops are multiplied by the time-of-day factor
  // e.g. at 1:30 AM timeFactor ≈ 0.04 → crowd score near 0 even on a busy road
  const crowdScore = Math.min(100, Math.round(
    (signalsRatio * 0.5 + shopsRatio * 0.5) * timeFactor * 100
  ));
  const openShops = Math.min(100, Math.round(shopsRatio * timeFactor * 100));

  console.log(`[SafetyMetrics] Hour=${hour}, timeFactor=${timeFactor}, lights=${lightsCount}, signals=${signalsCount}, openShops=${openShopsCount}/${shops.length}`);

  return {
    lightingScore,
    crowdScore,
    openShops,
    streetLightsCount: lightsCount,
    trafficSignalsCount: signalsCount,
    shopsCount: openShopsCount,   // only open shops counted
    routeLength: routeLengthKm
  };
};

export const filterSafetyDataForRoute = (
  routePath,
  allStreetLights,
  allTrafficSignals,
  allShops
) => {
  const LIGHT_THRESHOLD = 10;
  const SIGNAL_THRESHOLD = 30;
  const SHOP_THRESHOLD = 75;

  const streetLights = allStreetLights.filter(l =>
    distanceToRouteM(l.lat, l.lng, routePath) <= LIGHT_THRESHOLD
  );

  const trafficSignals = allTrafficSignals.filter(s =>
    distanceToRouteM(s.lat, s.lng, routePath) <= SIGNAL_THRESHOLD
  );

  const shops = allShops.filter(s =>
    distanceToRouteM(s.lat, s.lng, routePath) <= SHOP_THRESHOLD
  );

  return { streetLights, trafficSignals, shops };
};

export default {
  geocodeAddress,
  searchPlaces,
  getOSRMRoute,
  getSafetyData,
  calculateBoundingBox,
  calculateRouteSafetyMetrics,
  filterSafetyDataForRoute,
  cancelPendingOverpassRequest
};
