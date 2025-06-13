const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'public/uploads/tattoos');
    console.log('Upload directory:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating upload directory');
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('Received file:', file);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Get all tattoos for an artist
router.get('/artists/tattoos', authenticateToken, async (req, res) => {
  try {
    console.log('GET /artists/tattoos - User:', req.user);
    
    if (!req.user || !req.user.artistId) {
      console.log('GET /artists/tattoos - Not an artist:', req.user);
      return res.status(403).json({ 
        message: 'Only artists can access tattoos. Please ensure you are logged in as an artist.',
        user: req.user 
      });
    }

    const artistId = req.user.artistId;
    console.log('Fetching tattoos for artistId:', artistId);
    
    const tattoos = await prisma.tattoos.findMany({
      where: { artistId },
      include: {
        tattoostyles: {
          include: {
            styles: true
          }
        }
      }
    });
    
    console.log('Found tattoos:', tattoos);
    res.json(tattoos);
  } catch (error) {
    console.error('Error in GET /artists/tattoos:', error);
    res.status(500).json({ 
      message: 'Error fetching tattoos',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Upload a new tattoo
router.post('/artists/tattoos', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('POST /artists/tattoos - Request received');
    console.log('Auth user:', req.user);
    console.log('File:', req.file);
    console.log('Body:', req.body);

    if (!req.user || !req.user.artistId) {
      console.log('POST /artists/tattoos - Not an artist:', req.user);
      // Delete the uploaded file if it exists
      if (req.file) {
        const filePath = path.join(__dirname, '..', 'public/uploads/tattoos', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(403).json({ 
        message: 'Only artists can upload tattoos. Please ensure you are logged in as an artist.',
        user: req.user 
      });
    }

    const artistId = req.user.artistId;
    const { name, styleIds } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    if (!name) {
      // Delete the uploaded file
      const filePath = path.join(__dirname, '..', 'public/uploads/tattoos', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: 'Tattoo name is required' });
    }

    if (!styleIds || !Array.isArray(styleIds) || styleIds.length === 0) {
      // Delete the uploaded file
      const filePath = path.join(__dirname, '..', 'public/uploads/tattoos', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: 'At least one style must be selected' });
    }

    console.log('Creating tattoo with data:', {
      artistId,
      name,
      styleIds,
      filename: req.file.filename
    });

    const imageURL = `/uploads/tattoos/${req.file.filename}`;

    const tattoo = await prisma.tattoos.create({
      data: {
        artistId,
        tattooName: name,
        imageURL,
        tattoostyles: {
          create: styleIds.map(styleId => ({
            styleId: parseInt(styleId)
          }))
        }
      },
      include: {
        tattoostyles: {
          include: {
            styles: true
          }
        }
      }
    });

    console.log('Tattoo created successfully:', tattoo);
    res.status(201).json(tattoo);
  } catch (error) {
    // Delete the uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'public/uploads/tattoos', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    console.error('Error in POST /artists/tattoos:', error);
    res.status(500).json({ 
      message: 'Error creating tattoo', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete a tattoo
router.delete('/artists/tattoos/:tattooId', authenticateToken, async (req, res) => {
  try {
    const { tattooId } = req.params;
    const artistId = req.user.artistId; // Assuming you have authentication middleware

    // Verify the tattoo belongs to the artist
    const tattoo = await prisma.tattoos.findFirst({
      where: {
        tattooId: parseInt(tattooId),
        artistId
      }
    });

    if (!tattoo) {
      return res.status(404).json({ message: 'Tattoo not found' });
    }

    // Delete the image file
    if (tattoo.imageURL) {
      const imagePath = path.join(__dirname, '..', 'public', tattoo.imageURL);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the tattoo and its related records
    await prisma.tattoostyles.deleteMany({
      where: { tattooId: parseInt(tattooId) }
    });

    await prisma.tattoos.delete({
      where: { tattooId: parseInt(tattooId) }
    });

    res.json({ message: 'Tattoo deleted successfully' });
  } catch (error) {
    console.error('Error deleting tattoo:', error);
    res.status(500).json({ message: 'Error deleting tattoo' });
  }
});

module.exports = router;
