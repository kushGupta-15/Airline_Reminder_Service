const express = require('express');
const { PORT } = require('./config/serverConfig');
const {sendBasicEmail} = require('./services/email-service.js')
const app = express();

const setupAndStartServer = () => {
    app.use(express.json());
    app.use(express.urlencoded({extended:true}));

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);

        // sendBasicEmail(
        //     'mailfrom@gmail.com',
        //     'kushg5849@gmail.com',
        //     'This is a test email',
        //     "Hey how are you ?"
        // )
    });
}

setupAndStartServer();