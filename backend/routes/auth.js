const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      phone,
      password: hashedPassword
    });

    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, online: user.online, lastSeen: user.lastSeen, bio: user.bio, profilePicture: user.profilePicture, favorites: user.favorites || [], archived: user.archived || [], pinned: user.pinned || [], chatBackgrounds: user.chatBackgrounds || {}, settings: user.settings || { theme: 'dark', textSize: 16, disappearTime: 0 } } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, online: user.online, lastSeen: user.lastSeen, bio: user.bio, profilePicture: user.profilePicture, favorites: user.favorites || [], archived: user.archived || [], pinned: user.pinned || [], chatBackgrounds: user.chatBackgrounds || {}, settings: user.settings || { theme: 'dark', textSize: 16, disappearTime: 0 } } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
