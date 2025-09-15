const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// MongoDB connection
const MONGODB_URI = "mongodb+srv://therapistAppUser:6sih6VkebUEAP86N@therapydb.pvfirzi.mongodb.net/";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB Atlas');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Client Schema
const clientSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Phone number must be 10 digits'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email'
    }
  },
  address: {
    type: String,
    trim: true
  },
  speechIssues: [{
    type: String,
    enum: ['articulation', 'voice', 'stuttering', 'language', 'apraxia', 'dysarthria', 'social', 'other']
  }],
  problemDescription: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 1000
  },
  referredBy: {
    type: String,
    trim: true
  },
  urgency: {
    type: String,
    enum: ['routine', 'moderate', 'urgent'],
    default: 'routine'
  },
  therapistId: {
    type: String,
    default: 'demo-therapist-1'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active'
  },
  sessions: {
    type: Number,
    default: 0
  },
  lastSession: {
    type: Date
  },
  // Progress tracking
  articulation: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  voice: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  stuttering: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Create indexes for better performance
clientSchema.index({ therapistId: 1, createdAt: -1 });
clientSchema.index({ phoneNumber: 1 }, { unique: true });

const Client = mongoose.model('Client', clientSchema);

// Routes

// Get all clients for a therapist
app.get('/api/clients', async (req, res) => {
  try {
    const { therapistId = 'demo-therapist-1' } = req.query;
    
    const clients = await Client.find({ therapistId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching clients',
      error: error.message
    });
  }
});

// Get a single client by ID
app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching client',
      error: error.message
    });
  }
});

// Add a new client
app.post('/api/clients', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      age,
      gender,
      phoneNumber,
      email,
      address,
      speechIssues,
      problemDescription,
      referredBy,
      urgency,
      therapistId
    } = req.body;

    // Validation
    if (!firstName || !lastName || !age || !gender || !phoneNumber || !problemDescription) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['firstName', 'lastName', 'age', 'gender', 'phoneNumber', 'problemDescription']
      });
    }

    // Check if phone number already exists
    const existingClient = await Client.findOne({ phoneNumber });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'A client with this phone number already exists'
      });
    }

    // Create new client
    const newClient = new Client({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age,
      gender,
      phoneNumber: phoneNumber.replace(/\D/g, ''), // Remove non-digits
      email: email?.trim(),
      address: address?.trim(),
      speechIssues: speechIssues || [],
      problemDescription: problemDescription.trim(),
      referredBy: referredBy?.trim(),
      urgency: urgency || 'routine',
      therapistId: therapistId || 'demo-therapist-1'
    });

    const savedClient = await newClient.save();

    res.status(201).json({
      success: true,
      message: 'Client added successfully',
      data: savedClient
    });

  } catch (error) {
    console.error('Error adding client:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A client with this phone number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding client',
      error: error.message
    });
  }
});

// Update a client
app.put('/api/clients/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;

    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updatedClient
    });

  } catch (error) {
    console.error('Error updating client:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating client',
      error: error.message
    });
  }
});

// Delete a client (soft delete by changing status)
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive', updatedAt: new Date() },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deactivated successfully',
      data: client
    });

  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting client',
      error: error.message
    });
  }
});

// Get dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { therapistId = 'demo-therapist-1' } = req.query;

    const totalClients = await Client.countDocuments({ therapistId, status: 'active' });
    const urgentClients = await Client.countDocuments({ therapistId, urgency: 'urgent', status: 'active' });
    
    // Get recent clients (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentClients = await Client.countDocuments({
      therapistId,
      status: 'active',
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get speech issues distribution
    const issuesAggregation = await Client.aggregate([
      { $match: { therapistId, status: 'active' } },
      { $unwind: '$speechIssues' },
      { $group: { _id: '$speechIssues', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        urgentClients,
        recentClients,
        speechIssuesDistribution: issuesAggregation
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

// Search clients
app.get('/api/clients/search', async (req, res) => {
  try {
    const { q, therapistId = 'demo-therapist-1' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchRegex = new RegExp(q, 'i'); // Case-insensitive search

    const clients = await Client.find({
      therapistId,
      status: 'active',
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phoneNumber: searchRegex },
        { email: searchRegex }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: clients,
      count: clients.length
    });

  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching clients',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});