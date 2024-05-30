require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const requestIp = require('request-ip');
const User = require('./models/User');
const Payment = require('./models/Payment');

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

      // Check if the user has visited at least 4 links
      const visitedLinks = user.linkStatus.filter(status => status).length;
      if (visitedLinks >= 4 && user.referrer) {
        const referringUser = await User.findById(user.referrer);
        if (referringUser) {
          referringUser.coins += 50;
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


app.get('/profiles/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
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

    const newPayment = new Payment({ Name, withdrawCoin, UpiId });
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
        return res.status(400).json({ message: 'You have already registered on this device' });
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
      res.status(500).json({ message: 'Registration failed', error: error.message });
    }
  }
});

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

app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});
