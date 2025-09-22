# RK Dragon Panipuri - Complete Backend Server (Enhanced Version)

## server.js - Main Application Server

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const winston = require('winston');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://your-domain.com'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));
app.use('/exports', express.static('exports'));

// Create necessary directories
['uploads', 'exports', 'logs', 'temp'].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Winston Logger Configuration
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rk_dragon_loyalty', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (error) => {
    logger.error('Database connection error:', error);
});
db.once('open', () => {
    logger.info('Connected to MongoDB database');
});

// Database Schemas
const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    securityQuestions: [{
        question: String,
        answer: String
    }],
    isSetup: { type: Boolean, default: false },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const CustomerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    registrationDate: { type: Date, default: Date.now },
    stampsReceived: { type: Number, default: 0 },
    completionDate: Date,
    isActive: { type: Boolean, default: true },
    lastStampDate: Date,
    stampHistory: [{
        stampNumber: Number,
        addedBy: String,
        addedDate: { type: Date, default: Date.now }
    }],
    notificationPreferences: {
        whatsapp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const AdminSessionSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    sessionToken: { type: String, required: true },
    deviceInfo: {
        userAgent: String,
        ip: String,
        platform: String
    },
    loginTime: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
});

const Admin = mongoose.model('Admin', AdminSchema);
const Customer = mongoose.model('Customer', CustomerSchema);
const AdminSession = mongoose.model('AdminSession', AdminSessionSchema);

// Utility Functions
function generateCustomerId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 999) + 100;
    return `RK-${timestamp}-${random}`;
}

function generatePassword(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Email Configuration
const emailTransporter = nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// SMS Configuration (Twilio)
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// WhatsApp Message Function
async function sendWhatsAppMessage(to, message) {
    try {
        if (!process.env.TWILIO_ACCOUNT_SID) {
            logger.info(`WhatsApp message simulation to ${to}: ${message}`);
            return { success: true, simulation: true };
        }
        
        const result = await twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:+91${to}`,
            body: message
        });
        
        logger.info(`WhatsApp message sent to ${to}: ${result.sid}`);
        return { success: true, messageSid: result.sid };
    } catch (error) {
        logger.error('WhatsApp message failed:', error);
        return { success: false, error: error.message };
    }
}

// SMS Message Function
async function sendSMSMessage(to, message) {
    try {
        if (!process.env.TWILIO_ACCOUNT_SID) {
            logger.info(`SMS message simulation to ${to}: ${message}`);
            return { success: true, simulation: true };
        }
        
        const result = await twilioClient.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${to}`,
            body: message
        });
        
        logger.info(`SMS sent to ${to}: ${result.sid}`);
        return { success: true, messageSid: result.sid };
    } catch (error) {
        logger.error('SMS sending failed:', error);
        return { success: false, error: error.message };
    }
}

// Email Function
async function sendEmail(to, subject, html, text) {
    try {
        if (!process.env.EMAIL_USER) {
            logger.info(`Email simulation to ${to}: ${subject}`);
            return { success: true, simulation: true };
        }
        
        const mailOptions = {
            from: `"RK Dragon Panipuri" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
            text: text
        };
        
        const result = await emailTransporter.sendMail(mailOptions);
        logger.info(`Email sent to ${to}: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        logger.error('Email sending failed:', error);
        return { success: false, error: error.message };
    }
}

// Middleware to verify admin token
async function verifyAdminToken(req, res, next) {
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
        
        // Check if session exists and is active
        const session = await AdminSession.findOne({ 
            sessionToken: token, 
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).populate('adminId');
        
        if (!session) {
            return res.status(401).json({ success: false, message: 'Invalid or expired session' });
        }
        
        // Update last activity
        session.lastActivity = new Date();
        await session.save();
        
        req.admin = session.adminId;
        req.session = session;
        next();
    } catch (error) {
        logger.error('Token verification failed:', error);
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}

// CSV Upload Configuration
const csvStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'temp/');
    },
    filename: (req, file, cb) => {
        cb(null, 'import-' + Date.now() + path.extname(file.originalname));
    }
});

