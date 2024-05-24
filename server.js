require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const requestIp = require('request-ip');
const bcrypt = require('bcrypt'); // For password hashing
const User = require('./models/User'); // Ensure this path is correct
const Payment = require('./models/Payment'); // Ensure this path is correct

const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable for port

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

const corsOptions = {
  origin: [
    "https://click-and-win.netlify.app",
    "https://backend-recent-1.onrender.com",
    "http://localhost:3000"
  ],
  optionsSuccessStatus: 200,
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

app.use(express.json());
app.use(requestIp.mw());

// Endpoint to update link status and user coins
app.post('/update-link', async (req, res) => {
  const { userId, linkIndex } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.coins += 10;
    user.linkStatus[linkIndex] = true;
    await user.save();

    res.json({ message: 'Link updated successfully', user });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to update link' });
  }
});

// Endpoint to fetch user profile by ID
app.get('/profiles/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      name: user.name,
      coins: user.coins || 0,
      linkStatus: user.linkStatus || [],
      userId: user._id
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
});

// Endpoint to fetch personal user details by ID
app.get('/personal/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      name: user.name,
      coins: user.coins || 0,
      id: user._id,
      ip: user.ip
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to fetch profile details' });
  }
});

// Endpoint to handle coin withdrawal
app.post('/RemainsCoin/:userId', async (req, res) => {
  const { withdrawCoin, UpiId, userId, checkPassword } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isMatch = await bcrypt.compare(checkPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    
    if (withdrawCoin > user.coins) {
      return res.status(400).json({ message: 'Insufficient coins' });
    }

    if (withdrawCoin < 500) {
      return res.status(400).json({ message: 'Minimum withdraw amount is 500' });
    }

    const newPayment = new Payment({ Name: user.name, withdrawCoin, UpiId });
    await newPayment.save();

    user.coins -= withdrawCoin;
    await user.save();

    res.json({ message: 'Withdrawal successful', user });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to process withdrawal' });
  }
});

// Endpoint to register a new user
// Endpoint to register a new user
app.post('/register', async (req, res) => {
  const { name, phone, email, password, ip } = req.body;

  try {
    // Check if email is provided
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if a user with the provided email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check if a user with the provided IP already exists
    const existingIP = await User.findOne({ ip });
    if (existingIP) {
      return res.status(400).json({ message: 'You have already registered on this device' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user object
    const newUser = new User({ name, phone, email, password: hashedPassword, ip, coins: 0 });

    // Save the new user to the database
    await newUser.save();

    // Return success message
    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Error:', error);
    // Handle MongoDB errors (such as duplicate key error)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    // Other errors
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Endpoint to handle user login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    res.json({ message: 'Login successful', userId: user._id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.listen(PORT, () => {
  console.log("Server is running on port"+PORT);
});