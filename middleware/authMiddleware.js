const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            message: 'Access token required'
        });
    }
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        return res.status(401).json({
            message: 'Invalid authorization header'
        });
    }
    const token = parts[1];
    try {
        const check = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {id: check.sub};
    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
    next();
};