const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  console.log('Auth Debug - Headers:', req.headers);
  console.log('Auth Debug - Token:', token);

  if (!token) {
    console.log('Auth Debug - No token provided');
    return res.status(401).json({ error: 'Token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Auth Debug - Token verification error:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }

    console.log('Auth Debug - Decoded user:', user);
    req.user = user; // contains userId and boolean isArtist
    next();
  });
}

module.exports = authenticateToken;
