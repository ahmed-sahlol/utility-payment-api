require('dotenv').config();
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
const app = require('./app');
const paymentService = require('./services/paymentService');

const PORT = process.env.PORT || 3000;
const RECOVERY_INTERVAL_MS = 60 * 1000;

let isRecoveryRunning = false;
let recoveryInterval;

const runPaymentRecovery = async () => {
    if (isRecoveryRunning) return;
    isRecoveryRunning = true;
    try {
        const recoveredPayments = await paymentService.recoverStaleProcessingPayments();
        if (recoveredPayments.length > 0) console.log(`Recovered ${recoveredPayments.length} stale payment(s)`);
    } catch (error) {
        console.error('Payment recovery failed:', error);
    } finally {
        isRecoveryRunning = false;
    }
};

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    void runPaymentRecovery();
    recoveryInterval = setInterval(runPaymentRecovery, RECOVERY_INTERVAL_MS);
});

const shutdown = () => {
    console.log('Shutting down server...');
    clearInterval(recoveryInterval);
    server.close(async () => {
        try {
            await require('./db').end();
            console.log('Database pool closed');
            process.exit(0);
        } catch (error) {
            console.error('Error closing database pool:', error);
            process.exit(1);
        }
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);