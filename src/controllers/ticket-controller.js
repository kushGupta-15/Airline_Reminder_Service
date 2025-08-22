const TicketService = require('../services/email-service.js');

const create = async (req, res) => {
    try {
        const response = await TicketService.createNotification(req.body);
        return res.status(200).json({
            success: true,
            data: response,
            err: {},
            message: 'Email reminder registered successfully'
        }) 
    } catch (error) {
        console.log("Error in create in ticket controller", error);
        return res.status(500).json({
            success: false,
            data: Response,
            err: error,
            message: 'Unable to register email reminder'
        })
    }
}

module.exports = {
    create
}