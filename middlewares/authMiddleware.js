const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
require('dotenv').config();

const authMiddleware = (roles = []) => {
    // `roles` is an array of allowed roles, e.g., ['admin', 'farmer']
    return async (req, res, next) => {
        const token = req.header('Authorization')?.split(' ')[1]; // Bearer token

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id); // Attach user info to the request

            // If roles are provided, check if the user has the correct role
            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Access denied: insufficient role' });
            }

            next();
        } catch (error) {
            res.status(401).json({ message: 'Token is not valid' });
        }
    };
};

module.exports = authMiddleware;
