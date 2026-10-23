const express = require('express');
const app = express();
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => {
    res.json({
        status: "ok", message: "Utility Payment API is running",
    });
});
app.use('/payments', paymentRoutes);
app.use('/auth', authRoutes);

module.exports = app;