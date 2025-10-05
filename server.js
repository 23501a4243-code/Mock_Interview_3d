// backend/server.js
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Test email configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// Mock database
let users = [];
let interviews = [];

// API endpoint to send interview confirmation email
app.post('/api/send-interview-confirmation', async (req, res) => {
    try {
        const { to, username, interviewDate, interviewTime, interviewLink } = req.body;

        console.log('📧 Sending email to:', to);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: 'CareerCatalyst Interview Scheduled',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea; text-align: center;">CareerCatalyst Interview Confirmation</h2>
                    <p>Hello ${username},</p>
                    <p>You have successfully scheduled your mock interview for <strong>${interviewDate} at ${interviewTime}</strong>.</p>
                    <p>Your unique interview link: <a href="${interviewLink}" style="color: #667eea;">${interviewLink}</a></p>
                    <p><strong>Important:</strong> This link will only be active 15 minutes before and after your scheduled interview time.</p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #667eea; margin-top: 0;">Interview Preparation Tips:</h3>
                        <ul>
                            <li>Test your camera and microphone before the interview</li>
                            <li>Review the job description and your resume</li>
                            <li>Prepare questions to ask the interviewer</li>
                            <li>Find a quiet, well-lit space for the interview</li>
                        </ul>
                    </div>
                    <p>Best regards,<br><strong>The CareerCatalyst Team</strong></p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        
        res.json({ 
            success: true, 
            message: 'Email sent successfully',
            messageId: info.messageId
        });
    } catch (error) {
        console.error('❌ Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send email: ' + error.message 
        });
    }
});

// API endpoint to check interview link status
app.post('/api/check-interview-status', (req, res) => {
    const { interviewTimestamp } = req.body;
    const now = new Date().getTime();
    const bufferTime = 15 * 60 * 1000; // 15 minutes buffer

    if (now >= interviewTimestamp - bufferTime && now <= interviewTimestamp + bufferTime) {
        res.json({ 
            status: 'active', 
            message: 'Interview link is active' 
        });
    } else if (now < interviewTimestamp - bufferTime) {
        res.json({ 
            status: 'inactive', 
            message: 'Interview link is not yet active' 
        });
    } else {
        res.json({ 
            status: 'expired', 
            message: 'Interview has expired' 
        });
    }
});

// User registration
app.post('/api/register', (req, res) => {
    const { username, email, password, userType } = req.body;
    
    // Check if user already exists
    const existingUser = users.find(user => user.username === username || user.email === email);
    if (existingUser) {
        return res.status(400).json({ 
            success: false,
            error: 'User already exists with this username or email' 
        });
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password, // Note: In production, hash passwords!
        userType,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    console.log('✅ New user registered:', username);
    
    res.json({ 
        success: true, 
        message: 'User registered successfully',
        user: { 
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            type: newUser.userType
        }
    });
});

// User login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Find user
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ 
            success: false,
            error: 'Invalid username or password' 
        });
    }
    
    console.log('✅ User logged in:', username);
    
    res.json({ 
        success: true, 
        message: 'Login successful',
        user: { 
            id: user.id,
            username: user.username,
            email: user.email,
            type: user.userType
        }
    });
});

// Get user profile
app.get('/api/user/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.userType,
        createdAt: user.createdAt
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 CareerCatalyst server running on port ${PORT}`);
    console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`📚 API endpoints:`);
    console.log(`   POST /api/register`);
    console.log(`   POST /api/login`);
    console.log(`   POST /api/send-interview-confirmation`);
    console.log(`   POST /api/check-interview-status`);
});