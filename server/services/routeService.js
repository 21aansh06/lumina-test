const axios = require('axios');

const OSRM_API_URL = 'https://router.project-osrm.org/route/v1/driving';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org';

const EARTH_RADIUS_M = 6371000;

const overpassCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCached(key) {
  const cached = overpassCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  overpassCache.delete(key);
  return null;
}

function setCache(key, data) {
  overpassCache.set(key, { data, timestamp: Date.now() });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

function haversineDistanceM(lat1, lng1, lat2, lng2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

function calculateBearing(lat1, lng1, lat2, lng2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return Math.atan2(y, x);
}

function crossTrackDistanceM(lat1, lng1, lat2, lng2, lat3, lng3) {
  const d13 = haversineDistanceM(lat1, lng1, lat3, lng3) / EARTH_RADIUS_M;
  const θ13 = calculateBearing(lat1, lng1, lat3, lng3);
  const θ12 = calculateBearing(lat1, lng1, lat2, lng2);

  const dxt = Math.asin(Math.sin(d13) * Math.sin(θ13 - θ12)) * EARTH_RADIUS_M;

  return Math.abs(dxt);
}

function alongTrackDistanceM(lat1, lng1, lat2, lng2, lat3, lng3) {
  const d13 = haversineDistanceM(lat1, lng1, lat3, lng3) / EARTH_RADIUS_M;
  const θ13 = calculateBearing(lat1, lng1, lat3, lng3);
  const θ12 = calculateBearing(lat1, lng1, lat2, lng2);

  const dxt = Math.asin(Math.sin(d13) * Math.sin(θ13 - θ12));

  const dat = Math.acos(Math.cos(d13) / Math.cos(dxt)) * EARTH_RADIUS_M;

  return dat;
}

function distanceToSegmentM(pLat, pLng, lat1, lng1, lat2, lng2) {
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
}

function distanceToRouteM(pLat, pLng, coordinates) {
  let minDist = Infinity;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lat1, lng1] = coordinates[i];
    const [lat2, lng2] = coordinates[i + 1];

    const dist = distanceToSegmentM(pLat, pLng, lat1, lng1, lat2, lng2);

    if (dist < minDist) minDist = dist;
  }

  return minDist;
}

function buildPolylineString(coordinates, sampleInterval = 3) {
  const sampled = [];
  for (let i = 0; i < coordinates.length; i += sampleInterval) {
    sampled.push(coordinates[i]);
  }
  if (sampled.length === 0) {
    return coordinates.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(' ');
  }
  const lastPoint = coordinates[coordinates.length - 1];
  const lastSampled = sampled[sampled.length - 1];
  if (lastSampled[0] !== lastPoint[0] || lastSampled[1] !== lastPoint[1]) {
    sampled.push(lastPoint);
  }
  return sampled.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(' ');
}

function generateRouteCacheKey(coordinates) {
  const sample = coordinates.filter((_, i) => i % 10 === 0);
  return sample.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join('|');
}

async function fetchOverpassWithRetry(query, retryCount = 0) {
  const maxRetries = 1;

  try {
    const response = await axios.post(
      OVERPASS_API_URL,
      `data=${encodeURIComponent(query)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000
      }
    );
    return response.data.elements || [];
  } catch (err) {
    if ((err.response?.status === 504 || err.response?.status === 429 || err.code === 'ECONNABORTED') && retryCount < maxRetries) {
      console.log('⚠️ Overpass error, retrying once...');
      await sleep(2000);
      return fetchOverpassWithRetry(query, retryCount + 1);
    }
    console.error('Overpass error:', err.message);
    return [];
  }
}

async function getAllPOIsForRoute(coordinates, baseRadius = 150) {
  if (!coordinates || coordinates.length < 2) {
    return { streetLights: [], trafficSignals: [], shops: [] };
  }

  const cacheKey = generateRouteCacheKey(coordinates);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit for route`);
    return cached;
  }

  const polylineStr = buildPolylineString(coordinates);

  let elements = [];
  let attemptRadius = baseRadius;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;

    const query = `
      [out:json][timeout:25];
      (
        node["highway"="street_lamp"](around:${attemptRadius},${polylineStr});
        node["highway"="traffic_signals"](around:${attemptRadius},${polylineStr});
        way["highway"="traffic_signals"](around:${attemptRadius},${polylineStr});
        node["shop"](around:${attemptRadius},${polylineStr});
        way["shop"](around:${attemptRadius},${polylineStr});
      );
      out center;
    `;

    console.log(`📡 Querying Overpass with radius ${attemptRadius}m (attempt ${attempt})`);

    elements = await fetchOverpassWithRetry(query);

    if (elements.length > 0 || attempt >= maxAttempts) {
      break;
    }

    attemptRadius += 50;
  }

  const LIGHT_THRESHOLD = 10;
  const SIGNAL_THRESHOLD = 30;
  const SHOP_THRESHOLD = 75;

  const pois = {
    streetLights: [],
    trafficSignals: [],
    shops: []
  };

  const seen = new Set();

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;

    if (lat == null || lng == null) continue;

    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distance = distanceToRouteM(lat, lng, coordinates);

    if (el.tags?.highway === 'street_lamp' && distance <= LIGHT_THRESHOLD) {
      pois.streetLights.push({ id: el.id, lat, lng, distance, tags: el.tags || {} });
    } else if (el.tags?.highway === 'traffic_signals' && distance <= SIGNAL_THRESHOLD) {
      pois.trafficSignals.push({ id: el.id, lat, lng, distance, tags: el.tags || {} });
    } else if (el.tags?.shop && distance <= SHOP_THRESHOLD) {
      pois.shops.push({ id: el.id, lat, lng, distance, type: el.tags.shop, tags: el.tags || {} });
    }
  }

  setCache(cacheKey, pois);
  console.log(`📊 Found on route: ${pois.streetLights.length} lights (≤${LIGHT_THRESHOLD}m), ${pois.trafficSignals.length} signals (≤${SIGNAL_THRESHOLD}m), ${pois.shops.length} shops (≤${SHOP_THRESHOLD}m)`);

  return pois;
}

