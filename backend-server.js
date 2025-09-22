# RK Dragon Panipuri - Backend Server (Node.js)

```javascript
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rk_dragon_loyalty'
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
    createTables();
});

// Create necessary tables
function createTables() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS customers (
            id VARCHAR(20) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            mobile VARCHAR(15) UNIQUE NOT NULL,
            registration_date DATE DEFAULT (CURRENT_DATE),
            stamps_received INT DEFAULT 0,
            completion_date DATE NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS admin_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mobile VARCHAR(15) NOT NULL,
            session_token VARCHAR(255) NOT NULL,
            login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )`,
        
        `CREATE TABLE IF NOT EXISTS otp_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mobile VARCHAR(15) NOT NULL,
            otp VARCHAR(6) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 5 MINUTE),
            is_used BOOLEAN DEFAULT FALSE
        )`,
        
        `CREATE TABLE IF NOT EXISTS stamp_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id VARCHAR(20) NOT NULL,
            stamp_number INT NOT NULL,
            added_by VARCHAR(15) NOT NULL,
            added_date DATE DEFAULT (CURRENT_DATE),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )`
    ];
    
    tables.forEach(sql => {
        db.query(sql, (err) => {
            if (err) console.error('Error creating table:', err);
        });
    });
}

// Generate unique customer ID
function generateCustomerId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RK-${timestamp}${random}`.substring(0, 10);
}

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP (Mock implementation - integrate with actual SMS service)
async function sendOTP(mobile, otp) {
    // In production, integrate with services like Twilio, AWS SNS, or local SMS gateway
    console.log(`Sending OTP ${otp} to ${mobile}`);
    
    // For demo purposes, always return success
    // In production, implement actual SMS sending logic
    return { success: true, message: 'OTP sent successfully' };
}

// Middleware to verify admin token
function verifyAdminToken(req, res, next) {
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.admin = decoded;
        
        // Update last activity
        db.query(
            'UPDATE admin_sessions SET last_activity = NOW() WHERE session_token = ? AND is_active = TRUE',
            [token],
            (err) => {
                if (err) console.error('Error updating last activity:', err);
            }
        );
        
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}

// Routes

// Send OTP for admin login
app.post('/api/auth/send-otp', async (req, res) => {
    const { mobile } = req.body;
    
    if (!mobile || mobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Valid mobile number required' });
    }
    
    // Check if mobile is admin mobile (you can add admin mobile numbers to database)
    const adminMobiles = ['9876543210', '8765432109']; // Add your admin numbers
    if (!adminMobiles.includes(mobile)) {
        return res.status(403).json({ success: false, message: 'Unauthorized mobile number' });
    }
    
    const otp = generateOTP();
    
    try {
        // Save OTP to database
        db.query(
            'INSERT INTO otp_requests (mobile, otp) VALUES (?, ?)',
            [mobile, otp],
            async (err) => {
                if (err) {
                    console.error('Error saving OTP:', err);
                    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
                }
                
                // Send OTP via SMS
                const smsResult = await sendOTP(mobile, otp);
                
                if (smsResult.success) {
                    res.json({ success: true, message: 'OTP sent successfully' });
                } else {
                    res.status(500).json({ success: false, message: 'Failed to send SMS' });
                }
            }
        );
    } catch (error) {
        console.error('Error in send OTP:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Verify OTP and login admin
app.post('/api/auth/verify-otp', (req, res) => {
    const { mobile, otp } = req.body;
    
    if (!mobile || !otp) {
        return res.status(400).json({ success: false, message: 'Mobile and OTP required' });
    }
    
    // Verify OTP from database
    db.query(
        'SELECT * FROM otp_requests WHERE mobile = ? AND otp = ? AND expires_at > NOW() AND is_used = FALSE ORDER BY created_at DESC LIMIT 1',
        [mobile, otp],
        (err, results) => {
            if (err) {
                console.error('Error verifying OTP:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            
            if (results.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
            }
            
            // Mark OTP as used
            db.query(
                'UPDATE otp_requests SET is_used = TRUE WHERE id = ?',
                [results[0].id],
                (err) => {
                    if (err) console.error('Error updating OTP:', err);
                }
            );
            
            // Generate JWT token
            const token = jwt.sign(
                { mobile: mobile, loginTime: new Date() },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );
            
            // Save session to database
            db.query(
                'INSERT INTO admin_sessions (mobile, session_token) VALUES (?, ?)',
                [mobile, token],
                (err) => {
                    if (err) console.error('Error saving session:', err);
                }
            );
            
            // Set HTTP-only cookie
            res.cookie('adminToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            
            res.json({
                success: true,
                message: 'Login successful',
                token: token,
                admin: { mobile: mobile }
            });
        }
    );
});

// Admin logout
app.post('/api/auth/logout', verifyAdminToken, (req, res) => {
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];
    
    // Deactivate session
    db.query(
        'UPDATE admin_sessions SET is_active = FALSE WHERE session_token = ?',
        [token],
        (err) => {
            if (err) console.error('Error deactivating session:', err);
        }
    );
    
    res.clearCookie('adminToken');
    res.json({ success: true, message: 'Logged out successfully' });
});

// Register new customer
app.post('/api/customers/register', verifyAdminToken, (req, res) => {
    const { name, mobile } = req.body;
    
    if (!name || !mobile) {
        return res.status(400).json({ success: false, message: 'Name and mobile required' });
    }
    
    if (mobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
    }
    
    const customerId = generateCustomerId();
    
    db.query(
        'INSERT INTO customers (id, name, mobile) VALUES (?, ?, ?)',
        [customerId, name, mobile],
        (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: 'Mobile number already registered' });
                }
                console.error('Error registering customer:', err);
                return res.status(500).json({ success: false, message: 'Failed to register customer' });
            }
            
            res.json({
                success: true,
                message: 'Customer registered successfully',
                customer: {
                    id: customerId,
                    name: name,
                    mobile: mobile,
                    stampsReceived: 0
                }
            });
        }
    );
});

// Get customer by ID
app.get('/api/customers/:id', verifyAdminToken, (req, res) => {
    const { id } = req.params;
    
    db.query(
        'SELECT * FROM customers WHERE id = ?',
        [id],
        (err, results) => {
            if (err) {
                console.error('Error fetching customer:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'Customer not found' });
            }
            
            res.json({ success: true, customer: results[0] });
        }
    );
});

// Search customer by mobile
app.get('/api/customers/search/:mobile', verifyAdminToken, (req, res) => {
    const { mobile } = req.params;
    
    db.query(
        'SELECT * FROM customers WHERE mobile = ?',
        [mobile],
        (err, results) => {
            if (err) {
                console.error('Error searching customer:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ success: false, message: 'Customer not found' });
            }
            
            res.json({ success: true, customer: results[0] });
        }
    );
});

// Add stamp to customer
app.post('/api/customers/:id/stamp', verifyAdminToken, (req, res) => {
    const { id } = req.params;
    const adminMobile = req.admin.mobile;
    
    db.query('SELECT * FROM customers WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching customer:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        const customer = results[0];
        
        if (customer.stamps_received >= 6) {
            return res.status(400).json({ success: false, message: 'Customer already completed loyalty card' });
        }
        
        const newStampCount = customer.stamps_received + 1;
        const isCompleted = newStampCount >= 6;
        
        // Update customer stamps
        db.query(
            'UPDATE customers SET stamps_received = ?, completion_date = ?, is_active = ? WHERE id = ?',
            [newStampCount, isCompleted ? new Date() : null, !isCompleted, id],
            (err) => {
                if (err) {
                    console.error('Error updating customer stamps:', err);
                    return res.status(500).json({ success: false, message: 'Failed to add stamp' });
                }
                
                // Add stamp history
                db.query(
                    'INSERT INTO stamp_history (customer_id, stamp_number, added_by) VALUES (?, ?, ?)',
                    [id, newStampCount, adminMobile],
                    (err) => {
                        if (err) console.error('Error saving stamp history:', err);
                    }
                );
                
                res.json({
                    success: true,
                    message: isCompleted ? 'Loyalty card completed! Customer earned reward!' : 'Stamp added successfully',
                    customer: {
                        ...customer,
                        stamps_received: newStampCount,
                        completion_date: isCompleted ? new Date() : null,
                        is_active: !isCompleted
                    },
                    isCompleted: isCompleted
                });
            }
        );
    });
});

// Get all customers with pagination
app.get('/api/customers', verifyAdminToken, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    let query = 'SELECT * FROM customers';
    let countQuery = 'SELECT COUNT(*) as total FROM customers';
    let params = [];
    
    if (search) {
        query += ' WHERE name LIKE ? OR mobile LIKE ? OR id LIKE ?';
        countQuery += ' WHERE name LIKE ? OR mobile LIKE ? OR id LIKE ?';
        params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    // Get total count
    db.query(countQuery, params, (err, countResults) => {
        if (err) {
            console.error('Error counting customers:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        
        const totalRecords = countResults[0].total;
        
        // Get customers
        db.query(query, [...params, limit, offset], (err, results) => {
            if (err) {
                console.error('Error fetching customers:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            
            res.json({
                success: true,
                customers: results,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords: totalRecords,
                    hasNext: page < Math.ceil(totalRecords / limit),
                    hasPrev: page > 1
                }
            });
        });
    });
});

// Get dashboard statistics
app.get('/api/dashboard/stats', verifyAdminToken, (req, res) => {
    const queries = [
        'SELECT COUNT(*) as total FROM customers',
        'SELECT COUNT(*) as active FROM customers WHERE is_active = TRUE',
        'SELECT COUNT(*) as completed FROM customers WHERE stamps_received >= 6'
    ];
    
    Promise.all(queries.map(query => 
        new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        })
    )).then(results => {
        res.json({
            success: true,
            stats: {
                totalCustomers: results[0].total || 0,
                activeCards: results[1].active || 0,
                completedCards: results[2].completed || 0
            }
        });
    }).catch(err => {
        console.error('Error fetching stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    });
});

// Generate customer ID card (PDF)
app.get('/api/customers/:id/id-card', verifyAdminToken, (req, res) => {
    const { id } = req.params;
    
    db.query('SELECT * FROM customers WHERE id = ?', [id], async (err, results) => {
        if (err) {
            console.error('Error fetching customer:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        const customer = results[0];
        
        try {
            // Generate QR code for customer ID
            const qrCodeDataURL = await QRCode.toDataURL(customer.id);
            
            // Create PDF document
            const doc = new PDFDocument({ size: [300, 200], margin: 20 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="id-card-${customer.id}.pdf"`);
            
            doc.pipe(res);
            
            // Add content to PDF
            doc.fontSize(16).text('RK DRAGON PANIPURI', { align: 'center' });
            doc.fontSize(12).text('Loyalty Card', { align: 'center' });
            doc.moveDown();
            
            doc.fontSize(10);
            doc.text(`Customer ID: ${customer.id}`);
            doc.text(`Name: ${customer.name}`);
            doc.text(`Mobile: ${customer.mobile}`);
            doc.text(`Stamps: ${customer.stamps_received}/6`);
            
            // Add QR code (simplified - in production use proper image handling)
            doc.text('Scan QR code with app:', 20, 140);
            
            doc.end();
            
        } catch (error) {
            console.error('Error generating ID card:', error);
            res.status(500).json({ success: false, message: 'Failed to generate ID card' });
        }
    });
});

// Export customer data as CSV
app.get('/api/customers/export/csv', verifyAdminToken, (req, res) => {
    db.query('SELECT * FROM customers ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('Error fetching customers for export:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        
        // Generate CSV content
        const csvHeader = 'Customer ID,Name,Mobile,Registration Date,Stamps Received,Completion Date,Status\\n';
        const csvRows = results.map(customer => 
            `${customer.id},"${customer.name}",${customer.mobile},${customer.registration_date},${customer.stamps_received},${customer.completion_date || 'N/A'},${customer.is_active ? 'Active' : 'Completed'}`
        ).join('\\n');
        
        const csvContent = csvHeader + csvRows;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"');
        res.send(csvContent);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    db.end(() => {
        process.exit(0);
    });
});
```