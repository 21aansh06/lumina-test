const express = require('express');
const router = express.Router();
const RoadSegment = require('../models/RoadSegment');
const Incident = require('../models/Incident');
const { calculateSafety, calculateSafetyMetrics, getSafetyColor } = require('../utils/calculateSafety');
const {
  geocode,
  getRoutesFromOSRM,
  getAllPOIsForRoute,
  filterPOIsOnRoute,
  rankRoutes,
  haversineDistanceM,
  calculateRouteLengthKm
} = require('../services/routeService');

router.get('/roads', async (req, res) => {
  try {
    const roads = await RoadSegment.find();
    res.json({ roads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/calculate', async (req, res) => {
  const startTime = Date.now();

  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination required' });
    }

    console.log(`🚀 Calculating routes from "${origin}" to "${destination}"`);

    const originCoords = await geocode(origin);
    const destCoords = await geocode(destination);

    console.log(`📍 Origin: ${originCoords.lat}, ${originCoords.lng}`);
    console.log(`📍 Destination: ${destCoords.lat}, ${destCoords.lng}`);

    let routes = await getRoutesFromOSRM(originCoords, destCoords);

    if (!routes || routes.length === 0) {
      return res.status(500).json({ error: 'Failed to calculate routes' });
    }

    console.log(`✅ Got ${routes.length} routes from OSRM`);

    routes = rankRoutes(routes);

    for (const route of routes) {
      const routeLengthKm = calculateRouteLengthKm(route.coordinates);
      console.log(`📡 Fetching POIs for route ${route.id} (${routeLengthKm.toFixed(2)}km)...`);

      const pois = await getAllPOIsForRoute(route.coordinates, 60);

      const filteredPois = filterPOIsOnRoute(pois, route.coordinates);

      route.street_lights = filteredPois.streetLights.length;
      route.traffic_signals = filteredPois.trafficSignals.length;
      route.shops = filteredPois.shops.length;
      route.routeLengthKm = routeLengthKm;

      console.log(`   Route ${route.id}: ${route.street_lights} lights (≤5m), ${route.traffic_signals} signals (≤20m), ${route.shops} shops (≤50m)`);
    }

    const activeIncidents = await Incident.find({
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    const enhancedRoutes = routes.map(route => {
      const incidentImpact = calculateIncidentImpact(route.coordinates, activeIncidents);

      const metrics = calculateSafetyMetrics(
        {
          streetLights: Array(route.street_lights).fill({}),
          trafficSignals: Array(route.traffic_signals).fill({}),
          shops: Array(route.shops).fill({})
        },
        route.routeLengthKm
      );

      const safetyScore = calculateSafety({
        lightingScore: metrics.lightingScore,
        crowdScore: metrics.crowdScore,
        openShops: metrics.openShops,
        incidentImpact
      });

      return {
        id: route.id,
        routeId: route.routeId || `route-${route.id}`,
        label: route.label,
        badge: route.badge,
        distance_km: Math.round(route.distance_km * 10) / 10,
        duration_min: route.duration_min,
        estimatedTime: `${route.duration_min} mins`,
        eta_difference: route.eta_difference,
        eta_difference_min: route.eta_difference_min,
        street_lights: route.street_lights,
        traffic_signals: route.traffic_signals,
        shops: route.shops,
        lightingScore: metrics.lightingScore,
        crowdScore: metrics.crowdScore,
        openShops: metrics.openShops,
        safetyScore,
        incidentImpact,
        riskFactors: getRiskFactors(metrics.lightingScore, metrics.crowdScore, metrics.openShops, incidentImpact),
        aiNarrative: generateNarrative(route, metrics.lightingScore, metrics.crowdScore, incidentImpact),
        path: route.coordinates,
        polyline: route.geometry,
        color: getSafetyColor(safetyScore),
        recommended: route.badge === 'FASTEST'
      };
    });

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    res.json({
      routes: enhancedRoutes,
      origin: { ...originCoords, address: origin },
      destination: { ...destCoords, address: destination },
      source: 'OSRM',
      processingTime
    });

  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

function calculateIncidentImpact(coordinates, incidents) {
  if (!coordinates?.length || !incidents?.length) return 0;

  const midIdx = Math.floor(coordinates.length / 2);
  const midPoint = coordinates[midIdx];

  const nearbyCount = incidents.filter(incident => {
    const dist = haversineDistanceM(
      midPoint[0], midPoint[1],
      incident.location.coordinates[1],
      incident.location.coordinates[0]
    );
    return dist < 500;
  }).length;

  return Math.min(100, nearbyCount * 15);
}

function getRiskFactors(lightingScore, crowdScore, openShops, incidentImpact) {
  const factors = [];

  if (lightingScore >= 70) factors.push('Well-lit streets');
  else if (lightingScore >= 40) factors.push('Moderate lighting');
  else factors.push('Poor street lighting');

  if (crowdScore >= 60) factors.push('High foot traffic area');
  else if (crowdScore >= 40) factors.push('Moderate foot traffic');
  else factors.push('Low foot traffic');

  if (openShops >= 50) factors.push('Commercial area');

  if (incidentImpact > 30) factors.push('Recent incidents reported nearby');

  return factors;
}

function generateNarrative(route, lightingScore, crowdScore, incidentImpact) {
  const speedKmh = route.distance_km > 0 ? (route.distance_km / (route.duration_min / 60)).toFixed(0) : 0;

  let narrative = `${route.label} covering ${route.distance_km.toFixed(1)}km with ${route.street_lights} street lights. `;
  narrative += `Estimated travel time ${route.duration_min} minutes (~${speedKmh} km/h avg). `;

  if (lightingScore >= 70) {
    narrative += 'Good visibility throughout the route. ';
  } else if (lightingScore >= 40) {
    narrative += 'Moderate lighting, exercise caution in darker sections. ';
  } else {
    narrative += 'Limited street lighting, extra caution advised. ';
  }

  if (crowdScore >= 60) {
    narrative += 'High foot traffic area for better safety.';
  } else if (crowdScore >= 40) {
    narrative += 'Moderate pedestrian activity.';
  } else {
    narrative += 'Low foot traffic area.';
  }

  return narrative;
}

module.exports = router;
