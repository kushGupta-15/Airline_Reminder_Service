const { z } = require('zod');

const createTicketSchema = z.object({
    subject: z.string({ required_error: 'Subject is required' }).min(1, 'Subject cannot be empty'),
    content: z.string({ required_error: 'Content is required' }).min(1, 'Content cannot be empty'),
    recepientEmail: z.string({ required_error: 'Recipient email is required' }).email('Invalid recipient email format'),
    notificationTime: z.string({ required_error: 'Notification time is required' }).min(1, 'Notification time cannot be empty')
});

const validateCreateTicket = (req, res, next) => {
    const result = createTicketSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            data: {},
            message: 'Invalid request body for ticket creation',
            err: (result.error.issues || []).map(e => e.message).join(', ')
        });
    }
    next();
};

module.exports = {
    validateCreateTicket
};
