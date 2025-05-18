const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const prisma = new PrismaClient();

// Create new tattoo
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Verify the user is an artist
    const artist = await prisma.artists.findFirst({
      where: { userId }
    });

    if (!artist) {
      return res.status(403).json({
        success: false,
        message: 'Only artists can create tattoos'
      });
    }

    const {
      tattooName,
      imageURL,
      styleIds
    } = req.body;

    // Validate required fields
    if (!imageURL) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    if (!styleIds || !Array.isArray(styleIds) || styleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one style must be specified'
      });
    }

    // Create tattoo and assign styles in a transaction
    const newTattoo = await prisma.$transaction(async (prisma) => {
      // Create the tattoo
      const tattoo = await prisma.tattoos.create({
        data: {
          artistId: artist.artistId,
          tattooName: tattooName || null,
          imageURL
        }
      });

      // Create style associations
      const styleLinks = styleIds.map(styleId => ({
        tattooId: tattoo.tattooId,
        styleId: parseInt(styleId)
      }));

      await prisma.tattoostyles.createMany({
        data: styleLinks
      });

      // Fetch the complete tattoo data with related information
      return await prisma.tattoos.findUnique({
        where: {
          tattooId: tattoo.tattooId
        },
        select: {
          tattooId: true,
          tattooName: true,
          imageURL: true,
          artistId: true,
          users: {
            select: {
              artistId: true,
              users: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              imageURL: true
            }
          },
          tattoostyles: {
            select: {
              styles: {
                select: {
                  styleId: true,
                  styleName: true,
                  description: true
                }
              }
            }
          }
        }
      });
    });

    // Format the response
    const formattedTattoo = {
      id: newTattoo.tattooId,
      name: newTattoo.tattooName,
      imageURL: newTattoo.imageURL,
      artist: {
        artistId: newTattoo.users.artistId,
        firstName: newTattoo.users.users.firstName,
        lastName: newTattoo.users.users.lastName,
        imageURL: newTattoo.users.imageURL
      },
      styles: newTattoo.tattoostyles.map(ts => ({
        id: ts.styles.styleId,
        name: ts.styles.styleName,
        description: ts.styles.description
      }))
    };

    res.status(201).json({
      success: true,
      message: 'Tattoo created successfully',
      tattoo: formattedTattoo
    });

  } catch (err) {
    console.error('POST /tattoos error:', err);

    // Handle specific Prisma errors
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'One or more style IDs are invalid'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create tattoo',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Update existing tattoo
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const tattooId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(tattooId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tattoo ID format'
      });
    }

    // First, verify the tattoo exists and belongs to the authenticated artist
    const existingTattoo = await prisma.tattoos.findUnique({
      where: { tattooId },
      select: {
        users: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!existingTattoo) {
      return res.status(404).json({
        success: false,
        message: 'Tattoo not found'
      });
    }

    if (existingTattoo.users.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this tattoo'
      });
    }

    const {
      tattooName,
      imageURL,
      styleIds
    } = req.body;

    // Update tattoo and styles in a transaction
    const updatedTattoo = await prisma.$transaction(async (prisma) => {
      // Prepare update data
      const updateData = {};

      // Only include fields that are provided
      if (tattooName !== undefined) updateData.tattooName = tattooName;
      if (imageURL !== undefined) updateData.imageURL = imageURL;

      // Update the tattoo
      const tattoo = await prisma.tattoos.update({
        where: { tattooId },
        data: updateData
      });

      // Update styles if provided
      if (styleIds && Array.isArray(styleIds)) {
        // Remove existing styles
        await prisma.tattoostyles.deleteMany({
          where: { tattooId }
        });

        // Add new styles if any are provided
        if (styleIds.length > 0) {
          const styleLinks = styleIds.map(styleId => ({
            tattooId,
            styleId: parseInt(styleId)
          }));

          await prisma.tattoostyles.createMany({
            data: styleLinks
          });
        }
      }

      // Fetch updated tattoo with all related information
      return await prisma.tattoos.findUnique({
        where: { tattooId },
        select: {
          tattooId: true,
          tattooName: true,
          imageURL: true,
          artistId: true,
          users: {
            select: {
              artistId: true,
              users: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              imageURL: true
            }
          },
          tattoostyles: {
            select: {
              styles: {
                select: {
                  styleId: true,
                  styleName: true,
                  description: true
                }
              }
            }
          }
        }
      });
    });

    // Format the response
    const formattedTattoo = {
      id: updatedTattoo.tattooId,
      name: updatedTattoo.tattooName,
      imageURL: updatedTattoo.imageURL,
      artist: {
        artistId: updatedTattoo.users.artistId,
        firstName: updatedTattoo.users.users.firstName,
        lastName: updatedTattoo.users.users.lastName,
        imageURL: updatedTattoo.users.imageURL
      },
      styles: updatedTattoo.tattoostyles.map(ts => ({
        id: ts.styles.styleId,
        name: ts.styles.styleName,
        description: ts.styles.description
      }))
    };

    res.status(200).json({
      success: true,
      message: 'Tattoo updated successfully',
      tattoo: formattedTattoo
    });

  } catch (err) {
    console.error('PATCH /tattoos/:id error:', err);

    // Handle specific Prisma errors
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'One or more style IDs are invalid'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update tattoo',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
