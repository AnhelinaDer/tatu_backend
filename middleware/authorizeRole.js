const jwt = require('jsonwebtoken');
require('dotenv').config();

function authorizeRole(...roles) {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Access denied' });
      }
      next();
    };
}
  
module.exports = authorizeRole;