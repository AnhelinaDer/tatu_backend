const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const router = express.Router();
const prisma = new PrismaClient();

// Debug route to check token contents
router.get('/token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      message: 'Token contents:',
      decoded
    });
  } catch (err) {
    res.status(403).json({ message: 'Invalid token', error: err.message });
  }
});

// Debug route to check artist profile
router.get('/check-artist/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        artists: true
      }
    });

    if (!user) {
      return res.json({ message: 'User not found' });
    }

    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        hasArtistProfile: user.artists.length > 0,
        artistProfile: user.artists[0] || null
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error checking artist profile', error: err.message });
  }
});

module.exports = router; 