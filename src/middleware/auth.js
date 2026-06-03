const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id }
    });

    if (!admin || admin.deletedAt) {
      return res.status(401).json({ success: false, message: 'Admin not found or deactivated' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.admin.role} is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
