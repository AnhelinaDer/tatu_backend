const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all cities
router.get('/', async (req, res) => {
  try {
    const cities = await prisma.cities.findMany({
      select: {
        cityId: true,
        name: true,
        countryName: true,
      },
      orderBy: [
        { countryName: 'asc' },
        { name: 'asc' }
      ]
    });

    // Format the response
    const formattedCities = cities.map(city => ({
      id: city.cityId,
      name: city.name,
      country: city.countryName,
    }));

    res.status(200).json({
      success: true,
      cities: formattedCities
    });

  } catch (err) {
    console.error('GET /cities error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
