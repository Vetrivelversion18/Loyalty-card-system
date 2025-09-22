# RK Dragon Panipuri - Complete Setup & Deployment Guide

## 🚀 Quick Start Guide

### 1. Project Structure
```
rk-dragon-loyalty/
├── frontend/                 # React/HTML Frontend
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── build/               # Production build
├── backend/                 # Node.js API Server
│   ├── server.js
│   ├── routes/
│   ├── middleware/
│   ├── scripts/
│   ├── package.json
│   └── .env
├── database/               # Database scripts
│   ├── migrations/
│   └── seeds/
├── docker-compose.yml
├── README.md
└── deployment/
    ├── railway.toml
    ├── vercel.json
    └── heroku.json
```

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- Git
- Code editor (VS Code recommended)

### Step 1: Clone and Setup Backend
```bash
# Create project directory
mkdir rk-dragon-loyalty
cd rk-dragon-loyalty

# Create backend directory
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mysql2 cors bcryptjs jsonwebtoken cookie-parser multer dotenv qrcode pdfkit node-cron helmet express-rate-limit express-validator winston

# Install development dependencies
npm install -D nodemon jest supertest

# Create directory structure
mkdir -p routes middleware scripts logs uploads
```

### Step 2: Create Backend Files

Create `server.js` with the complete backend code provided in the previous files.

Create `package.json`:
```json
{
  "name": "rk-dragon-panipuri-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node scripts/migrate.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "cookie-parser": "^1.4.6",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1",
    "qrcode": "^1.5.3",
    "pdfkit": "^0.14.0",
    "node-cron": "^3.0.2",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.1",
    "express-validator": "^7.0.1",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.1",
    "supertest": "^6.3.3"
  }
}
```

Create `.env` file:
```bash
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=rk_dragon_loyalty

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

ADMIN_MOBILES=9876543210,8765432109

# SMS Configuration (choose one)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Setup Database

Create `scripts/migrate.js`:
```javascript
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
});

