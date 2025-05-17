const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

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

    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already in use.' });

    const hashedPassword = password;//await bcrypt.hash(password, 10);

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
router.post('/artist', async (req, res) => {
  try {
    const { session_id, password } = req.query;

    if (!session_id || !password) {
      return res.status(400).json({ message: 'Missing session ID or password.' });
    }

    // Get the Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(403).json({ message: 'Payment not completed.' });
    }

    const data = session.metadata;

    // Check if user exists
    const existing = await prisma.users.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        birthDate: new Date(data.birthDate)
      }
    });

    // Create artist profile
    const artist = await prisma.artists.create({
      data: {
        userId: user.userId,
        cityId: parseInt(data.cityId),
        artistDescription: data.artistDescription,
        streetAddress: data.streetAddress,
        instagramLink: data.instagramLink,
        portfolioLink: data.portfolioLink,
        imageURL: data.imageURL,
        membershipFee: 49.99
      }
    });

    // Add artist styles
    const styleIds = data.styleIds.split(',').map(id => parseInt(id));
    const styleLinks = styleIds.map(styleId => ({
      artistId: artist.artistId,
      styleId
    }));

    await prisma.artiststyles.createMany({ data: styleLinks });

    // Issue token
    const token = jwt.sign(
      { userId: user.userId, artistId: artist.artistId, isArtist: true },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'Artist registered after successful payment.',
      token,
      artistId: artist.artistId
    });
  } catch (err) {
    console.error('Artist post-payment register error:', err);
    res.status(500).json({ message: 'Registration failed after payment.' });
  }
});

module.exports = router;
