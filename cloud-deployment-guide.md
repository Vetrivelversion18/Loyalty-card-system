# RK Dragon Panipuri - Cloud Deployment & Setup Guide (Enhanced Version)

## 🚀 Complete Deployment Package

### 1. Docker Configuration

#### Dockerfile
```dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads exports logs temp public

# Set proper permissions
RUN chown -R node:node /app

USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/rk_dragon_loyalty
      - JWT_SECRET=${JWT_SECRET}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./exports:/app/exports
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - loyalty-network

  mongodb:
    image: mongo:6.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: rk_dragon_loyalty
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    restart: unless-stopped
    networks:
      - loyalty-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    networks:
      - loyalty-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./public:/usr/share/nginx/html:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - loyalty-network

volumes:
  mongodb_data:
  redis_data:

networks:
  loyalty-network:
    driver: bridge
```

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server app:5000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect HTTP to HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000";

        # Serve static files
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API requests
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # File uploads
        location /uploads/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Export files
        location /exports/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### 2. Cloud Platform Deployments

#### A. Railway.app Deployment

**railway.toml**
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
PORT = "5000"
```

**Deployment Steps:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init rk-dragon-loyalty

# Add MongoDB service
railway add mongodb

# Add environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASS=your-app-password
railway variables set TWILIO_ACCOUNT_SID=your-twilio-sid
railway variables set TWILIO_AUTH_TOKEN=your-twilio-token

# Deploy
railway up
```

#### B. Render.com Deployment

**render.yaml**
```yaml
services:
  - type: web
    name: rk-loyalty-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: loyalty-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: EMAIL_USER
        sync: false
      - key: EMAIL_PASS
        sync: false

databases:
  - name: loyalty-db
    databaseName: rk_dragon_loyalty
    user: admin
```

#### C. Heroku Deployment

**Procfile**
```
web: npm start
worker: npm run worker
```

**app.json**
```json
{
  "name": "RK Dragon Panipuri Loyalty System",
  "description": "Enhanced loyalty card management system",
  "keywords": ["node", "express", "mongodb", "loyalty"],
  "website": "https://your-domain.com",
  "repository": "https://github.com/yourusername/rk-loyalty-enhanced",
  "logo": "https://your-domain.com/logo.png",
  "success_url": "/",
  "scripts": {
    "postdeploy": "echo 'Deployment completed'"
  },
  "env": {
    "NODE_ENV": {
      "description": "Node environment",
      "value": "production"
    },
    "JWT_SECRET": {
      "description": "JWT secret key",
      "generator": "secret"
    },
    "EMAIL_USER": {
      "description": "Email username for notifications"
    },
    "EMAIL_PASS": {
      "description": "Email password or app password"
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "eco"
    }
  },
  "addons": [
    "mongolab:sandbox",
    "heroku-redis:mini"
  ],
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    }
  ]
}
```

### 3. Database Setup Scripts

#### scripts/mongo-init.js
```javascript
// MongoDB initialization script
db = db.getSiblingDB('rk_dragon_loyalty');

// Create collections with validation
db.createCollection("admins", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["username", "password"],
         properties: {
            username: {
               bsonType: "string",
               description: "Username must be a string and is required"
            },
            password: {
               bsonType: "string",
               description: "Password must be a string and is required"
            }
         }
      }
   }
});

db.createCollection("customers", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["id", "name", "mobile"],
         properties: {
            id: {
               bsonType: "string",
               pattern: "^RK-[0-9]+-[0-9]+$",
               description: "Customer ID must follow RK-timestamp-random format"
            },
            name: {
               bsonType: "string",
               description: "Name must be a string and is required"
            },
            mobile: {
               bsonType: "string",
               pattern: "^[6-9][0-9]{9}$",
               description: "Mobile must be a valid 10-digit Indian mobile number"
            },
            stampsReceived: {
               bsonType: "int",
               minimum: 0,
               maximum: 6,
               description: "Stamps received must be between 0 and 6"
            }
         }
      }
   }
});

// Create indexes for performance
db.customers.createIndex({ "id": 1 }, { unique: true });
db.customers.createIndex({ "mobile": 1 }, { unique: true });
db.customers.createIndex({ "registrationDate": 1 });
db.customers.createIndex({ "isActive": 1 });

db.admins.createIndex({ "username": 1 }, { unique: true });

db.adminsessions.createIndex({ "sessionToken": 1 }, { unique: true });
db.adminsessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

print('Database initialized successfully');
```

