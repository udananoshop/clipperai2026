const jwt = require('jsonwebtoken');

// ============================================================
// LOCAL DEVELOPMENT BYPASS TOKEN
// This is for local development only - remove in production!
// ============================================================
const BYPASS_TOKEN = "clipperai_bypass_token";

// 🔐 SECURITY PATCH: Implement real JWT authentication
const authMiddleware = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  // Check if Authorization header exists
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  
  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
  }
  
  const token = parts[1];
  
  // ============================================================
  // LOCAL DEVELOPMENT: Check for bypass token
  // Remove this block in production!
  // ============================================================
  if (token === BYPASS_TOKEN) {
    console.log('[AUTH] Bypass token accepted for local development');
    // Set a dummy user for local development
    req.user = {
      id: 1,
      username: 'local_user',
      role: 'admin',
      isLocalDev: true
    };
    return next();
  }
  
  // ============================================================
  // PRODUCTION: Validate JWT token
  // ============================================================
  // Validate JWT token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Token validation failed' });
  }
};

module.exports = authMiddleware;
