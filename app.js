const express = require('express');
const app = express();
const paymentRoutes = require('./routes/paymentRoutes');

app.use(express.json());
app.get('/health', (req, res) => {
    res.json({
        status: "ok", message: "Utility Payment API is running",
    });
});
app.use('/payments', paymentRoutes);

module.exports = app;