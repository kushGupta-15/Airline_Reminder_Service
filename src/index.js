const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const { PORT, REMINDER_BINDING_KEY } = require('./config/serverConfig');
const emailService = require('./services/email-service.js');
const TicketController = require("./controllers/ticket-controller");
const { TicketMiddlewares } = require('./middlewares/index.js');
const {setupJobs} = require('./utils/job.js');
const {createChannel, subscribeMessage} = require('./utils/messageQueue.js');
const db = require('./models/index.js');

const app = express();

const setupAndStartServer = async () => {

    app.use(helmet());
    app.use(cors());

    // Distributed Tracing: Correlation ID Middleware
    app.use((req, res, next) => {
        const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
        req.correlationId = correlationId;
        res.setHeader('x-correlation-id', correlationId);

        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            console.log(`[TRACING] [${correlationId}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)`);
        });
        next();
    });

    app.use(express.json());
    app.use(express.urlencoded({extended:true}));

    const channel = await createChannel();
    if(channel) {
        subscribeMessage(channel, emailService, REMINDER_BINDING_KEY);
    }

    app.get('/health', async (req, res) => {
        try {
            await db.sequelize.authenticate();
            return res.status(200).json({
                service: 'Airline_Reminder_Service',
                status: 'UP',
                database: 'CONNECTED',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            return res.status(503).json({
                service: 'Airline_Reminder_Service',
                status: 'DEGRADED',
                database: 'DISCONNECTED',
                error: error.message
            });
        }
    });

    app.get('/metrics', (req, res) => {
        const memory = process.memoryUsage();
        return res.status(200).json({
            service: 'Airline_Reminder_Service',
            status: 'UP',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            memory: {
                rssMb: +(memory.rss / (1024 * 1024)).toFixed(2),
                heapTotalMb: +(memory.heapTotal / (1024 * 1024)).toFixed(2),
                heapUsedMb: +(memory.heapUsed / (1024 * 1024)).toFixed(2)
            },
            nodeVersion: process.version
        });
    });

    app.post('/api/v1/tickets', TicketMiddlewares.validateCreateTicket, TicketController.create);

    app.listen(PORT, async () => {
        console.log(`Server is running on port ${PORT}`);
        if (process.env.DB_SYNC === 'true') {
            try {
                await db.sequelize.sync({ alter: true });
                console.log('[DB_SYNC] Reminder service schema synced successfully.');
            } catch (err) {
                console.error('[DB_SYNC ERROR]', err.message);
            }
        }
        setupJobs();
    });
}

setupAndStartServer();