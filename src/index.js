const express = require('express');
const { PORT } = require('./config/serverConfig');

const app = express();

const setupAndStartServer = () => {
    app.use(express.json());
    app.use(express.urlencoded({extended:true}));

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

setupAndStartServer();