function calculateSafety({ lightingScore, crowdScore, openShops, incidentImpact }) {
  // Safety Score = (lighting × 0.4) + (crowd × 0.3) + (openShops × 0.2) - (incidentImpact × 0.5)
  let score = (lightingScore * 0.4) + (crowdScore * 0.3) + (openShops * 0.2) - (incidentImpact * 0.5);
  
  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  return Math.round(score);
}

function getSafetyColor(score) {
  if (score >= 80) return '#10b981'; // Green
  if (score >= 50) return '#f59e0b'; // Yellow/Amber
  return '#ef4444'; // Red
}

function getSafetyLabel(score) {
  if (score >= 80) return 'Safe';
  if (score >= 50) return 'Moderate';
  return 'Risky';
}

module.exports = {
  calculateSafety,
  getSafetyColor,
  getSafetyLabel
};