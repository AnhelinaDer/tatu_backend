const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
      birthDate,
      streetAddress,
      cityId
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
        birthDate: new Date(birthDate),
        isArtist: false,
        streetAddress,
        cityId
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
    /*if (req.query.paid !== 'true') {
      return res.status(400).json({ message: 'Artist registration requires payment.' });
    }*/

    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      birthDate,
      artistDescription,
      instagramLink,
      portfolioLink,
      imageURL,
      streetAddress,
      cityId
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
        birthDate: new Date(birthDate),
        isArtist: true,
        artistDescription,
        instagramLink,
        portfolioLink,
        imageURL,
        streetAddress,
        cityId,
        membershipFee: 49.99
      }
    });

    const token = jwt.sign(
      { userId: newUser.userId, isArtist: true },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ message: 'Artist registered.', token });
  } catch (err) {
    console.error('Artist register error:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
