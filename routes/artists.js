const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const {
      cityIds,
      styleIds,
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Input validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10)); // Cap at 50 items per page
    const skip = (pageNum - 1) * limitNum;

    // Base where clause
    let where = {};

    // Add cities filter if provided
    if (cityIds) {
      // Handle both array and single value
      const cityIdArray = Array.isArray(cityIds) ? cityIds : [cityIds];
      const parsedCityIds = cityIdArray
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));

      if (parsedCityIds.length > 0) {
        where.cityId = {
          in: parsedCityIds
        };
      }
    }

    // Add search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      where.users = {
        OR: [
          { firstName: { contains: searchLower } },
          { lastName: { contains: searchLower } }
        ]
      };
    }

    // Add styles filter if provided
    if (styleIds) {
      // Handle both array and single value
      const styleIdArray = Array.isArray(styleIds) ? styleIds : [styleIds];
      const parsedStyleIds = styleIdArray
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));

      if (parsedStyleIds.length > 0) {
        where.artiststyles = {
          some: {
            styleId: {
              in: parsedStyleIds
            }
          }
        };
      }
    }

    // Get total count for pagination
    const totalArtists = await prisma.artists.count({ where });
    const totalPages = Math.ceil(totalArtists / limitNum);

    // Get artists with all necessary relations
    const artists = await prisma.artists.findMany({
      where,
      skip,
      take: limitNum,
      select: {
        artistId: true,
        users: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        cityId: true,
        cities: {
          select: {
            name: true,
            countryName: true
          }
        },
        artistDescription: true,
        streetAddress: true,
        instagramLink: true,
        portfolioLink: true,
        imageURL: true,
        artiststyles: {
          select: {
            styles: {
              select: {
                styleId: true,
                styleName: true
              }
            }
          }
        }
      },
      orderBy: {
        artistId: 'desc'
      }
    });

    // Format the response
    const formattedArtists = artists.map(artist => ({
      artistId: artist.artistId,
      userId: artist.users.userId,
      firstName: artist.users.firstName,
      lastName: artist.users.lastName,
      email: artist.users.email,
      city: artist.cities ? {
        id: artist.cityId,
        name: artist.cities.name,
        country: artist.cities.countryName
      } : null,
      description: artist.artistDescription,
      address: artist.streetAddress,
      social: {
        instagram: artist.instagramLink,
        portfolio: artist.portfolioLink
      },
      imageURL: artist.imageURL,
      styles: artist.artiststyles.map(as => ({
        id: as.styles.styleId,
        name: as.styles.styleName
      }))
    }));

    res.status(200).json({
      artists: formattedArtists,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalArtists,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });

  } catch (err) {
    console.error('GET /artists error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch artists',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
