const express = require('express');
const { PORT } = require('./config/serverConfig');
const {sendBasicEmail} = require('./services/email-service.js');
const TicketController = require("./controllers/ticket-controller");
const {setupJobs} = require('./utils/job.js');
const {createChannel} = require('./utils/messageQueue.js');

const app = express();

const setupAndStartServer = async () => {


    app.use(express.json());
    app.use(express.urlencoded({extended:true}));

    const channel = await createChannel();

    app.post('/api/v1/tickets', TicketController.create);

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        setupJobs();
        // sendBasicEmail(
        //     'mailfrom@gmail.com',
        //     'kushg5849@gmail.com',
        //     'This is a test email',
        //     "Hey how are you ?"
        // )
    });
}

setupAndStartServer();