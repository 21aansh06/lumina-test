function calculateSafety({ lightingScore, crowdScore, openShops, incidentImpact = 0 }) {
  let score = (lightingScore * 0.4) + (crowdScore * 0.3) + (openShops * 0.2) - (incidentImpact * 0.5);
  score = Math.max(0, Math.min(100, score));
  return Math.round(score);
}

function getSafetyColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getSafetyLabel(score) {
  if (score >= 80) return 'Safe';
  if (score >= 50) return 'Moderate';
  return 'Risky';
}

function calculateSafetyMetrics(pois, routeLengthKm) {
  const lightsCount = pois.streetLights?.length || 0;
  const signalsCount = pois.trafficSignals?.length || 0;
  const shopsCount = pois.shops?.length || 0;

  const expectedLightsPerKm = 15;
  const expectedSignalsPerKm = 3;
  const expectedShopsPerKm = 10;

  const lightsRatio = routeLengthKm > 0 ? lightsCount / (routeLengthKm * expectedLightsPerKm) : 0;
  const signalsRatio = routeLengthKm > 0 ? signalsCount / (routeLengthKm * expectedSignalsPerKm) : 0;
  const shopsRatio = routeLengthKm > 0 ? shopsCount / (routeLengthKm * expectedShopsPerKm) : 0;

  const lightingScore = Math.min(100, Math.round(lightsRatio * 100));
  const crowdScore = Math.min(100, Math.round((signalsRatio * 0.5 + shopsRatio * 0.5) * 100));
  const openShops = Math.min(100, Math.round(shopsRatio * 100));

  const safetyScore = calculateSafety({ lightingScore, crowdScore, openShops });

  return {
    safetyScore,
    lightingScore,
    crowdScore,
    openShops,
    streetLightsCount: lightsCount,
    trafficSignalsCount: signalsCount,
    shopsCount: shopsCount,
    routeLength: routeLengthKm
  };
}

module.exports = {
  calculateSafety,
  getSafetyColor,
  getSafetyLabel,
  calculateSafetyMetrics
};
