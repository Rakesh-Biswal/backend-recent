require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const requestIp = require('request-ip');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const User = require('./models/User');
const Payment = require('./models/Payment'); // Ensure this model is correctly defined
const Link = require('./models/Link'); // Link model to be created
const Statistics = require('./models/Statistics');
const UserDetails = require('./models/UserDetails');
const Ad = require('./models/adSchema'); // Import the schema

const app = express();
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

const corsOptions = {
  origin: [
    'https://click-and-win.netlify.app',
    'https://backend-recent-2.onrender.com',
    'http://localhost:3000',
  ],
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(requestIp.mw());

// Registration endpoint
app.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, ip, linkStatus, referralId, uniqueIdentifier } = req.body;
    const clientIp = req.clientIp;

    const existingUser = await User.findOne({
      $or: [
        { email },
        { phone },
        { uniqueIdentifier },
        { ip: clientIp },
        { ip }
      ],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      } else if (existingUser.phone === phone) {
        return res.status(400).json({ message: 'Mobile number already exists' });
      } else if (existingUser.uniqueIdentifier === uniqueIdentifier) {
        return res.status(400).json({ message: 'You have Already registered' });
      } else {
        return res.status(400).json({ message: 'Already registered on this network' });
      }
    }

    const newUser = new User({
      name,
      phone,
      email,
      password,
      ip: clientIp,
      coins: 0,
      linkStatus,
      referrer: referralId || null,
      uniqueIdentifier
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
  const clientIp = req.clientIp;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    if (user.chromeIp) {
      
      if (user.chromeIp === clientIp) {

        return res.json({ message: 'Login successful', userId: user._id });
      } else {

        return res.status(400).json({ message: 'Multiple Accounnt Do not Accepted' });
      }
    } else {

      user.chromeIp = clientIp;
      const existingIpUser = await User.findOne({ chromeIp: clientIp });
      if (existingIpUser) {
        return res.status(400).json({ message: 'This is not Your Account..' });
      }
      await user.save();
      return res.json({ message: 'Login successful and IP set', userId: user._id });
    }
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});




app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === "ABR@gmail.com" && password === "abr123") {
    res.json({ message: 'Admin login successful' });
  } else {
    res.status(400).json({ message: 'Invalid admin credentials' });
  }
});

// Fetch links endpoint
app.get('/links', async (req, res) => {
  try {
    const links = await Link.find();
    res.json(links);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ message: 'Failed to fetch links' });
  }
});

// Update links endpoint (admin)
app.post('/links', async (req, res) => {
  const { links } = req.body;
  try {
    await Link.insertMany(links); // Insert new links
    res.json({ message: 'Links updated successfully' });
  } catch (error) {
    console.error('Error updating links:', error);
    res.status(500).json({ message: 'Failed to update links' });
  }
});

// Update link status endpoint (user)
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

      // Update link click statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let stats = await Statistics.findOne({ date: today });
      if (stats) {
        stats.linkClicks++;
      }
      await stats.save();

      // const visitedLinks = user.linkStatus.filter((status) => status).length;
      // if (visitedLinks >= 4 && user.referrer) {
      //   const referringUser = await User.findById(user.referrer);
      //   if (referringUser && !referringUser.referrals.includes(user._id)) {
      //     referringUser.coins += 50;
      //     referringUser.referralCoins += 50;
      //     referringUser.referrals.push(user._id);
      //     await referringUser.save();
      //   }
      // }
    }

    res.json({ message: 'Link updated successfully', user });
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ message: 'Failed to update link' });
  }
});



app.get('/statistics', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let stats = await Statistics.findOne({ date: today });
    if (!stats) {
      stats = new Statistics({ date: today, linkClicks: 0 });
      await stats.save();
    }

    const totalUsers = await User.countDocuments();

    res.json({
      linkClicksToday: stats.linkClicks,
      totalUsers: totalUsers,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});



app.get('/statistics/date', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    let stats = await Statistics.findOne({ date: selectedDate });
    if (!stats) {
      return res.status(404).json({ message: 'No data found for the selected date' });
    }

    res.json({ linkClicks: stats.linkClicks });
  } catch (error) {
    console.error('Error fetching statistics by date:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
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
      referrals: user.referrals.map((ref) => ({ name: ref.name })),
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to get user profile' });
  }
});

