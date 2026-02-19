const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Report = require('../models/Report');
const VerifierAgent = require('../agents/verifierAgent');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Submit a new report
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { userId, reportType, description, lat, lng, locationName } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const report = new Report({
      userId,
      imageUrl: req.file.path,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      locationName: locationName || '',
      reportType: reportType || 'other',
      description: description || '',
      status: 'pending'
    });

    await report.save();

    // Trigger Verifier Agent asynchronously
    const io = req.app.get('io');
    const verifierAgent = new VerifierAgent(io);
    
    // Don't await - let it process in background
    verifierAgent.verifyReport(report._id, io).catch(console.error);

    res.status(201).json({
      success: true,
      report: {
        id: report._id,
        status: report.status,
        message: 'Report submitted successfully. AI verification in progress...'
      }
    });

  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's reports
router.get('/user/:userId', async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all reports (admin only)
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('userId', 'name email');
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;