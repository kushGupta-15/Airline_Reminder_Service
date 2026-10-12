const express = require('express');
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

    app.post('/api/v1/tickets', TicketMiddlewares.validateCreateTicket, TicketController.create);

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        setupJobs();
    });
}

setupAndStartServer();