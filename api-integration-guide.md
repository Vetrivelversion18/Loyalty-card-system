# RK Dragon Panipuri - API Documentation & Integration Guide

## API Endpoints Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-app.railway.app/api
```

### Authentication Endpoints

#### 1. Send OTP for Admin Login
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "mobile": "9876543210"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully"
}
```

#### 2. Verify OTP and Login
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "mobile": "9876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "admin": {
    "mobile": "9876543210"
  }
}
```

#### 3. Admin Logout
```http
POST /api/auth/logout
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Customer Management Endpoints

#### 4. Register New Customer
```http
POST /api/customers/register
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "name": "முருகன்",
  "mobile": "9988776655"
}

Response:
{
  "success": true,
  "message": "Customer registered successfully",
  "customer": {
    "id": "RK-123456",
    "name": "முருகன்",
    "mobile": "9988776655",
    "stampsReceived": 0
  }
}
```

#### 5. Get Customer by ID
```http
GET /api/customers/RK-123456
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "customer": {
    "id": "RK-123456",
    "name": "முருகன்",
    "mobile": "9988776655",
    "registration_date": "2025-09-22",
    "stamps_received": 3,
    "completion_date": null,
    "is_active": true
  }
}
```

#### 6. Search Customer by Mobile
```http
GET /api/customers/search/9988776655
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "customer": {
    "id": "RK-123456",
    "name": "முருகன்",
    "mobile": "9988776655",
    "stamps_received": 3
  }
}
```

#### 7. Add Stamp to Customer
```http
POST /api/customers/RK-123456/stamp
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "message": "Stamp added successfully",
  "customer": {
    "id": "RK-123456",
    "stamps_received": 4,
    "is_active": true
  },
  "isCompleted": false
}
```

#### 8. Get All Customers (Paginated)
```http
GET /api/customers?page=1&limit=10&search=முருகன்
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "customers": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Dashboard & Reports

#### 9. Get Dashboard Statistics
```http
GET /api/dashboard/stats
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "stats": {
    "totalCustomers": 150,
    "activeCards": 120,
    "completedCards": 30
  }
}
```

#### 10. Generate Customer ID Card (PDF)
```http
GET /api/customers/RK-123456/id-card
Authorization: Bearer jwt_token_here

Response: PDF file download
```

#### 11. Export Customer Data (CSV)
```http
GET /api/customers/export/csv
Authorization: Bearer jwt_token_here

Response: CSV file download
```

## Frontend Integration Code

### JavaScript API Client
```javascript
class LoyaltyAPI {
    constructor(baseURL = 'http://localhost:5000/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('adminToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async sendOTP(mobile) {
        return this.request('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ mobile })
        });
    }

    async verifyOTP(mobile, otp) {
        const response = await this.request('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ mobile, otp })
        });
        
        if (response.success && response.token) {
            this.token = response.token;
            localStorage.setItem('adminToken', this.token);
        }
        