#### scripts/seed.js
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models (assuming they're in separate files)
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Admin.deleteMany({});
        await Customer.deleteMany({});
        console.log('Cleared existing data');

        // Create default admin
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const hashedAnswers = await Promise.all([
            bcrypt.hash('sample answer 1', 10),
            bcrypt.hash('sample answer 2', 10),
            bcrypt.hash('sample answer 3', 10)
        ]);

        await Admin.create({
            username: 'admin',
            password: hashedPassword,
            securityQuestions: [
                { question: 'What is your mother\'s maiden name?', answer: hashedAnswers[0] },
                { question: 'What city were you born in?', answer: hashedAnswers[1] },
                { question: 'What was your first pet\'s name?', answer: hashedAnswers[2] }
            ],
            isSetup: true
        });

        // Create sample customers
        const sampleCustomers = [
            {
                id: 'RK-1695045600-123',
                name: 'முருகன்',
                mobile: '9988776655',
                stampsReceived: 3
            },
            {
                id: 'RK-1695045600-456',
                name: 'லட்சுமி',
                mobile: '8877665544',
                stampsReceived: 6,
                completionDate: new Date(),
                isActive: false
            },
            {
                id: 'RK-1695045600-789',
                name: 'கிருஷ்ணன்',
                mobile: '7766554433',
                stampsReceived: 1
            }
        ];

        await Customer.create(sampleCustomers);

        console.log('Database seeded successfully');
        console.log('Default admin credentials: admin / admin123');
        
    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedDatabase();
```

### 4. Free Cloud Services Setup

#### A. MongoDB Atlas (Free Tier)
```bash
# 1. Sign up at https://cloud.mongodb.com
# 2. Create free cluster (M0 Sandbox - 512MB)
# 3. Create database user
# 4. Add IP whitelist (0.0.0.0/0 for development)
# 5. Get connection string:
# mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/rk_dragon_loyalty
```

#### B. Gmail App Password Setup
```bash
# 1. Enable 2-factor authentication on Gmail
# 2. Go to Google Account settings
# 3. Security > App passwords
# 4. Generate app password for "Mail"
# 5. Use this password in EMAIL_PASS environment variable
```

#### C. Twilio Setup (Free Trial)
```bash
# 1. Sign up at https://www.twilio.com
# 2. Get free $15 trial credit
# 3. Get Account SID and Auth Token
# 4. Get trial phone number
# 5. For WhatsApp: Join Twilio Sandbox
#    Send "join [sandbox-word]" to +1 415 523 8886
```

#### D. Redis Cloud (Free Tier)
```bash
# 1. Sign up at https://redis.com/redis-cloud/
# 2. Create free database (30MB)
# 3. Get connection URL
# 4. Use in REDIS_URL environment variable
```

### 5. Environment Configuration (.env)

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com

# Database Configuration (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/rk_dragon_loyalty?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-for-production
JWT_EXPIRES_IN=24h

# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-business-email@gmail.com
EMAIL_PASS=your-16-character-app-password

# SMS & WhatsApp Configuration (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886

# Security Configuration
BCRYPT_ROUNDS=12
LOGIN_ATTEMPTS_LIMIT=5
LOCK_DURATION_MINUTES=30

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
EXPORT_PATH=./exports

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration (Optional)
REDIS_URL=redis://username:password@redis-server.com:port

# AWS S3 Configuration (Optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=rk-loyalty-files

# Company Configuration
COMPANY_NAME=RK DRAGON PANIPURI
COMPANY_EMAIL=info@rkdragonpanipuri.com
COMPANY_PHONE=+919876543210
COMPANY_ADDRESS=Salem, Tamil Nadu, India
COMPANY_WEBSITE=https://your-domain.com
```

### 6. Progressive Web App (PWA) Configuration

#### manifest.json
```json
{
  "name": "RK Dragon Panipuri Loyalty System",
  "short_name": "RK Loyalty",
  "description": "Loyalty card management system for RK Dragon Panipuri",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#DC143C",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en-US",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "640x1136",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

#### service-worker.js
```javascript
const CACHE_NAME = 'rk-loyalty-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Sync offline actions when connection is restored
  const offlineActions = await getOfflineActions();
  for (const action of offlineActions) {
    try {
      await fetch('/api/' + action.endpoint, {
        method: action.method,
        body: JSON.stringify(action.data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      await removeOfflineAction(action.id);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
}
```

### 7. Quick Deployment Commands

#### One-Click Railway Deployment
```bash
# Clone repository
git clone https://github.com/yourusername/rk-loyalty-enhanced.git
cd rk-loyalty-enhanced

# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add mongodb
railway add redis
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway up

# Get your live URL
railway domain
```

#### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build -d

# Scale the application
docker-compose up --scale app=3

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

#### Manual Deployment Steps
```bash
# 1. Prepare the server
sudo apt update && sudo apt upgrade -y
sudo apt install nodejs npm nginx mongodb-tools -y

# 2. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone and setup application
git clone https://github.com/yourusername/rk-loyalty-enhanced.git
cd rk-loyalty-enhanced
npm install --production

# 4. Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# 5. Setup MongoDB
# Follow MongoDB installation guide for your OS

# 6. Setup reverse proxy (Nginx)
sudo cp nginx.conf /etc/nginx/sites-available/rk-loyalty
sudo ln -s /etc/nginx/sites-available/rk-loyalty /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7. Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com

# 8. Setup systemd service
sudo cp scripts/rk-loyalty.service /etc/systemd/system/
sudo systemctl enable rk-loyalty
sudo systemctl start rk-loyalty

# 9. Setup monitoring
sudo npm install -g pm2
pm2 start server.js --name rk-loyalty
pm2 startup
pm2 save
```

This comprehensive deployment package provides everything needed to get your RK Dragon Panipuri loyalty system running in production with full cloud capabilities, security, and scalability.