require('dotenv').config();
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
const app = require('./app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});