require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const requestIp = require('request-ip');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('./models/User'); // Adjust the path if necessary
const Payment = require('./models/Payment'); // Ensure this model is correctly defined

const app = express();
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

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

app.use(express.json());
app.use(requestIp.mw());

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Function to generate OTP
const generateOtp = () => {
  return crypto.randomBytes(3).toString('hex');
};

// Registration endpoint
app.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, ip, linkStatus, referralId } = req.body;

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

    const newUser = new User({
      name,
      phone,
      email,
      password,
      ip,
      coins: 0,
      linkStatus,
      referrer: referralId || null
    });

    await newUser.save();

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

// Request OTP endpoint
app.post('/request-otp/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 300000; // OTP expires in 5 minutes
    await user.save();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending OTP email:', error);
        return res.status(500).json({ message: 'Failed to send OTP email' });
      } else {
        console.log('OTP email sent:', info.response);
        res.json({ message: 'OTP sent to email' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to generate OTP' });
  }
});

// Verify OTP endpoint
app.post('/verify-otp/:userId', async (req, res) => {
  const { otp } = req.body;
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (!user.otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP expired or invalid' });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

app.post('/RemainsCoin/:userId', async (req, res) => {
  const { withdrawCoin, UpiId, checkPassword } = req.body;
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      console.error('User not found');
      return res.status(400).json({ message: 'User not found' });
    }

    const TotalCoin = user.coins;

    if (withdrawCoin > TotalCoin) {
      console.error('Requested withdrawal amount exceeds available coins');
      return res.status(400).json({ message: 'Coin is not available' });
    }
    if (checkPassword !== user.password) {
      console.error('Invalid password');
      return res.status(400).json({ message: 'Password is invalid' });
    }

    if (withdrawCoin < 500) {
      console.error('Withdrawal amount less than minimum required');
      return res.status(400).json({ message: 'Minimum withdraw amount is 500' });
    }

    // Verify OTP
    if (!user.otp || user.otpExpires < Date.now()) {
      console.error('OTP expired or invalid');
      return res.status(400).json({ message: 'OTP expired or invalid' });
    }
    if (req.body.otp !== user.otp) {
      console.error('Incorrect OTP');
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // OTP verification passed, process the withdrawal
    user.coins -= withdrawCoin;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Record the payment in the Payment model
    const newPayment = new Payment({
      userId: user._id,
      amount: withdrawCoin,
      upiId: UpiId,
      status: 'completed' // Update as per your logic
    });

    await newPayment.save();

    res.json({ message: 'Withdrawal successful', newBalance: user.coins });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ message: 'Failed to process withdrawal' });
  }
});


// Withdrawal history endpoint
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
