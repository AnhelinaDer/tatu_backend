const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();


// Register normal user (no payment)
router.post('/user', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      birthDate
    } = req.body;

    // Birth date validation
    if (!birthDate) {
      return res.status(400).json({ message: 'Birth date is required.' });
    }
    const dateParts = birthDate.split('-');
    if (dateParts.length !== 3 || dateParts[1] === '00' || dateParts[2] === '00') {
      return res.status(400).json({ message: 'Invalid birth date.' });
    }

    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already in use.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        birthDate: new Date(birthDate)
      }
    });

    const token = jwt.sign(
      { userId: newUser.userId, isArtist: false },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ message: 'User registered.', token });
  } catch (err) {
    console.error('User register error:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});


// Register artist (requires Stripe payment first)
router.post('/artist', authenticateToken, async (req, res) => {
  try {
    // Accept JSON body instead of query parameters
    const { artistDescription, cityId, styleIds } = req.body;
    if (!artistDescription || !cityId || !styleIds) {
      return res.status(400).json({ message: 'Missing required fields: artistDescription, cityId, and styleIds.' });
    }
    // Get the user ID from the token (assuming you have authentication middleware)
    const userId = req.user.userId;
    // Create artist profile
    const artist = await prisma.artists.create({
      data: {
        userId,
        cityId: parseInt(cityId),
        artistDescription,
        membershipFee: 49.99
      }
    });
    // Add artist styles
    const styleLinks = styleIds.map(styleId => ({
      artistId: artist.artistId,
      styleId: parseInt(styleId)
    }));
    await prisma.artiststyles.createMany({ data: styleLinks });
    // Issue token
    const token = jwt.sign(
      { userId, artistId: artist.artistId, isArtist: true },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(201).json({
      message: 'Artist registered successfully.',
      token,
      artistId: artist.artistId
    });
  } catch (err) {
    console.error('Artist register error:', err);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// Confirm artist registration after successful payment
router.post('/artist/confirm', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Get the artist registration data from session metadata
    const {
      artistDescription,
      cityId,
      styleIds
    } = session.metadata;

    // Create artist profile
    const artist = await prisma.artists.create({
      data: {
        userId,
        cityId: parseInt(cityId),
        artistDescription,
        membershipFee: 49.99
      }
    });

    // Add artist styles
    const styleLinks = styleIds.split(',').map(styleId => ({
      artistId: artist.artistId,
      styleId: parseInt(styleId)
    }));
    await prisma.artiststyles.createMany({ data: styleLinks });

    // Get updated user data
    const user = await prisma.users.findUnique({
      where: { userId },
      include: {
        artists: {
          select: {
            artistId: true
          }
        }
      }
    });

    // Issue new token with artist status
    const token = jwt.sign(
      { 
        userId, 
        artistId: artist.artistId, 
        isArtist: true 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Artist registration confirmed successfully',
      token,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isArtist: true,
        artistId: artist.artistId
      }
    });
  } catch (err) {
    console.error('Artist registration confirmation error:', err);
    res.status(500).json({ message: 'Failed to confirm artist registration' });
  }
});

module.exports = router;