// Personal profile endpoint
app.get('/personal/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const totalReferrals = user.referrals.length;
    const totalUnvisitedLinks = user.linkStatus.filter(status => !status).length;

    res.json({
      name: user.name,
      coins: user.coins || 0,
      id: user._id,
      ip: user.ip,
      totalReferrals: totalReferrals,
      totalUnvisitedLinks: totalUnvisitedLinks,
    });
  } catch (error) {
    console.error('Error fetching personal profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile details' });
  }
});



app.post('/buyer-user', async (req, res) => {
  const { mobile, nickname } = req.body;

  try {
    const existingUser = await UserDetails.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ message: 'Mobile number already exists' });
    }

    const newUserDetails = new UserDetails({ mobile, nickname });
    await newUserDetails.save();

    res.json({ message: 'Thanks For being Connect with Us..! We will contact you very soon...' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Sending failed' });
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

    if (withdrawCoin < 750) {
      return res.status(400).json({ message: 'Minimum withDraw Amount = 750' });
    }

    const Name = user.name;
    const PhoneNo = user.phone;

    const newPayment = new Payment({ Name, withdrawCoin, UpiId, userId, PhoneNo });
    await newPayment.save();

    const RemainCoin = TotalCoin - withdrawCoin;

    user.coins = RemainCoin;
    await user.save();

    res.json({ message: 'Withdrawal successful', user });
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



app.post('/withdrawal-requests/approve', async (req, res) => {
  const { requestId } = req.body;

  try {
    const payment = await Payment.findById(requestId);
    if (!payment) {
      return res.status(400).json({ message: 'Withdrawal request not found' });
    }

    payment.status = 'approved';
    await payment.save();

    res.json({ message: 'Withdrawal request approved successfully' });
  } catch (error) {
    console.error('Error approving withdrawal request:', error);
    res.status(500).json({ message: 'Failed to approve withdrawal request' });
  }
});


app.post('/withdrawal-requests/reject', async (req, res) => {
  const { requestId } = req.body;

  try {
    const payment = await Payment.findById(requestId);
    if (!payment) {
      return res.status(400).json({ message: 'Withdrawal request not found' });
    }


    payment.status = 'rejected';
    await payment.save();


    const user = await User.findById(payment.userId);
    if (user) {

      user.coins += payment.withdrawCoin;
      await user.save();
    }

    res.json({ message: 'Withdrawal request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting withdrawal request:', error);
    res.status(500).json({ message: 'Failed to reject withdrawal request' });
  }
});




app.get('/withdrawal-requests', async (req, res) => {
  try {
    const pendingRequests = await Payment.find({ status: 'pending' });
    res.json(pendingRequests);
  } catch (error) {
    console.error('Error fetching pending withdrawal requests:', error);
    res.status(500).json({ message: 'Failed to fetch pending withdrawal requests' });
  }
});



app.post('/admin/update-ad', async (req, res) => {
  const { linkIndex, adLink, adImage } = req.body;

  try {
    const updatedAd = await Ad.findOne({ linkIndex });
    if (updatedAd) {
      return res.status(400).json({ message: 'Index number already exists' });
    }
    const NewAdUpdate = new Ad({ linkIndex, adLink, adImage });
    await NewAdUpdate.save();
    res.json({ message: 'Thanks For Ad Updating...' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update ad', error });
  }
});

// Endpoint to fetch ad data
app.get('/admin/get-ad', async (req, res) => {
  try {
    const ad = await Ad.findOne();
    if (ad) {
      res.json(ad);
    } else {
      res.status(404).json({ message: 'Ad not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get('/api/ping', (req, res) => {
  res.status(200).send('Server is up and running');
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
