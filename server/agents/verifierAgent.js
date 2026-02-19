const { GoogleGenerativeAI } = require('@google/generative-ai');
const Report = require('../models/Report');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

class VerifierAgent {
  constructor(io) {
    this.io = io;
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async verifyReport(reportId, io) {
    try {
      const report = await Report.findById(reportId).populate('userId');
      
      if (!report) {
        this.logStep('ERROR', `Report ${reportId} not found`);
        return { success: false, error: 'Report not found' };
      }

      this.logStep('RECEIVED', `Verifying report ${reportId} from user ${report.userId.name}`);

      // Read image file
      const imagePath = path.join(__dirname, '..', report.imageUrl);
      let imageData;
      try {
        imageData = await fs.readFile(imagePath);
      } catch (fileError) {
        this.logStep('ERROR', 'Could not read image file');
        return { success: false, error: 'Image file not accessible' };
      }

      this.logStep('AI_ANALYSIS', 'Sending image to Gemini Vision for verification...');

      // Prepare image for Gemini
      const imagePart = {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const prompt = `Analyze this image for safety and infrastructure conditions.

Look for:
1. Poor lighting or dark environment
2. Broken streetlights
3. Unsafe infrastructure (broken roads, exposed wires, etc.)
4. Evidence of hazards or unsafe conditions
5. Time of day (day/night)

Return ONLY this JSON format:
{
  "isValid": true/false,
  "confidence": 0-100,
  "detectedIssues": ["issue1", "issue2"],
  "reason": "explanation of the analysis"
}

Respond with ONLY valid JSON, no markdown formatting.`;

      const result = await this.model.generateContent([prompt, imagePart]);
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
        analysis = { isValid: false, confidence: 0, reason: 'AI parsing error' };
      }

      this.logStep('AI_RESPONSE', `Verification result: ${analysis.isValid ? 'APPROVED' : 'REJECTED'}`);

      // Update report status
      if (analysis.isValid && analysis.confidence > 50) {
        report.status = 'approved';
        report.aiConfidence = analysis.confidence;
        report.aiReason = analysis.reason;
        
        // Increase user trust score
        await User.findByIdAndUpdate(report.userId._id, {
          $inc: { trustScore: 10 }
        });
        
        this.logStep('APPROVED', `Confidence: ${analysis.confidence}% - ${analysis.reason}`);
        
        if (io) {
          io.to(report.userId._id.toString()).emit('report_verified', {
            reportId: report._id,
            status: 'approved',
            message: 'AI Verified - Report approved! Your trust score increased by 10.',
            confidence: analysis.confidence,
            detectedIssues: analysis.detectedIssues || []
          });
        }
      } else {
        report.status = 'rejected';
        report.aiConfidence = analysis.confidence;
        report.aiReason = analysis.reason;
        report.reviewedAt = new Date();
        
        this.logStep('REJECTED', `Confidence: ${analysis.confidence}% - ${analysis.reason}`);
        
        if (io) {
          io.to(report.userId._id.toString()).emit('report_verified', {
            reportId: report._id,
            status: 'rejected',
            message: `Report rejected - ${analysis.reason}`,
            confidence: analysis.confidence
          });
        }
      }

      await report.save();
      this.logStep('COMPLETED', 'Report verification complete');

      return {
        success: true,
        report: {
          id: report._id,
          status: report.status,
          confidence: report.aiConfidence,
          reason: report.aiReason
        }
      };

    } catch (error) {
      console.error('Verifier Agent Error:', error);
      this.logStep('ERROR', error.message);
      return { success: false, error: error.message };
    }
  }

  logStep(step, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] VERIFIER | ${step} | ${message}`;
    console.log(logEntry);
    
    if (this.io) {
      this.io.emit('verifier_log', { step, message, timestamp });
    }
  }
}

module.exports = VerifierAgent;