        return response;
    }

    async logout() {
        const response = await this.request('/auth/logout', {
            method: 'POST'
        });
        
        this.token = null;
        localStorage.removeItem('adminToken');
        
        return response;
    }

    // Customer management methods
    async registerCustomer(name, mobile) {
        return this.request('/customers/register', {
            method: 'POST',
            body: JSON.stringify({ name, mobile })
        });
    }

    async getCustomer(customerId) {
        return this.request(`/customers/${customerId}`);
    }

    async searchCustomer(mobile) {
        return this.request(`/customers/search/${mobile}`);
    }

    async addStamp(customerId) {
        return this.request(`/customers/${customerId}/stamp`, {
            method: 'POST'
        });
    }

    async getCustomers(page = 1, limit = 10, search = '') {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search
        });
        return this.request(`/customers?${params}`);
    }

    async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    async downloadIdCard(customerId) {
        const response = await fetch(`${this.baseURL}/customers/${customerId}/id-card`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `id-card-${customerId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    }

    async exportCustomers() {
        const response = await fetch(`${this.baseURL}/customers/export/csv`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'customers-export.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    }
}

// Usage example
const api = new LoyaltyAPI('https://your-app.railway.app/api');

// Login flow
async function loginAdmin(mobile, otp) {
    try {
        const response = await api.verifyOTP(mobile, otp);
        if (response.success) {
            console.log('Login successful');
            // Update UI to show admin dashboard
            showAdminDashboard();
        }
    } catch (error) {
        console.error('Login failed:', error.message);
        showErrorMessage(error.message);
    }
}

// Register customer
async function registerNewCustomer(name, mobile) {
    try {
        const response = await api.registerCustomer(name, mobile);
        if (response.success) {
            console.log('Customer registered:', response.customer);
            // Update UI with new customer details
            showRegistrationSuccess(response.customer);
        }
    } catch (error) {
        console.error('Registration failed:', error.message);
        showErrorMessage(error.message);
    }
}
```

### React Integration Example
```jsx
import React, { useState, useEffect } from 'react';
import { LoyaltyAPI } from './api/loyaltyAPI';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const api = new LoyaltyAPI();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [statsData, customersData] = await Promise.all([
                api.getDashboardStats(),
                api.getCustomers()
            ]);
            
            setStats(statsData.stats);
            setCustomers(customersData.customers);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStamp = async (customerId) => {
        try {
            const response = await api.addStamp(customerId);
            if (response.success) {
                // Update local state
                setCustomers(prev => 
                    prev.map(customer => 
                        customer.id === customerId 
                            ? { ...customer, stamps_received: response.customer.stamps_received }
                            : customer
                    )
                );
                
                if (response.isCompleted) {
                    alert(`Congratulations! ${response.customer.name} completed their loyalty card!`);
                }
            }
        } catch (error) {
            alert('Failed to add stamp: ' + error.message);
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="admin-dashboard">
            <div className="dashboard-stats">
                <div className="stat-card">
                    <h3>{stats?.totalCustomers || 0}</h3>
                    <p>Total Customers</p>
                </div>
                <div className="stat-card">
                    <h3>{stats?.activeCards || 0}</h3>
                    <p>Active Cards</p>
                </div>
                <div className="stat-card">
                    <h3>{stats?.completedCards || 0}</h3>
                    <p>Completed Cards</p>
                </div>
            </div>
            
            <div className="customers-list">
                {customers.map(customer => (
                    <div key={customer.id} className="customer-card">
                        <h4>{customer.name}</h4>
                        <p>ID: {customer.id}</p>
                        <p>Mobile: {customer.mobile}</p>
                        <p>Stamps: {customer.stamps_received}/6</p>
                        
                        {customer.is_active && (
                            <button 
                                onClick={() => handleAddStamp(customer.id)}
                                className="add-stamp-btn"
                            >
                                Add Stamp 🐉
                            </button>
                        )}
                        
                        {customer.stamps_received >= 6 && (
                            <span className="completed-badge">Completed! 🏆</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminDashboard;
```

## Progressive Web App (PWA) Configuration

### manifest.json
```json
{
  "name": "RK Dragon Panipuri Loyalty",
  "short_name": "RK Loyalty",
  "description": "Loyalty card management system for RK Dragon Panipuri",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ff6b35",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (sw.js)
```javascript
const CACHE_NAME = 'rk-loyalty-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
```

## Error Handling & Validation

### Frontend Validation
```javascript
class FormValidator {
    static validateMobile(mobile) {
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobile) return 'Mobile number is required';
        if (!mobileRegex.test(mobile)) return 'Please enter a valid 10-digit mobile number';
        return null;
    }

    static validateName(name) {
        if (!name) return 'Name is required';
        if (name.length < 2) return 'Name must be at least 2 characters';
        if (name.length > 50) return 'Name must be less than 50 characters';
        return null;
    }

    static validateCustomerId(id) {
        const idRegex = /^RK-\d{6,10}$/;
        if (!id) return 'Customer ID is required';
        if (!idRegex.test(id)) return 'Please enter a valid customer ID (RK-XXXXXX)';
        return null;
    }
}

// Usage
const mobileError = FormValidator.validateMobile('9876543210');
if (mobileError) {
    showError(mobileError);
    return;
}
```

## Testing Configuration

### Jest Test Setup
```javascript
// tests/api.test.js
const request = require('supertest');
const app = require('../server');

describe('Authentication Endpoints', () => {
    test('POST /api/auth/send-otp should send OTP', async () => {
        const response = await request(app)
            .post('/api/auth/send-otp')
            .send({ mobile: '9876543210' });
            
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
    
    test('POST /api/auth/verify-otp should verify OTP', async () => {
        // First send OTP
        await request(app)
            .post('/api/auth/send-otp')
            .send({ mobile: '9876543210' });
            
        // Then verify with correct OTP
        const response = await request(app)
            .post('/api/auth/verify-otp')
            .send({ mobile: '9876543210', otp: '123456' });
            
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
    });
});
```

## Security Best Practices

1. **Environment Variables**: Never commit .env files
2. **JWT Security**: Use strong secrets and reasonable expiry times
3. **Rate Limiting**: Implemented on OTP endpoints
4. **Input Validation**: Validate all inputs on both client and server
5. **SQL Injection Prevention**: Use parameterized queries
6. **CORS Configuration**: Restrict to allowed origins
7. **HTTPS**: Always use HTTPS in production
8. **Session Management**: Proper token invalidation on logout

## Monitoring & Logging

### Winston Logger Setup
```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
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

module.exports = logger;
```

This comprehensive setup provides a complete full-stack loyalty card system ready for production deployment with all the requested features.