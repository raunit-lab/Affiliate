require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const linksRoutes = require('./src/routes/linksRoutes');
const userRoutes = require('./src/routes/userRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');

if (!process.env.MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI is not defined.');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((error) => console.log('MongoDB Connection Error: ', error));

const app = express();

const corsOptions = {
    origin: process.env.CLIENT_ENDPOINT,
    credentials: true
};

app.use(cors(corsOptions));
app.use(cookieParser());

app.use('/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/links', linksRoutes);
app.use('/users', userRoutes);
app.use('/payments', paymentRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, (error) => {
    if (error) {
        console.log('Error starting the server: ', error);
    } else {
        console.log(`Server is running at http://localhost:${PORT}`);
    }
});