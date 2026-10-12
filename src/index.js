const express = require('express');
const { PORT, REMINDER_BINDING_KEY } = require('./config/serverConfig');
const emailService = require('./services/email-service.js');
const TicketController = require("./controllers/ticket-controller");
const {setupJobs} = require('./utils/job.js');
const {createChannel, subscribeMessage} = require('./utils/messageQueue.js');

const app = express();

const setupAndStartServer = async () => {

    app.use(express.json());
    app.use(express.urlencoded({extended:true}));

    const channel = await createChannel();
    if(channel) {
        subscribeMessage(channel, emailService, REMINDER_BINDING_KEY);
    }

    app.post('/api/v1/tickets', TicketController.create);

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        setupJobs();
    });
}

setupAndStartServer();