const express = require('express');
const app = express();
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');

app.use(express.json());
app.get('/health', (req, res) => {
    res.json({
        status: "ok", message: "Utility Payment API is running",
    });
});
app.use('/payments', paymentRoutes);
app.use('/auth', authRoutes);

module.exports = app;