const csvUpload = multer({ 
    storage: csvStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes

// Admin Setup Routes
app.post('/api/admin/setup', async (req, res) => {
    try {
        const { username, password, securityQuestions } = req.body;
        
        // Validation
        if (!username || !password || !securityQuestions || securityQuestions.length < 3) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, password, and at least 3 security questions are required' 
            });
        }
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne();
        if (existingAdmin && existingAdmin.isSetup) {
            return res.status(400).json({ success: false, message: 'Admin already setup' });
        }
        
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Hash security answers
        const hashedQuestions = await Promise.all(
            securityQuestions.map(async (q) => ({
                question: q.question,
                answer: await bcrypt.hash(q.answer.toLowerCase().trim(), 10)
            }))
        );
        
        // Create or update admin
        const admin = await Admin.findOneAndUpdate(
            {},
            {
                username,
                password: hashedPassword,
                securityQuestions: hashedQuestions,
                isSetup: true,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        
        logger.info(`Admin setup completed for username: ${username}`);
        res.json({ success: true, message: 'Admin setup completed successfully' });
        
    } catch (error) {
        logger.error('Admin setup error:', error);
        res.status(500).json({ success: false, message: 'Setup failed' });
    }
});

app.get('/api/admin/setup-status', async (req, res) => {
    try {
        const admin = await Admin.findOne();
        res.json({ 
            success: true, 
            isSetup: admin ? admin.isSetup : false 
        });
    } catch (error) {
        logger.error('Setup status check error:', error);
        res.status(500).json({ success: false, message: 'Status check failed' });
    }
});

// Admin Login Routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }
        
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        // Check if account is locked
        if (admin.lockUntil && admin.lockUntil > new Date()) {
            return res.status(423).json({ 
                success: false, 
                message: 'Account temporarily locked due to too many failed attempts' 
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            // Increment login attempts
            admin.loginAttempts = (admin.loginAttempts || 0) + 1;
            if (admin.loginAttempts >= 5) {
                admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
            }
            await admin.save();
            
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        // Reset login attempts on successful login
        admin.loginAttempts = 0;
        admin.lockUntil = undefined;
        admin.lastLogin = new Date();
        await admin.save();
        
        // Generate JWT token
        const tokenExpiry = rememberMe ? '30d' : '24h';
        const token = jwt.sign(
            { adminId: admin._id, username: admin.username },
            process.env.JWT_SECRET || 'default-secret-key',
            { expiresIn: tokenExpiry }
        );
        
        // Create session record
        const session = new AdminSession({
            adminId: admin._id,
            sessionToken: token,
            deviceInfo: {
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                platform: req.headers['sec-ch-ua-platform'] || 'Unknown'
            },
            expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 : 24) * 60 * 60 * 1000)
        });
        await session.save();
        
        // Set HTTP-only cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: (rememberMe ? 30 * 24 : 24) * 60 * 60 * 1000
        };
        
        res.cookie('adminToken', token, cookieOptions);
        
        logger.info(`Admin login successful: ${username}`);
        res.json({
            success: true,
            message: 'Login successful',
            admin: { 
                username: admin.username,
                lastLogin: admin.lastLogin 
            }
        });
        
    } catch (error) {
        logger.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Forgot Password Routes
app.post('/api/admin/forgot-password', async (req, res) => {
    try {
        const { username } = req.body;
        
        const admin = await Admin.findOne({ username });
        if (!admin) {
            // Don't reveal if username exists or not for security
            return res.json({ 
                success: true, 
                message: 'If the username exists, security questions will be provided',
                hasSecurityQuestions: false
            });
        }
        
        // Return security questions (without answers)
        const questions = admin.securityQuestions.map(q => ({ question: q.question }));
        
        res.json({ 
            success: true, 
            hasSecurityQuestions: true,
            securityQuestions: questions 
        });
        
    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Request failed' });
    }
});

app.post('/api/admin/verify-security-answers', async (req, res) => {
    try {
        const { username, answers } = req.body;
        
        if (!username || !answers || answers.length < 3) {
            return res.status(400).json({ success: false, message: 'All security answers required' });
        }
        
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid request' });
        }
        
        // Verify all security answers
        const verificationResults = await Promise.all(
            answers.map(async (answer, index) => {
                if (!admin.securityQuestions[index]) return false;
                return await bcrypt.compare(
                    answer.toLowerCase().trim(), 
                    admin.securityQuestions[index].answer
                );
            })
        );
        
        const allAnswersCorrect = verificationResults.every(result => result === true);
        
        if (!allAnswersCorrect) {
            return res.status(401).json({ success: false, message: 'Security answers verification failed' });
        }
        
        // Generate temporary password reset token
        const resetToken = jwt.sign(
            { adminId: admin._id, type: 'password-reset' },
            process.env.JWT_SECRET || 'default-secret-key',
            { expiresIn: '15m' }
        );
        
        res.json({ 
            success: true, 
            message: 'Security questions verified successfully',
            resetToken 
        });
        
    } catch (error) {
        logger.error('Security verification error:', error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
});

app.post('/api/admin/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        
        if (!resetToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Reset token and new password required' });
        }
        
        // Verify reset token
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'default-secret-key');
        if (decoded.type !== 'password-reset') {
            return res.status(401).json({ success: false, message: 'Invalid reset token' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Update admin password
        await Admin.findByIdAndUpdate(decoded.adminId, {
            password: hashedPassword,
            updatedAt: new Date()
        });
        
        // Invalidate all existing sessions
        await AdminSession.updateMany(
            { adminId: decoded.adminId },
            { isActive: false }
        );
        
        logger.info(`Password reset successful for admin ID: ${decoded.adminId}`);
        res.json({ success: true, message: 'Password reset successful' });
        
    } catch (error) {
        logger.error('Password reset error:', error);
        res.status(500).json({ success: false, message: 'Password reset failed' });
    }
});

// Admin Logout
app.post('/api/admin/logout', verifyAdminToken, async (req, res) => {
    try {
        // Deactivate current session
        req.session.isActive = false;
        await req.session.save();
        
        res.clearCookie('adminToken');
        res.json({ success: true, message: 'Logged out successfully' });
        
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
});

// Customer Management Routes
app.post('/api/customers/register', verifyAdminToken, async (req, res) => {
    try {
        const { name, mobile } = req.body;
        
        // Validation
        if (!name || !mobile) {
            return res.status(400).json({ success: false, message: 'Name and mobile required' });
        }
        
        if (!validator.isMobilePhone(mobile, 'en-IN')) {
            return res.status(400).json({ success: false, message: 'Invalid mobile number format' });
        }
        
        // Check if customer already exists
        const existingCustomer = await Customer.findOne({ mobile });
        if (existingCustomer) {
            return res.status(400).json({ success: false, message: 'Customer with this mobile number already exists' });
        }
        
        const customerId = generateCustomerId();
        
        const customer = new Customer({
            id: customerId,
            name,
            mobile
        });
        
        await customer.save();
        
        logger.info(`Customer registered: ${customerId} - ${name}`);
        res.json({
            success: true,
            message: 'Customer registered successfully',
            customer: {
                id: customerId,
                name,
                mobile,
                stampsReceived: 0,
                registrationDate: customer.registrationDate
            }
        });
        
    } catch (error) {
        logger.error('Customer registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// Continue in next message due to length...
```

## package.json

```json
{
  "name": "rk-dragon-panipuri-backend-enhanced",
  "version": "2.0.0",
  "description": "Enhanced Backend API for RK Dragon Panipuri Loyalty Card System",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "npm install --production",
    "test": "jest",
    "lint": "eslint .",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js"
  },
  "keywords": ["loyalty", "api", "nodejs", "mongodb", "express"],
  "author": "RK Dragon Panipuri",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cookie-parser": "^1.4.6",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1",
    "qrcode": "^1.5.3",
    "pdfkit": "^0.14.0",
    "nodemailer": "^6.9.4",
    "twilio": "^4.15.0",
    "csv-parser": "^3.0.0",
    "csv-writer": "^1.6.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.1",
    "validator": "^13.11.0",
    "winston": "^3.10.0",
    "node-cron": "^3.0.2",
    "sharp": "^0.32.5",
    "archiver": "^5.3.1",
    "moment": "^2.29.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "eslint": "^8.47.0"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

## Environment Variables (.env)

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database Configuration (MongoDB)
MONGODB_URI=mongodb://localhost:27017/rk_dragon_loyalty
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/rk_dragon_loyalty

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
JWT_EXPIRES_IN=24h

# Email Configuration (Gmail/SMTP)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS & WhatsApp Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
EXPORT_PATH=./exports

# Security Configuration
BCRYPT_ROUNDS=12
LOGIN_ATTEMPTS_LIMIT=5
LOCK_DURATION_MINUTES=30

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cloud Storage (Optional - AWS S3)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=rk-loyalty-files

# Redis (Optional - for session storage)
REDIS_URL=redis://localhost:6379

# Company Configuration
COMPANY_NAME=RK DRAGON PANIPURI
COMPANY_EMAIL=info@rkdragonpanipuri.com
COMPANY_PHONE=+919876543210
COMPANY_ADDRESS=Salem, Tamil Nadu, India
```