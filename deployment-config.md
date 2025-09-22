# RK Dragon Panipuri - Package Configuration & Dependencies

## package.json
```json
{
  "name": "rk-dragon-panipuri-backend",
  "version": "1.0.0",
  "description": "Backend API for RK Dragon Panipuri Loyalty Card System",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "npm install --production",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js",
    "test": "jest"
  },
  "keywords": ["loyalty", "api", "nodejs", "mysql"],
  "author": "RK Dragon Panipuri",
  "license": "ISC",
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
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

## Environment Configuration (.env)
```bash
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rk_dragon_loyalty

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# SMS Gateway Configuration (Choose one)
# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS SNS (Alternative)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Or use local SMS gateway
SMS_GATEWAY_URL=http://your-sms-gateway.com/api/send
SMS_API_KEY=your_sms_api_key

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Admin Mobile Numbers (comma-separated)
ADMIN_MOBILES=9876543210,8765432109

# Email Configuration (Optional for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Redis Configuration (Optional for caching)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Database Migration Script (scripts/migrate.js)
```javascript
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
});

async function createDatabase() {
    return new Promise((resolve, reject) => {
        db.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
            if (err) reject(err);
            else {
                console.log(`Database ${process.env.DB_NAME} created/verified`);
                resolve();
            }
        });
    });
}

async function runMigrations() {
    return new Promise((resolve, reject) => {
        db.query(`USE ${process.env.DB_NAME}`, (err) => {
            if (err) reject(err);
            else {
                const migrations = `
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
                    
                    CREATE TABLE IF NOT EXISTS system_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        level VARCHAR(20) NOT NULL,
                        message TEXT NOT NULL,
                        meta JSON,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `;
                
                db.query(migrations, (err) => {
                    if (err) reject(err);
                    else {
                        console.log('All migrations completed successfully');
                        resolve();
                    }
                });
            }
        });
    });
}

async function main() {
    try {
        await createDatabase();
        await runMigrations();
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

main();
```

## Docker Configuration

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=root
      - DB_PASSWORD=rootpassword
      - DB_NAME=rk_dragon_loyalty
    depends_on:
      - mysql
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=rk_dragon_loyalty
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/build:/usr/share/nginx/html
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

## Deployment Configurations

### Railway.app (railway.toml)
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
```

### Vercel (vercel.json)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Heroku (Procfile)
```
web: npm start
worker: npm run worker
release: npm run migrate
```

### Heroku App Configuration (app.json)
```json
{
  "name": "RK Dragon Panipuri Loyalty System",
  "description": "Loyalty card management system for RK Dragon Panipuri",
  "keywords": ["node", "express", "mysql"],
  "website": "https://your-domain.com",
  "repository": "https://github.com/yourusername/rk-dragon-loyalty",
  "logo": "https://your-domain.com/logo.png",
  "success_url": "/",
  "scripts": {
    "postdeploy": "npm run migrate && npm run seed"
  },
  "env": {
    "NODE_ENV": {
      "description": "Node environment",
      "value": "production"
    },
    "JWT_SECRET": {
      "description": "Secret key for JWT tokens",
      "generator": "secret"
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "hobby"
    }
  },
  "addons": [
    "jawsdb:kitefin",
    "heroku-redis:hobby-dev"
  ],
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    }
  ]
}
```

## Free Cloud Services Setup Guide

### 1. Database (Free MySQL)
- **PlanetScale**: Free 5GB MySQL database
- **Railway**: Free PostgreSQL/MySQL with 500MB storage
- **Aiven**: Free MySQL with 1-month trial
- **FreeSQLDatabase**: Free MySQL hosting

### 2. Backend Hosting (Free Node.js)
- **Railway**: 500 hours/month free
- **Render**: Free tier with sleep mode
- **Heroku**: Free tier (with credit card)
- **Cyclic**: Free Node.js hosting
- **Glitch**: Free hosting for small apps

### 3. Frontend Hosting (Free Static)
- **Vercel**: Unlimited static sites
- **Netlify**: Free tier with form handling
- **GitHub Pages**: Free static hosting
- **Firebase Hosting**: Free tier

### 4. SMS Service (Free/Low-cost)
- **Twilio**: $15 free trial credit
- **AWS SNS**: Free tier (1,000 SMS/month)
- **TextLocal**: Free credits in India
- **Fast2SMS**: Low-cost Indian SMS gateway

### Quick Deployment Commands

```bash
# Clone and setup
git clone <your-repo>
cd rk-dragon-loyalty-backend
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configurations

# Setup database
npm run migrate
npm run seed

# Run development
npm run dev

# Build for production
npm run build
npm start

# Deploy to Railway
npm i -g @railway/cli
railway login
railway init
railway up

# Deploy to Render
# Connect your GitHub repo to Render dashboard

# Deploy to Heroku
heroku create your-app-name
heroku addons:create jawsdb:kitefin
heroku addons:create heroku-redis:hobby-dev
git push heroku main
```