async function setupDatabase() {
    try {
        // Create database
        await connection.promise().query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log('Database created/verified');

        // Use database
        await connection.promise().query(`USE ${process.env.DB_NAME}`);

        // Create tables
        const tables = `
            CREATE TABLE IF NOT EXISTS customers (
                id VARCHAR(20) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                mobile VARCHAR(15) UNIQUE NOT NULL,
                registration_date DATE DEFAULT (CURRENT_DATE),
                stamps_received INT DEFAULT 0,
                completion_date DATE NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS admin_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mobile VARCHAR(15) NOT NULL,
                session_token VARCHAR(255) NOT NULL,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
            
            CREATE TABLE IF NOT EXISTS otp_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mobile VARCHAR(15) NOT NULL,
                otp VARCHAR(6) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 5 MINUTE),
                is_used BOOLEAN DEFAULT FALSE
            );
            
            CREATE TABLE IF NOT EXISTS stamp_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(20) NOT NULL,
                stamp_number INT NOT NULL,
                added_by VARCHAR(15) NOT NULL,
                added_date DATE DEFAULT (CURRENT_DATE),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );
        `;

        await connection.promise().query(tables);
        console.log('All tables created successfully');

        process.exit(0);
    } catch (error) {
        console.error('Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();
```

### Step 4: Setup Frontend

```bash
# Go back to project root
cd ..

# Create frontend directory
mkdir frontend
cd frontend

# Copy the generated HTML/CSS/JS files from the demo app
# Or create a React app
npx create-react-app .
# OR copy the static files from our demo
```

### Step 5: Run the Application

```bash
# Terminal 1 - Backend
cd backend
npm run migrate  # Setup database
npm run dev      # Start backend server

# Terminal 2 - Frontend
cd frontend
npm start        # Start frontend (if React) or serve static files
```

## 🌐 Cloud Deployment Options

### Option 1: Railway.app (Recommended - Easy & Free)

#### Backend Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-production-secret
railway variables set ADMIN_MOBILES=9876543210

# Deploy
railway up
```

#### Database Setup on Railway
1. Go to Railway dashboard
2. Add MySQL service to your project
3. Copy connection details to environment variables
4. Run migrations: `railway run npm run migrate`

#### Frontend Deployment on Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# In frontend directory
cd frontend
npm run build

# Deploy
vercel --prod
```

### Option 2: Heroku Deployment

Create `Procfile`:
```
web: npm start
release: npm run migrate
```

Create `heroku.yml`:
```yaml
build:
  docker:
    web: Dockerfile
run:
  web: npm start
```

Deploy:
```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-app-name

# Add MySQL addon
heroku addons:create jawsdb:kitefin

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main
```

### Option 3: DigitalOcean App Platform

Create `.do/app.yaml`:
```yaml
name: rk-dragon-loyalty
services:
- name: api
  source_dir: backend
  github:
    repo: your-username/rk-dragon-loyalty
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
- name: frontend
  source_dir: frontend/build
  github:
    repo: your-username/rk-dragon-loyalty
    branch: main
  static_sites:
  - name: frontend
    source_dir: /
databases:
- engine: MYSQL
  name: loyalty-db
  num_nodes: 1
  size: db-s-dev-database
  version: "8"
```

### Option 4: AWS Deployment (Advanced)

Use AWS Elastic Beanstalk for backend and S3 + CloudFront for frontend.

## 📱 Mobile App Integration

### React Native Setup
```bash
# Create React Native app
npx react-native init RKLoyaltyApp

# Install dependencies
cd RKLoyaltyApp
npm install @react-native-async-storage/async-storage react-native-qrcode-scanner axios
```

### Key React Native Components
```javascript
// API client for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileLoyaltyAPI {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async getToken() {
        return await AsyncStorage.getItem('adminToken');
    }

    async setToken(token) {
        await AsyncStorage.setItem('adminToken', token);
    }

    async request(endpoint, options = {}) {
        const token = await this.getToken();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    }
}
```

## 🔧 Advanced Features Implementation

### 1. Real-time Updates with Socket.io

Backend addition:
```javascript
const socketIo = require('socket.io');
const server = require('http').createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

// Emit stamp updates to all connected clients
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// In your stamp addition endpoint
app.post('/api/customers/:id/stamp', verifyAdminToken, (req, res) => {
    // ... existing code ...
    
    // Emit update to all clients
    io.emit('stampAdded', {
        customerId: id,
        newStampCount: newStampCount,
        isCompleted: isCompleted
    });
    
    // ... rest of the code ...
});
```

### 2. WhatsApp Integration

Using Twilio WhatsApp API:
```javascript
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendWhatsAppMessage(to, message) {
    try {
        const result = await client.messages.create({
            from: 'whatsapp:+14155238886', // Twilio Sandbox
            to: `whatsapp:+91${to}`,
            body: message
        });
        return { success: true, messageSid: result.sid };
    } catch (error) {
        console.error('WhatsApp message failed:', error);
        return { success: false, error: error.message };
    }
}

// Use in completion handler
if (isCompleted) {
    const message = `🎉 Congratulations ${customer.name}! You've completed your RK Dragon Panipuri loyalty card. Visit us to claim your reward! 🐉`;
    await sendWhatsAppMessage(customer.mobile, message);
}
```

### 3. Analytics Dashboard

```javascript
// Add analytics endpoints
app.get('/api/analytics/daily-stats', verifyAdminToken, (req, res) => {
    const query = `
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_registrations,
            SUM(stamps_received) as total_stamps
        FROM customers 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Query failed' });
        }
        res.json({ success: true, data: results });
    });
});
```

## 🔐 Security Checklist

- [ ] Use HTTPS in production
- [ ] Implement rate limiting on all endpoints
- [ ] Validate and sanitize all inputs
- [ ] Use parameterized queries for database
- [ ] Set secure headers with Helmet.js
- [ ] Implement proper CORS policy
- [ ] Use strong JWT secrets
- [ ] Hash sensitive data
- [ ] Implement session timeout
- [ ] Add request logging
- [ ] Set up monitoring and alerts

## 📊 Monitoring & Logging

### Error Monitoring with Sentry
```javascript
const Sentry = require('@sentry/node');

Sentry.init({ dsn: process.env.SENTRY_DSN });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring
```javascript
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
});

// Middleware to collect metrics
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        httpRequestDuration
            .labels(req.method, req.route?.path || req.path, res.statusCode)
            .observe(duration);
    });
    next();
});
```

## 🚀 Going Live Checklist

### Pre-Launch
- [ ] Test all features thoroughly
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure custom domain
- [ ] Set up monitoring
- [ ] Create admin accounts
- [ ] Test SMS/OTP functionality
- [ ] Backup database

### Launch
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Update DNS records
- [ ] Test live application
- [ ] Monitor error logs
- [ ] Verify all integrations work

### Post-Launch
- [ ] Monitor application performance
- [ ] Set up automated backups
- [ ] Create user documentation
- [ ] Plan for scaling
- [ ] Set up analytics tracking
- [ ] Regular security updates

This comprehensive guide provides everything needed to build, deploy, and maintain the RK Dragon Panipuri loyalty card system as a production-ready application.