function filterPOIsOnRoute(pois, coordinates) {
  const LIGHT_THRESHOLD = 10;
  const SIGNAL_THRESHOLD = 30;
  const SHOP_THRESHOLD = 75;

  const filtered = {
    streetLights: [],
    trafficSignals: [],
    shops: []
  };

  for (const poi of pois.streetLights) {
    const dist = distanceToRouteM(poi.lat, poi.lng, coordinates);
    if (dist <= LIGHT_THRESHOLD) {
      filtered.streetLights.push({ ...poi, distance: dist });
    }
  }

  for (const poi of pois.trafficSignals) {
    const dist = distanceToRouteM(poi.lat, poi.lng, coordinates);
    if (dist <= SIGNAL_THRESHOLD) {
      filtered.trafficSignals.push({ ...poi, distance: dist });
    }
  }

  for (const poi of pois.shops) {
    const dist = distanceToRouteM(poi.lat, poi.lng, coordinates);
    if (dist <= SHOP_THRESHOLD) {
      filtered.shops.push({ ...poi, distance: dist });
    }
  }

  return filtered;
}

async function geocode(address) {
  const response = await axios.get(`${NOMINATIM_API_URL}/search`, {
    params: { q: address, format: 'json', limit: 1 },
    headers: { 'User-Agent': 'Lumina-Route-Planner/1.0' },
    timeout: 10000
  });

  if (!response.data?.length) throw new Error(`Address not found: ${address}`);
  return {
    lat: parseFloat(response.data[0].lat),
    lng: parseFloat(response.data[0].lon),
    display: response.data[0].display_name
  };
}

async function getRoutesFromOSRM(origin, destination) {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_API_URL}/${coords}`;

  const response = await axios.get(url, {
    params: {
      overview: 'full',
      geometries: 'geojson',
      alternatives: 'true',
      steps: false,
      annotations: false
    },
    timeout: 15000
  });

  if (response.data.code !== 'Ok') throw new Error('OSRM routing failed');

  return response.data.routes.slice(0, 3).map((route, idx) => ({
    id: idx + 1,
    routeId: `route-${String.fromCharCode(97 + idx)}`,
    distance_km: route.distance / 1000,
    duration_min: Math.round(route.duration / 60),
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry,
    path: route.geometry.coordinates.map(c => [c[1], c[0]]),
    coordinates: route.geometry.coordinates.map(c => [c[1], c[0]])
  }));
}

function decodePolyline6(encoded) {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const latChange = result & 1 ? ~(result >> 1) : result >> 1;
    lat += latChange;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const lngChange = result & 1 ? ~(result >> 1) : result >> 1;
    lng += lngChange;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

function rankRoutes(routes) {
  if (routes.length === 0) return routes;

  const sorted = [...routes].sort((a, b) => a.duration_min - b.duration_min);
  const fastestDuration = sorted[0].duration_min;

  return sorted.map((route, idx) => {
    const etaDiff = route.duration_min - fastestDuration;

    let label, badge;
    if (idx === 0) {
      label = 'Fastest Route';
      badge = 'FASTEST';
    } else if (route.distance_km < sorted[0].distance_km * 0.95) {
      label = 'Shortest Route';
      badge = 'SHORTEST';
    } else {
      label = 'Alternative Route';
      badge = 'BALANCED';
    }

    return {
      ...route,
      label,
      badge,
      eta_difference: etaDiff > 0 ? `+${etaDiff} min` : 'Fastest',
      eta_difference_min: etaDiff
    };
  });
}

function calculateRouteLengthKm(coordinates) {
  let total = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lat1, lng1] = coordinates[i];
    const [lat2, lng2] = coordinates[i + 1];
    total += haversineDistanceM(lat1, lng1, lat2, lng2);
  }

  return total / 1000;
}

module.exports = {
  geocode,
  getRoutesFromOSRM,
  getAllPOIsForRoute,
  filterPOIsOnRoute,
  rankRoutes,
  decodePolyline6,
  haversineDistanceM,
  distanceToRouteM,
  calculateRouteLengthKm
};
