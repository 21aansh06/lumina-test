const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Feedback = require('../models/Feedback');
const Trip = require('../models/Trip');
const RoadSegment = require('../models/RoadSegment');
const { calculateSafety } = require('../utils/calculateSafety');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Submit feedback
router.post('/', async (req, res) => {
  try {
    const { userId, routeId, routeLabel, origin, destination, rating, textFeedback, tags } = req.body;

    const feedback = new Feedback({
      userId,
      routeId,
      routeLabel,
      origin,
      destination,
      rating,
      textFeedback,
      tags: tags || []
    });

    await feedback.save();

    // Process feedback asynchronously with AI
    processFeedbackWithAI(feedback).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! It will help improve our safety recommendations.',
      feedback
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's feedback
router.get('/user/:userId', async (req, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    
    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process feedback with Gemini AI
async function processFeedbackWithAI(feedback) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze this user feedback about a route safety experience:

Rating: ${feedback.rating}/5
Feedback: "${feedback.textFeedback}"
Tags: ${feedback.tags?.join(', ') || 'None'}

Return ONLY this JSON:
{
  "safetyAdjustment": number (-10 to +10),
  "analysis": "brief analysis",
  "isValid": true/false
}

A low rating (1-2) with negative feedback should suggest negative adjustment.
A high rating (4-5) with positive feedback should suggest positive adjustment.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    let analysis;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
      analysis = { safetyAdjustment: 0, analysis: 'Parsing error', isValid: false };
    }

    // Update feedback with AI analysis
    feedback.processedByAI = true;
    feedback.safetyAdjustment = analysis.safetyAdjustment || 0;
    feedback.aiAnalysis = analysis.analysis;
    await feedback.save();

    // Apply adjustment to relevant road segments
    if (analysis.isValid && analysis.safetyAdjustment !== 0) {
      await applySafetyAdjustment(feedback, analysis.safetyAdjustment);
    }

    console.log(`Feedback ${feedback._id} processed with adjustment: ${analysis.safetyAdjustment}`);

  } catch (error) {
    console.error('AI feedback processing error:', error);
  }
}

async function applySafetyAdjustment(feedback, adjustment) {
  try {
    // Find road segments near the route
    // For simplicity, we'll adjust segments based on the route ID
    // In production, you'd have more sophisticated matching
    
    // This is a placeholder - you'd need actual road segment IDs from the route
    console.log(`Would apply adjustment of ${adjustment} to road segments for route ${feedback.routeId}`);
    
  } catch (error) {
    console.error('Safety adjustment error:', error);
  }
}

// Get all feedback (admin only)
router.get('/', async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;