const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const prisma = new PrismaClient();

/* Login route */
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);

    // Check if user exists with complete artist profile data
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        artists: {
          select: {
            artistId: true,
            cityId: true,
            artistDescription: true
          }
        }
      }
    });

    console.log('Found user:', JSON.stringify(user, null, 2));

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Create token with artistId if user has an artist profile
    const tokenPayload = {
      userId: user.userId,
      isArtist: false
    };

    // Check if user has an artist profile
    if (user.artists && user.artists.length > 0) {
      tokenPayload.isArtist = true;
      tokenPayload.artistId = user.artists[0].artistId;
      console.log('Found artist profile:', user.artists[0]);
    } else {
      console.log('No artist profile found');
    }

    console.log('Token payload:', tokenPayload);

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Add debug response to see token contents
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decodedToken);

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        userId: user.userId,
        email: user.email,
        isArtist: tokenPayload.isArtist,
        firstName: user.firstName,
        lastName: user.lastName,
        artistId: tokenPayload.artistId || null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Something went wrong during login.' });
  }
});

module.exports = router;
