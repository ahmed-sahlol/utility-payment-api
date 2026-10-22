const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({message: 'Access token required'});

    const TOKEN = authHeader.split(' ');
    if (TOKEN[0] !== 'Bearer' || !TOKEN[1]) return res.status(401).json({message: 'Invalid authorization header'});
    const token = TOKEN[1];
    try {
        const check = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: check.sub };
    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
    next();
}