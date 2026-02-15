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

// Helper function to convert spelled numbers to digits
const convertSpelledNumbersToDigits = (spelledString) => {
    const wordToNum = {
        'One': '1', 'Two': '2', 'Three': '3', 'Four': '4',
        'Five': '5', 'Six': '6', 'Seven': '7', 'Eight': '8',
        'Nine': '9', 'Zero': '0'
    };

    const words = spelledString.split('-');
    return words.map(word => wordToNum[word] || '').join('');
};

// POST route - Save SMS message with OTP extraction
app.post('/api/messages', async (req, res) => {
    try {
        const { from, text, sentStamp, receivedStamp, sim } = req.body;

        // Validate required fields
        if (!from || !text || !sentStamp || !receivedStamp || !sim) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        let otp = '';

        // Regex to match: "(IVACBD) For security, type the following sequence when prompted One-Four-Seven-Nine-Five-Six ."
        const otpRegex = /\(IVACBD\) For security, type the following sequence when prompted\s+([a-zA-Z]+(?:-[a-zA-Z]+)*)\s*\./;
        const match = text.match(otpRegex);

        if (match && match[1]) {
            // match[1] will be something like "One-Four-Seven-Nine-Five-Six"
            otp = convertSpelledNumbersToDigits(match[1]);
        }

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

// GET route - Retrieve messages (with optional "sim" filter)
app.get('/api/messages', async (req, res) => {
    try {
        const { sim } = req.query;

        // Create filter object - if 'sim' exists in query, filter by it, otherwise get all
        const filter = sim ? { sim } : {};

        const messages = await SmsMessage.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve messages', details: error.message });
    }
});

// GET route - Retrieve the latest single message by sim and date
app.get('/api/messages/single', async (req, res) => {
    try {
        const { sim, date } = req.query;

        // Validate required fields
        if (!sim || !date) {
            return res.status(400).json({ error: 'Both sim and date are required' });
        }

        // Validate date format
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        // Find the latest message matching sim and createdAt > date
        const message = await SmsMessage.findOne({
            sim: sim,
            createdAt: { $gt: parsedDate }
        }).sort({ createdAt: -1 });

        if (!message) {
            return res.status(404).json({ error: 'No message found matching the criteria' });
        }

        res.status(200).json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve message', details: error.message });
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
        const { sim } = req.query;

        // Create filter object - if 'sim' exists in query, filter by it, otherwise get all
        const filter = sim ? { sim } : {};

        const result = await SmsMessage.deleteMany(filter);
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
