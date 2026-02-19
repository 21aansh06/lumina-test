const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const RoadSegment = require('../models/RoadSegment');
const Incident = require('../models/Incident');
const { calculateSafety } = require('../utils/calculateSafety');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Get all road segments
router.get('/roads', async (req, res) => {
  try {
    const roads = await RoadSegment.find();
    res.json({ roads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate 3 route options
router.post('/calculate', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination required' });
    }

    let routeData;
    let usingAI = false;

    // Check if Gemini API key is configured and not a demo key
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    const isValidKey = geminiKey && !geminiKey.includes('demo') && geminiKey.length > 20;

    if (isValidKey) {
      try {
        // Send to Gemini for route analysis
        const prompt = `Analyze 3 possible route variations from "${origin}" to "${destination}" in an urban environment.

For each route, evaluate:
- Street lighting quality (0-100)
- Crowd density (0-100) 
- Open commercial presence (0-100)
- Potential incident risks (0-100)
- Estimated time in minutes
- Risk factors (array of strings)

Return ONLY this JSON format:
{
  "routes": [
    {
      "routeId": "route-a",
      "label": "Route A",
      "estimatedTime": "25 mins",
      "estimatedMinutes": 25,
      "lightingScore": 85,
      "crowdScore": 70,
      "openShops": 80,
      "riskFactors": ["Low traffic at night", "Well lit"],
      "aiNarrative": "This route passes through well-lit commercial areas...",
      "path": [[lng, lat], [lng, lat], [lng, lat]]
    },
    {
      "routeId": "route-b",
      "label": "Route B",
      "estimatedTime": "20 mins",
      "estimatedMinutes": 20,
      "lightingScore": 60,
      "crowdScore": 65,
      "openShops": 55,
      "riskFactors": ["Moderate lighting", "Average foot traffic"],
      "aiNarrative": "Balanced route with moderate safety...",
      "path": [[lng, lat], [lng, lat], [lng, lat]]
    },
    {
      "routeId": "route-c",
      "label": "Route C",
      "estimatedTime": "15 mins",
      "estimatedMinutes": 15,
      "lightingScore": 40,
      "crowdScore": 35,
      "openShops": 30,
      "riskFactors": ["Poor lighting", "Low foot traffic", "Shortcut through industrial area"],
      "aiNarrative": "Fastest but riskiest route...",
      "path": [[lng, lat], [lng, lat], [lng, lat]]
    }
  ]
}

Respond with ONLY valid JSON, no markdown formatting.
Use realistic coordinates that would be between origin and destination.`;

        console.log('Calculating routes with Gemini AI...');
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Parse response
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            routeData = JSON.parse(jsonMatch[0]);
          } else {
            routeData = JSON.parse(response);
          }
          usingAI = true;
          console.log('✅ AI route calculation successful');
        } catch (parseError) {
          console.error('Failed to parse Gemini response:', parseError);
          routeData = getMockRoutes(origin, destination);
        }
      } catch (aiError) {
        console.error('❌ Gemini API error:', aiError.message);
        console.log('⚠️  Falling back to mock routes');
        routeData = getMockRoutes(origin, destination);
      }
    } else {
      console.log('⚠️  No valid Gemini API key found. Using mock routes.');
      routeData = getMockRoutes(origin, destination);
    }

    // Enhance with live incident data
    const enhancedRoutes = await enhanceRoutesWithIncidents(routeData.routes);

    // Sort by safety score and assign badges
    enhancedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
    enhancedRoutes[0].badge = 'SAFEST';
    enhancedRoutes[0].recommended = true;
    
    if (enhancedRoutes[1]) enhancedRoutes[1].badge = 'MODERATE';
    if (enhancedRoutes[2]) enhancedRoutes[2].badge = 'RISKY';

    res.json({ 
      routes: enhancedRoutes,
      aiPowered: usingAI,
      message: usingAI ? 'Routes calculated with AI' : 'Routes calculated with demo data (AI API not configured)'
    });

  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhance routes with real-time incident data
async function enhanceRoutesWithIncidents(routes) {
  const activeIncidents = await Incident.find({
    status: 'active',
    expiresAt: { $gt: new Date() }
  });

  return routes.map(route => {
    // Calculate base safety score
    let safetyScore = calculateSafety({
      lightingScore: route.lightingScore,
      crowdScore: route.crowdScore,
      openShops: route.openShops,
      incidentImpact: 0
    });

    // Check for incidents near route path
    let incidentImpact = 0;
    if (route.path && route.path.length > 0) {
      // Calculate center point of route
      const centerIdx = Math.floor(route.path.length / 2);
      const center = route.path[centerIdx];
      
      // Find incidents near route center
      const nearbyIncidents = activeIncidents.filter(incident => {
        const dist = calculateDistance(
          center[1], center[0],
          incident.location.coordinates[1], incident.location.coordinates[0]
        );
        return dist < 1000; // Within 1km
      });

      incidentImpact = nearbyIncidents.reduce((sum, inc) => sum + inc.severity * 3, 0);
      incidentImpact = Math.min(100, incidentImpact);
    }

    // Recalculate with incident impact
    safetyScore = calculateSafety({
      lightingScore: route.lightingScore,
      crowdScore: route.crowdScore,
      openShops: route.openShops,
      incidentImpact
    });

    return {
      ...route,
      safetyScore,
      incidentImpact,
      color: safetyScore >= 80 ? '#10b981' : safetyScore >= 50 ? '#f59e0b' : '#ef4444'
    };
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getMockRoutes(origin, destination) {
  return {
    routes: [
      {
        routeId: 'route-a',
        label: 'Route A - Safest',
        estimatedTime: '28 mins',
        estimatedMinutes: 28,
        lightingScore: 88,
        crowdScore: 82,
        openShops: 85,
        riskFactors: ['Well-lit areas', 'High foot traffic', 'Commercial zones'],
        aiNarrative: 'This route passes through well-lit commercial areas with high foot traffic, making it the safest option.',
        path: [[-74.006, 40.7128], [-73.99, 40.73], [-73.985, 40.748]]
      },
      {
        routeId: 'route-b',
        label: 'Route B - Moderate',
        estimatedTime: '22 mins',
        estimatedMinutes: 22,
        lightingScore: 65,
        crowdScore: 60,
        openShops: 55,
        riskFactors: ['Moderate lighting', 'Average foot traffic', 'Mixed residential'],
        aiNarrative: 'A balanced route with moderate safety and reasonable travel time.',
        path: [[-74.006, 40.7128], [-74.0, 40.725], [-73.985, 40.748]]
      },
      {
        routeId: 'route-c',
        label: 'Route C - Fastest',
        estimatedTime: '18 mins',
        estimatedMinutes: 18,
        lightingScore: 45,
        crowdScore: 40,
        openShops: 35,
        riskFactors: ['Poor lighting', 'Low foot traffic', 'Industrial area', 'Shortcut'],
        aiNarrative: 'Fastest route but passes through less safe areas with poor lighting and low visibility.',
        path: [[-74.006, 40.7128], [-74.02, 40.72], [-73.985, 40.748]]
      }
    ]
  };
}

module.exports = router;