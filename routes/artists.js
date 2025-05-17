const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
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

// Get specific artist by ID with all details
router.get('/:id', async (req, res) => {
  try {
    const artistId = parseInt(req.params.id);

    if (isNaN(artistId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artist ID format'
      });
    }

    const artist = await prisma.artists.findUnique({
      where: {
        artistId: artistId
      },
      select: {
        artistId: true,
        users: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        cities: {
          select: {
            cityId: true,
            name: true,
            countryName: true
          }
        },
        artistDescription: true,
        streetAddress: true,
        instagramLink: true,
        portfolioLink: true,
        imageURL: true,
        membershipFee: true,
        createdAt: true,
        // Get all styles
        artiststyles: {
          select: {
            styles: {
              select: {
                styleId: true,
                styleName: true,
                description: true
              }
            }
          }
        },
        // Get all tattoos with their styles
        tattoos: {
          select: {
            tattooId: true,
            tattooName: true,
            imageURL: true,
            tattoostyles: {
              select: {
                styles: {
                  select: {
                    styleId: true,
                    styleName: true
                  }
                }
              }
            }
          }
        },
        // Get upcoming appointments
        appointmentslots: {
          where: {
            dateTime: {
              gte: new Date()
            },
            isBooked: false
          },
          select: {
            slotId: true,
            dateTime: true,
            duration: true
          },
          orderBy: {
            dateTime: 'asc'
          }
        },
        // Get reviews through bookings
        bookings_bookings_artistIdTousers: {
          where: {
            reviews: {
              some: {}
            }
          },
          select: {
            reviews: {
              select: {
                reviewId: true,
                rating: true,
                comment: true,
                createdAt: true,
                users: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Calculate average rating
    const reviews = artist.bookings_bookings_artistIdTousers.flatMap(booking => booking.reviews);
    const totalRatings = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = reviews.length > 0 ? totalRatings / reviews.length : null;

    // Format the response
    const formattedArtist = {
      artistId: artist.artistId,
      user: {
        userId: artist.users.userId,
        firstName: artist.users.firstName,
        lastName: artist.users.lastName,
        email: artist.users.email,
        phoneNumber: artist.users.phoneNumber
      },
      location: artist.cities ? {
        cityId: artist.cities.cityId,
        city: artist.cities.name,
        country: artist.cities.countryName,
        address: artist.streetAddress
      } : null,
      description: artist.artistDescription,
      social: {
        instagram: artist.instagramLink,
        portfolio: artist.portfolioLink
      },
      imageURL: artist.imageURL,
      membershipFee: artist.membershipFee,
      createdAt: artist.createdAt,
      styles: artist.artiststyles.map(as => ({
        id: as.styles.styleId,
        name: as.styles.styleName,
        description: as.styles.description
      })),
      tattoos: artist.tattoos.map(tattoo => ({
        id: tattoo.tattooId,
        name: tattoo.tattooName,
        imageURL: tattoo.imageURL,
        styles: tattoo.tattoostyles.map(ts => ({
          id: ts.styles.styleId,
          name: ts.styles.styleName
        }))
      })),
      availableSlots: artist.appointmentslots.map(slot => ({
        id: slot.slotId,
        dateTime: slot.dateTime,
        duration: slot.duration
      })),
      reviews: {
        average: averageRating,
        total: reviews.length,
        items: reviews.map(review => ({
          id: review.reviewId,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          reviewer: {
            firstName: review.users.firstName,
            lastName: review.users.lastName
          }
        }))
      }
    };

    res.status(200).json({
      success: true,
      artist: formattedArtist
    });

  } catch (err) {
    console.error('GET /artists/:id error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch artist details',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Update artist profile
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const artistId = parseInt(req.params.id);
    const userId = req.user.userId;

    // Verify the artist exists and belongs to the authenticated user
    const existingArtist = await prisma.artists.findUnique({
      where: { artistId },
      select: { userId: true }
    });

    if (!existingArtist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Check if the authenticated user owns this artist profile
    if (existingArtist.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this artist profile'
      });
    }

    const {
      cityId,
      artistDescription,
      streetAddress,
      instagramLink,
      portfolioLink,
      imageURL,
      styleIds
    } = req.body;

    // Start a transaction to handle both artist update and styles update
    const updatedArtist = await prisma.$transaction(async (prisma) => {
      // Prepare artist update data
      const updateData = {};

      // Only include fields that are provided
      if (cityId) updateData.cityId = parseInt(cityId);
      if (artistDescription !== undefined) updateData.artistDescription = artistDescription;
      if (streetAddress !== undefined) updateData.streetAddress = streetAddress;
      if (instagramLink !== undefined) updateData.instagramLink = instagramLink;
      if (portfolioLink !== undefined) updateData.portfolioLink = portfolioLink;
      if (imageURL !== undefined) updateData.imageURL = imageURL;

      // Update artist profile
      const artist = await prisma.artists.update({
        where: { artistId },
        data: updateData,
        select: {
          artistId: true,
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
          membershipFee: true,
          users: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Update artist styles if provided
      if (styleIds && Array.isArray(styleIds)) {
        // Remove existing styles
        await prisma.artiststyles.deleteMany({
          where: { artistId }
        });

        // Add new styles
        if (styleIds.length > 0) {
          const styleLinks = styleIds.map(styleId => ({
            artistId,
            styleId: parseInt(styleId)
          }));

          await prisma.artiststyles.createMany({
            data: styleLinks
          });
        }

        // Get updated styles
        const styles = await prisma.artiststyles.findMany({
          where: { artistId },
          select: {
            styles: {
              select: {
                styleId: true,
                styleName: true,
                description: true
              }
            }
          }
        });

        return { ...artist, styles };
      }

      return artist;
    });

    // Format the response
    const formattedArtist = {
      artistId: updatedArtist.artistId,
      user: {
        firstName: updatedArtist.users.firstName,
        lastName: updatedArtist.users.lastName,
        email: updatedArtist.users.email
      },
      location: {
        cityId: updatedArtist.cityId,
        city: updatedArtist.cities?.name,
        country: updatedArtist.cities?.countryName,
        address: updatedArtist.streetAddress
      },
      description: updatedArtist.artistDescription,
      social: {
        instagram: updatedArtist.instagramLink,
        portfolio: updatedArtist.portfolioLink
      },
      imageURL: updatedArtist.imageURL,
      membershipFee: updatedArtist.membershipFee,
      styles: updatedArtist.styles ? updatedArtist.styles.map(style => ({
        id: style.styles.styleId,
        name: style.styles.styleName,
        description: style.styles.description
      })) : undefined
    };

    res.status(200).json({
      success: true,
      message: 'Artist profile updated successfully',
      artist: formattedArtist
    });

  } catch (err) {
    console.error('PATCH /artists/:id error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update artist profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
