const express = require('express');
const router = express.Router();
const ScoutAgent = require('../agents/scoutAgent');
const RoadSegment = require('../models/RoadSegment');
const Incident = require('../models/Incident');

// Simulate incident - Admin only
router.post('/simulate-incident', async (req, res) => {
  try {
    const { text, type } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Incident description required' });
    }

    const io = req.app.get('io');
    const scoutAgent = new ScoutAgent(io);

    const result = await scoutAgent.processIncident(text, io);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        incident: result.incident,
        affectedSegments: result.updatedSegments.length
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Incident processing failed'
      });
    }

  } catch (error) {
    console.error('Admin simulate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all active incidents
router.get('/incidents', async (req, res) => {
  try {
    const incidents = await Incident.find({
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.json({ incidents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system stats
router.get('/stats', async (req, res) => {
  try {
    const totalRoads = await RoadSegment.countDocuments();
    const activeIncidents = await Incident.countDocuments({
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    
    const avgSafetyScore = await RoadSegment.aggregate([
      { $group: { _id: null, avg: { $avg: '$safetyScore' } } }
    ]);

    // Calculate city safety index
    const citySafetyIndex = avgSafetyScore.length > 0 
      ? Math.round(avgSafetyScore[0].avg) 
      : 75;

    res.json({
      totalRoads,
      activeIncidents,
      citySafetyIndex,
      agentsActive: {
        scout: true,
        verifier: true,
        guardian: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all road segments with safety data
router.get('/roads', async (req, res) => {
  try {
    const roads = await RoadSegment.find().select('-__v');
    res.json({ roads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve an incident
router.patch('/incidents/:id/resolve', async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Recalculate safety scores for affected roads
    // This would normally reduce the incidentImpact
    const io = req.app.get('io');
    if (io) {
      io.emit('incident_resolved', {
        incident,
        message: `Incident resolved: ${incident.type} at ${incident.locationName}`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;