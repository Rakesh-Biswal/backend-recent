// Import necessary modules
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const requestIp = require('request-ip');
const nodemailer = require('nodemailer'); // Import nodemailer for sending emails
const User = require('./models/User'); // Adjust the path if necessary
const Payment = require('./models/Payment'); // Ensure this model is correctly defined

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

// CORS configuration
const corsOptions = {
  origin: [
    'https://click-and-win.netlify.app',
    'https://backend-recent-2.onrender.com',
    'http://localhost:3000'
  ],
  optionsSuccessStatus: 200,
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use(requestIp.mw());

// Function to generate OTP
function generateOTP() {
  // Generate a 6-digit random number as OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to send OTP to user's email
async function sendOTP(email) {
  // Generate OTP
  const otp = generateOTP();

  // Create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'rb2306114@gmail.com', // Your Gmail address
      pass: 'Rinku rakesh' // Your Gmail password
    }
  });

  // Email message options
  let mailOptions = {
    from: 'rb2306114@gmail.com', // Sender address
    to: email, // Receiver address
    subject: 'OTP Verification', // Subject line
    text: `Your OTP for registration is: ${otp}` // Plain text body
  };

  // Send email with defined transport object
  await transporter.sendMail(mailOptions);

  // Return the generated OTP
  return otp;
}

// Registration endpoint
app.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, ip, referralId } = req.body;

    // Verify OTP
    const userOTP = req.body.otp;
    if (!userOTP) {
      return res.status(400).json({ message: 'OTP is required' });
    }
    // Check if OTP provided by user matches the generated OTP
    const otpMatch = await User.findOne({ email, otp: userOTP });
    if (!otpMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { ip }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      } else if (existingUser.phone === phone) {
        return res.status(400).json({ message: 'Mobile number already exists' });
      } else {
        return res.status(400).json({ message: 'Already registered on this device/Network' });
      }
    }

    // Create new user
    const newUser = new User({
      name,
      phone,
      email,
      password,
      ip,
      coins: 0,
      linkStatus: [],
      referrer: referralId || null,
      otp: null // Clear OTP after registration
    });

    await newUser.save();

    // Clear OTP after registration
    await User.findOneAndUpdate({ email }, { otp: null });

    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Error during registration:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Duplicate key error' });
    } else {
      res.status(500).json({ message: 'Registration failed' });
    }
  }
});


// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    res.json({ message: 'Login successful', userId: user._id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Update link endpoint
app.post('/update-link', async (req, res) => {
  const { userId, linkIndex } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (!user.linkStatus[linkIndex]) {
      user.linkStatus[linkIndex] = true;
      user.coins += 10;
      await user.save();


      const visitedLinks = user.linkStatus.filter(status => status).length;
      if (visitedLinks >= 4 && user.referrer) {
        const referringUser = await User.findById(user.referrer);
        if (referringUser && !referringUser.referrals.includes(user._id)) {
          referringUser.coins += 50;
          referringUser.referralCoins += 50;
          referringUser.referrals.push(user._id);
          await referringUser.save();
        }

      }

    }

    res.json({ message: 'Link updated successfully', user });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to update link' });
  }
});

// Profiles endpoint
app.get('/profiles/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId).populate('referrals', 'name');
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    res.json({
      name: user.name,
      coins: user.coins || 0,
      linkStatus: user.linkStatus || [],
      userId: user._id,
      referralCoins: user.referralCoins || 0,
      referrals: user.referrals.map(ref => ({ name: ref.name })),
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to get user profile' });
  }
});

// Personal endpoint
app.get('/personal/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
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


// Remains Coin endpoint
app.post('/RemainsCoin/:userId', async (req, res) => {
  const { withdrawCoin, UpiId, checkPassword } = req.body;
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const TotalCoin = user.coins;

    if (withdrawCoin > TotalCoin) {
      return res.status(400).json({ message: 'Coin is not available' });
    }
    if (checkPassword !== user.password) {
      return res.status(400).json({ message: 'Password Is Invalid' });
    }

    if (withdrawCoin < 500) {
      return res.status(400).json({ message: 'Minimum withDraw Amount = 500' });
    }

    const Name = user.name;

    const newPayment = new Payment({ Name, withdrawCoin, UpiId, userId });
    await newPayment.save();

    const RemainCoin = TotalCoin - withdrawCoin;

    user.coins = RemainCoin;
    await user.save();

    res.json({ message: 'Withdrawal successful', user });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to process withdrawal' });
  }
});



app.get('/withdrawal-history/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });

    if (!payments) {
      return res.status(400).json({ message: 'No withdrawal history found' });
    }

    res.json(payments);
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawal history' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});