// OpenStreetMap and Overpass API Service
import axios from 'axios';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org';
const OSRM_API_URL = 'https://router.project-osrm.org';

/**
 * Geocode address to coordinates using Nominatim
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number}>}
 */
export const geocodeAddress = async (address) => {
  try {
    const response = await axios.get(`${NOMINATIM_API_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'LUMINA-Safety-App/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name
      };
    }
    throw new Error('Address not found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

/**
 * Get routes using OSRM
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @returns {Promise<Object>} Route data with geometry
 */
export const getOSRMRoute = async (coordinates) => {
  try {
    const coordsString = coordinates.map(coord => coord.join(',')).join(';');
    const response = await axios.get(`${OSRM_API_URL}/route/v1/driving/${coordsString}`, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: true,
        alternatives: true
      }
    });

    if (response.data.code !== 'Ok') {
      throw new Error('Route calculation failed');
    }

    return response.data.routes.map((route, index) => ({
      routeId: `route-${String.fromCharCode(97 + index)}`,
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      legs: route.legs,
      path: route.geometry.coordinates.map(coord => [coord[1], coord[0]]) // Convert to [lat, lng]
    }));
  } catch (error) {
    console.error('OSRM routing error:', error);
    throw error;
  }
};

/**
 * Query street lights along a route using Overpass API
 * @param {Array} bbox - Bounding box [minLng, minLat, maxLng, maxLat]
 * @returns {Promise<Array>} Array of street light locations
 */
export const getStreetLights = async (bbox) => {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  
  const query = `
    [out:json][timeout:25];
    (
      node["highway"="street_lamp"](${minLat},${minLng},${maxLat},${maxLng});
      way["highway"="street_lamp"](${minLat},${minLng},${maxLat},${maxLng});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await axios.post(OVERPASS_API_URL, query, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.elements.map(element => ({
      id: element.id,
      type: element.type,
      lat: element.lat,
      lng: element.lon,
      tags: element.tags || {}
    }));
  } catch (error) {
    console.error('Overpass API error:', error);
    return []; // Return empty array on error
  }
};

/**
 * Query traffic signals along a route
 * @param {Array} bbox - Bounding box [minLng, minLat, maxLng, maxLat]
 * @returns {Promise<Array>} Array of traffic signal locations
 */
export const getTrafficSignals = async (bbox) => {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  
  const query = `
    [out:json][timeout:25];
    (
      node["highway"="traffic_signals"](${minLat},${minLng},${maxLat},${maxLng});
    );
    out body;
  `;

  try {
    const response = await axios.post(OVERPASS_API_URL, query, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.elements.map(element => ({
      id: element.id,
      lat: element.lat,
      lng: element.lon,
      tags: element.tags || {}
    }));
  } catch (error) {
    console.error('Overpass API error:', error);
    return [];
  }
};

/**
 * Query shops and commercial areas
 * @param {Array} bbox - Bounding box
 * @returns {Promise<Array>} Array of shop locations
 */
export const getShops = async (bbox) => {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  
  const query = `
    [out:json][timeout:25];
    (
      node["shop"](${minLat},${minLng},${maxLat},${maxLng});
      way["shop"](${minLat},${minLng},${maxLat},${maxLng});
      node["amenity"="restaurant"](${minLat},${minLng},${maxLat},${maxLng});
      node["amenity"="cafe"](${minLat},${minLng},${maxLat},${maxLng});
      node["amenity"="fast_food"](${minLat},${minLng},${maxLat},${maxLng});
    );
    out body center;
  `;

  try {
    const response = await axios.post(OVERPASS_API_URL, query, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.elements.map(element => ({
      id: element.id,
      type: element.type,
      lat: element.lat || (element.center && element.center.lat),
      lng: element.lon || (element.center && element.center.lon),
      tags: element.tags || {}
    })).filter(shop => shop.lat && shop.lng);
  } catch (error) {
    console.error('Overpass API error:', error);
    return [];
  }
};

/**
 * Calculate bounding box from route coordinates
 * @param {Array} coordinates - Array of [lat, lng]
 * @param {number} padding - Padding in degrees (default 0.01)
 * @returns {Array} [minLng, minLat, maxLng, maxLat]
 */
export const calculateBoundingBox = (coordinates, padding = 0.01) => {
  const lats = coordinates.map(coord => coord[0]);
  const lngs = coordinates.map(coord => coord[1]);
  
  return [
    Math.min(...lngs) - padding,
    Math.min(...lats) - padding,
    Math.max(...lngs) + padding,
    Math.max(...lats) + padding
  ];
};

/**
 * Calculate safety metrics for a route
 * @param {Array} routePath - Array of [lat, lng]
 * @param {Array} streetLights - Array of street light locations
 * @param {Array} trafficSignals - Array of traffic signal locations
 * @param {Array} shops - Array of shop locations
 * @returns {Object} Safety metrics
 */
export const calculateRouteSafetyMetrics = (routePath, streetLights, trafficSignals, shops) => {
  if (!routePath || routePath.length === 0) {
    return { lightingScore: 50, crowdScore: 50, openShops: 50 };
  }

  // Calculate route length (approximate using Haversine formula)
  const routeLength = calculateRouteLength(routePath);
  
  // Count street lights within 50m of route
  const lightsNearRoute = streetLights.filter(light => 
    isPointNearRoute(light.lat, light.lng, routePath, 0.05) // 50m in degrees (approx)
  ).length;
  
  // Count traffic signals
  const signalsNearRoute = trafficSignals.filter(signal => 
    isPointNearRoute(signal.lat, signal.lng, routePath, 0.05)
  ).length;
  
  // Count shops
  const shopsNearRoute = shops.filter(shop => 
    isPointNearRoute(shop.lat, shop.lng, routePath, 0.1) // 100m for shops
  ).length;

  // Calculate scores (0-100)
  const lightingScore = Math.min(100, (lightsNearRoute / (routeLength * 0.1)) * 100);
  const crowdScore = Math.min(100, 50 + (signalsNearRoute * 10) + (shopsNearRoute * 2));
  const openShopsScore = Math.min(100, shopsNearRoute * 5);

  return {
    lightingScore: Math.round(lightingScore),
    crowdScore: Math.round(crowdScore),
    openShops: Math.round(openShopsScore),
    streetLightsCount: lightsNearRoute,
    trafficSignalsCount: signalsNearRoute,
    shopsCount: shopsNearRoute,
    routeLength: routeLength
  };
};

/**
 * Check if a point is near a route
 */
const isPointNearRoute = (lat, lng, route, threshold) => {
  return route.some(coord => {
    const distance = Math.sqrt(
      Math.pow(coord[0] - lat, 2) + Math.pow(coord[1] - lng, 2)
    );
    return distance < threshold;
  });
};

/**
 * Calculate route length in km
 */
const calculateRouteLength = (coordinates) => {
  let length = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    length += haversineDistance(coordinates[i], coordinates[i + 1]);
  }
  return length;
};

/**
 * Haversine distance between two points
 */
const haversineDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const lat1 = coord1[0] * Math.PI / 180;
  const lat2 = coord2[0] * Math.PI / 180;
  const deltaLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const deltaLng = (coord2[1] - coord1[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

export default {
  geocodeAddress,
  getOSRMRoute,
  getStreetLights,
  getTrafficSignals,
  getShops,
  calculateBoundingBox,
  calculateRouteSafetyMetrics
};