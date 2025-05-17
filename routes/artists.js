const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const {
      cityId,
      styleId,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const filters = {
      isArtist: true
    };

    if (cityId) {
      filters.cityId = parseInt(cityId);
    }

    if (search) {
      filters.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build base artist query
    let artistQuery = {
      where: filters,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        cityId: true,
        imageURL: true,
        artistDescription: true,
        portfolioLink: true,
        instagramLink: true
      }
    };

    // If filtering by style, do a join
    if (styleId) {
      artistQuery.where.AND = [
        ...[artistQuery.where],
        {
          artistStyles: {
            some: {
              styleId: parseInt(styleId)
            }
          }
        }
      ];
    }

    const artists = await prisma.users.findMany(artistQuery);

    res.status(200).json({ artists });
  } catch (err) {
    console.error('Get /artists error:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

module.exports = router;
