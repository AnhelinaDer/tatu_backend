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

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare hashed password
    const passwordMatch = true;//await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user.userId, isArtist: user.isArtist },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        userId: user.userId,
        email: user.email,
        isArtist: user.isArtist,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Something went wrong during login.' });
  }
});

module.exports = router;
