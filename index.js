import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT);
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Schema & Model
const smsMessageSchema = new mongoose.Schema({
    from: { type: String, required: true },
    text: { type: String, required: true },
    sentStamp: { type: String, required: true },
    receivedStamp: { type: String, required: true },
    sim: { type: String, required: true },
    otp: { type: String, default: '' }
}, { timestamps: true });

const SmsMessage = mongoose.model('SmsMessage', smsMessageSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((error) => console.error('❌ MongoDB connection error:', error));

// POST route - Save SMS message with OTP extraction
app.post('/api/messages', async (req, res) => {
    try {
        const { from, text, sentStamp, receivedStamp, sim } = req.body;

        // Extract OTP using regex
        // Looks for patterns like: "Your reference, ABC123XYZ helps complete the IVAC verification."
        const otpRegex = /^Your reference,\s+(.+)\s+helps complete the IVAC verification\.$/;
        const match = text.match(otpRegex);
        const otp = match ? match[1] : '';

        // Create and save the message
        const message = new SmsMessage({
            from,
            text,
            sentStamp,
            receivedStamp,
            sim,
            otp
        });

        const savedMessage = await message.save();
        res.status(201).json({ success: true, data: savedMessage });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message', details: error.message });
    }
});

// GET route - Retrieve all messages
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await SmsMessage.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve messages', details: error.message });
    }
});

// DELETE route - Delete a single message by ID
app.delete('/api/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }

        const deletedMessage = await SmsMessage.findByIdAndDelete(id);

        if (!deletedMessage) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.status(200).json({ success: true, message: 'Message deleted successfully', data: deletedMessage });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete message', details: error.message });
    }
});

// DELETE route - Delete all messages
app.delete('/api/messages', async (req, res) => {
    try {
        const result = await SmsMessage.deleteMany({});
        res.status(200).json({
            success: true,
            message: 'All messages deleted successfully',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete all messages', details: error.message });
    }
});

// Health check route
app.get('/', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
