const { GoogleGenerativeAI } = require('@google/generative-ai');
const Incident = require('../models/Incident');
const RoadSegment = require('../models/RoadSegment');
const { calculateSafety } = require('../utils/calculateSafety');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

class ScoutAgent {
  constructor(io) {
    this.io = io;
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async processIncident(text, io) {
    try {
      this.logStep('RECEIVED', `Processing incident report: "${text}"`);

      // Send to Gemini for analysis
      const prompt = `Analyze this text for public safety incidents. Does it describe a fire, protest, flood, infrastructure failure, accident, or crime?

Text: "${text}"

If it IS a safety incident, return ONLY this JSON format:
{
  "isIncident": true,
  "type": "fire|protest|flood|infrastructure|accident|crime|other",
  "severity": 1-10,
  "location": "extracted location name",
  "description": "brief description"
}

If it is NOT a safety incident, return ONLY:
{"isIncident": false}

Respond with ONLY valid JSON, no markdown formatting.`;

      this.logStep('AI_ANALYSIS', 'Sending to Gemini for classification...');

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Parse JSON response
      let analysis;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          analysis = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', response);
        this.logStep('ERROR', 'Failed to parse AI response');
        return { success: false, error: 'AI parsing failed' };
      }

      this.logStep('AI_RESPONSE', `Classification: ${JSON.stringify(analysis)}`);

      if (!analysis.isIncident) {
        this.logStep('REJECTED', 'Not classified as a safety incident');
        return { success: false, message: 'Not a safety incident' };
      }

      // Create incident in database
      const incident = await this.createIncident(analysis);
      this.logStep('CREATED', `Incident ID: ${incident._id}`);

      // Find and update affected road segments
      const updatedSegments = await this.updateRoadSegments(incident);
      this.logStep('UPDATED', `Affected ${updatedSegments.length} road segments`);

      // Emit real-time update to all clients
      if (io) {
        io.emit('incident_update', {
          incident,
          updatedSegments,
          message: `Scout Agent detected: ${analysis.type.toUpperCase()} near ${analysis.location}`,
          timestamp: new Date().toISOString()
        });
      }

      this.logStep('COMPLETED', 'Incident processing complete');

      return {
        success: true,
        incident,
        updatedSegments,
        message: `Detected ${analysis.type} incident with severity ${analysis.severity}/10`
      };

    } catch (error) {
      console.error('Scout Agent Error:', error);
      this.logStep('ERROR', error.message);
      return { success: false, error: error.message };
    }
  }

  async createIncident(analysis) {
    // For demo purposes, use random coordinates near major cities
    // In production, you'd geocode the location name
    const baseCoords = [
      [-74.006, 40.7128],  // NYC
      [-118.2437, 34.0522], // LA
      [-87.6298, 41.8781],  // Chicago
      [-122.4194, 37.7749], // SF
    ];

    const randomBase = baseCoords[Math.floor(Math.random() * baseCoords.length)];
    const jitter = () => (Math.random() - 0.5) * 0.02;

    const incident = new Incident({
      type: analysis.type,
      location: {
        type: 'Point',
        coordinates: [randomBase[0] + jitter(), randomBase[1] + jitter()]
      },
      locationName: analysis.location,
      severity: analysis.severity,
      description: analysis.description || `${analysis.type} reported`,
      aiExtracted: true,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    });

    return await incident.save();
  }

  async updateRoadSegments(incident) {
    const affectedRadius = incident.severity * 100; // meters

    // Find nearby road segments
    const nearbySegments = await RoadSegment.find({
      geometry: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: incident.location.coordinates
          },
          $maxDistance: affectedRadius
        }
      }
    });

    const updatedSegments = [];

    for (const segment of nearbySegments) {
      // Increase incident impact based on severity
      const impactIncrease = incident.severity * 3;
      segment.incidentImpact = Math.min(100, segment.incidentImpact + impactIncrease);

      // Recalculate safety score
      segment.safetyScore = calculateSafety({
        lightingScore: segment.lightingScore,
        crowdScore: segment.crowdScore,
        openShops: segment.openShops,
        incidentImpact: segment.incidentImpact
      });

      segment.lastUpdated = new Date();
      await segment.save();
      updatedSegments.push(segment);
    }

    return updatedSegments;
  }

  logStep(step, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] SCOUT | ${step} | ${message}`;
    console.log(logEntry);

    if (this.io) {
      this.io.emit('scout_log', { step, message, timestamp });
    }
  }
}

module.exports = ScoutAgent;