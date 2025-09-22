# RK Dragon Panipuri - Backend API Routes (Continued)

## Additional API Routes for server.js (Add after the previous code)

```javascript
// Customer Management Routes (Continued)

// Get customer by ID
app.get('/api/customers/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await Customer.findOne({ id });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        res.json({ success: true, customer });
        
    } catch (error) {
        logger.error('Get customer error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customer' });
    }
});

// Search customer by mobile
app.get('/api/customers/search/:mobile', verifyAdminToken, async (req, res) => {
    try {
        const { mobile } = req.params;
        
        const customer = await Customer.findOne({ mobile });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        res.json({ success: true, customer });
        
    } catch (error) {
        logger.error('Search customer error:', error);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
});

// Add stamp to customer
app.post('/api/customers/:id/stamp', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await Customer.findOne({ id });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        if (customer.stampsReceived >= 6) {
            return res.status(400).json({ success: false, message: 'Customer already completed loyalty card' });
        }
        
        const newStampCount = customer.stampsReceived + 1;
        const isCompleted = newStampCount >= 6;
        
        // Update customer
        customer.stampsReceived = newStampCount;
        customer.lastStampDate = new Date();
        customer.stampHistory.push({
            stampNumber: newStampCount,
            addedBy: req.admin.username
        });
        
        if (isCompleted) {
            customer.completionDate = new Date();
            customer.isActive = false;
        }
        
        await customer.save();
        
        // Send completion notification if completed
        if (isCompleted) {
            await sendCompletionNotifications(customer);
        }
        
        logger.info(`Stamp added to customer ${id}: ${newStampCount}/6`);
        res.json({
            success: true,
            message: isCompleted ? 'Loyalty card completed! Customer earned reward!' : 'Stamp added successfully',
            customer: customer.toObject(),
            isCompleted: isCompleted
        });
        
    } catch (error) {
        logger.error('Add stamp error:', error);
        res.status(500).json({ success: false, message: 'Failed to add stamp' });
    }
});

// Get all customers with pagination and filtering
app.get('/api/customers', verifyAdminToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || 'all'; // 'all', 'active', 'completed'
        
        let query = {};
        
        // Add search filter
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { mobile: new RegExp(search, 'i') },
                { id: new RegExp(search, 'i') }
            ];
        }
        
        // Add status filter
        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'completed') {
            query.isActive = false;
            query.stampsReceived = 6;
        }
        
        const totalRecords = await Customer.countDocuments(query);
        const customers = await Customer.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);
        
        res.json({
            success: true,
            customers,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalRecords / limit),
                totalRecords,
                hasNext: page < Math.ceil(totalRecords / limit),
                hasPrev: page > 1
            }
        });
        
    } catch (error) {
        logger.error('Get customers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customers' });
    }
});

// Dashboard Statistics
app.get('/api/dashboard/stats', verifyAdminToken, async (req, res) => {
    try {
        const totalCustomers = await Customer.countDocuments();
        const activeCards = await Customer.countDocuments({ isActive: true });
        const completedCards = await Customer.countDocuments({ isActive: false, stampsReceived: 6 });
        
        // Additional stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const newTodayCustomers = await Customer.countDocuments({ 
            registrationDate: { $gte: todayStart }
        });
        
        const completedTodayCards = await Customer.countDocuments({
            completionDate: { $gte: todayStart }
        });
        
        // Monthly statistics
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthlyStats = await Customer.aggregate([
            {
                $match: {
                    registrationDate: { $gte: monthStart }
                }
            },
            {
                $group: {
                    _id: { 
                        day: { $dayOfMonth: "$registrationDate" } 
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.day": 1 } }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalCustomers,
                activeCards,
                completedCards,
                newTodayCustomers,
                completedTodayCards,
                completionRate: totalCustomers > 0 ? Math.round((completedCards / totalCustomers) * 100) : 0,
                monthlyRegistrations: monthlyStats
            }
        });
        
    } catch (error) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
});

// Customer Sharing Routes
app.post('/api/customers/:id/share', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { method, contact } = req.body; // method: 'whatsapp', 'email', 'sms'
        
        const customer = await Customer.findOne({ id });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        const message = `🐉 Welcome to RK Dragon Panipuri Loyalty Program! Your Customer ID: ${customer.id}. Collect 6 dragon stamps to earn rewards! 🎁`;
        
        let result;
        switch (method) {
            case 'whatsapp':
                result = await sendWhatsAppMessage(contact || customer.mobile, message);
                break;
            case 'sms':
                result = await sendSMSMessage(contact || customer.mobile, message);
                break;
            case 'email':
                const emailHtml = `
                    <h2>🐉 Welcome to RK Dragon Panipuri Loyalty Program!</h2>
                    <p>Dear ${customer.name},</p>
                    <p>Thank you for joining our loyalty program!</p>
                    <p><strong>Your Customer ID: ${customer.id}</strong></p>
                    <p>Collect 6 dragon stamps to earn exciting rewards!</p>
                    <p>Current Progress: ${customer.stampsReceived}/6 stamps</p>
                    <br>
                    <p>Best regards,<br>RK Dragon Panipuri Team</p>
                `;
                result = await sendEmail(
                    contact || customer.mobile + '@example.com', // You might want to collect email during registration
                    'RK Dragon Panipuri - Your Loyalty Card Details',
                    emailHtml,
                    message
                );
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid sharing method' });
        }
        
        logger.info(`Customer details shared via ${method} for ${id}`);
        res.json({
            success: true,
            message: `Customer details shared via ${method}`,
            result
        });
        
    } catch (error) {
        logger.error('Customer share error:', error);
        res.status(500).json({ success: false, message: 'Sharing failed' });
    }
});

// Generate and Download ID Card (PDF)
app.get('/api/customers/:id/id-card', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await Customer.findOne({ id });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        
        // Generate QR code for customer ID
        const qrCodeDataURL = await QRCode.toDataURL(customer.id);
        
        // Create PDF document
        const doc = new PDFDocument({ size: [400, 250], margin: 20 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="loyalty-card-${customer.id}.pdf"`);
        
        doc.pipe(res);
        
        // Add content to PDF
        doc.fontSize(18).fillColor('#DC143C').text('🐉 RK DRAGON PANIPURI 🐉', { align: 'center' });
        doc.fontSize(12).fillColor('#000').text('Loyalty Card', { align: 'center' });
        doc.moveDown();
        
        // Customer details
        doc.fontSize(10);
        doc.text(`Customer ID: ${customer.id}`, 20, 80);
        doc.text(`Name: ${customer.name}`, 20, 95);
        doc.text(`Mobile: ${customer.mobile}`, 20, 110);
        doc.text(`Registration Date: ${new Date(customer.registrationDate).toLocaleDateString()}`, 20, 125);
        doc.text(`Stamps Collected: ${customer.stampsReceived}/6`, 20, 140);
        
        if (customer.stampsReceived >= 6) {
            doc.fillColor('#228B22').text('🏆 COMPLETED - Reward Earned!', 20, 160);
        }
        
        // Add stamps visualization
        const startX = 20;
        const startY = 180;
        for (let i = 1; i <= 6; i++) {
            const stampX = startX + (i - 1) * 45;
            const stampY = startY;
            
            if (i <= customer.stampsReceived) {
                doc.fillColor('#FF6B35').text('🐉', stampX, stampY);
            } else {
                doc.fillColor('#CCC').text('🐲', stampX, stampY);
            }
        }
        
        doc.end();
        
        logger.info(`ID card generated for customer ${id}`);
        
    } catch (error) {
        logger.error('ID card generation error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate ID card' });
    }
});

// CSV Export Route
app.get('/api/customers/export/csv', verifyAdminToken, async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        
        const csvFilePath = `exports/customers-export-${Date.now()}.csv`;
        
        const csvWriter = createCsvWriter({
            path: csvFilePath,
            header: [
                { id: 'id', title: 'Customer ID' },
                { id: 'name', title: 'Name' },
                { id: 'mobile', title: 'Mobile' },
                { id: 'registrationDate', title: 'Registration Date' },
                { id: 'stampsReceived', title: 'Stamps Received' },
                { id: 'completionDate', title: 'Completion Date' },
                { id: 'status', title: 'Status' }
            ]
        });
        
        const csvData = customers.map(customer => ({
            id: customer.id,
            name: customer.name,
            mobile: customer.mobile,
            registrationDate: new Date(customer.registrationDate).toLocaleDateString(),
            stampsReceived: customer.stampsReceived,
            completionDate: customer.completionDate ? new Date(customer.completionDate).toLocaleDateString() : '',
            status: customer.isActive ? 'Active' : 'Completed'
        }));
        
        await csvWriter.writeRecords(csvData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.csv"`);
        
        const fileStream = fs.createReadStream(csvFilePath);
        fileStream.pipe(res);
        
        fileStream.on('end', () => {
            // Clean up the temporary file
            setTimeout(() => {
                fs.unlink(csvFilePath, (err) => {
                    if (err) logger.error('Error deleting CSV file:', err);
                });
            }, 10000);
        });
        
        logger.info(`CSV export completed - ${customers.length} customers`);
        
    } catch (error) {
        logger.error('CSV export error:', error);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

// CSV Import Route
app.post('/api/customers/import/csv', verifyAdminToken, csvUpload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'CSV file is required' });
        }
        
        const csvFilePath = req.file.path;
        const importedCustomers = [];
        const errors = [];
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Validate and normalize the row data
                    const customerData = {
                        id: row['Customer ID'] || row['id'] || generateCustomerId(),
                        name: row['Name'] || row['name'],
                        mobile: row['Mobile'] || row['mobile'],
                        registrationDate: row['Registration Date'] || row['registrationDate'] || new Date(),
                        stampsReceived: parseInt(row['Stamps Received'] || row['stampsReceived'] || 0),
                        completionDate: row['Completion Date'] || row['completionDate'] || null,
                        status: row['Status'] || row['status'] || 'Active'
                    };
                    
                    // Basic validation
                    if (!customerData.name || !customerData.mobile) {
                        errors.push(`Row with ID ${customerData.id}: Name and mobile are required`);
                        return;
                    }
                    
                    if (!validator.isMobilePhone(customerData.mobile, 'en-IN')) {
                        errors.push(`Row with ID ${customerData.id}: Invalid mobile number format`);
                        return;
                    }
                    
                    importedCustomers.push(customerData);
                })
                .on('end', async () => {
                    try {
                        // Clean up uploaded file
                        fs.unlink(csvFilePath, (err) => {
                            if (err) logger.error('Error deleting uploaded CSV file:', err);
                        });
                        
                        if (importedCustomers.length === 0) {
                            return res.status(400).json({ 
                                success: false, 
                                message: 'No valid customer data found in CSV',
                                errors 
                            });
                        }
                        
                        const importResults = {
                            successful: 0,
                            failed: 0,
                            duplicates: 0,
                            errors: [...errors]
                        };
                        
                        // Process each customer
                        for (const customerData of importedCustomers) {
                            try {
                                // Check if customer already exists
                                const existingCustomer = await Customer.findOne({ 
                                    $or: [
                                        { id: customerData.id },
                                        { mobile: customerData.mobile }
                                    ]
                                });
                                
                                if (existingCustomer) {
                                    // Update existing customer
                                    await Customer.findOneAndUpdate(
                                        { $or: [{ id: customerData.id }, { mobile: customerData.mobile }] },
                                        {
                                            ...customerData,
                                            isActive: customerData.status === 'Active',
                                            updatedAt: new Date()
                                        }
                                    );
                                    importResults.duplicates++;
                                } else {
                                    // Create new customer
                                    const newCustomer = new Customer({
                                        ...customerData,
                                        isActive: customerData.status === 'Active'
                                    });
                                    await newCustomer.save();
                                    importResults.successful++;
                                }
                                
                            } catch (error) {
                                importResults.failed++;
                                importResults.errors.push(`Failed to import ${customerData.name}: ${error.message}`);
                            }
                        }
                        
                        logger.info(`CSV import completed: ${importResults.successful} successful, ${importResults.failed} failed, ${importResults.duplicates} updated`);
                        
                        res.json({
                            success: true,
                            message: 'CSV import completed',
                            results: importResults
                        });
                        
                    } catch (error) {
                        logger.error('CSV import processing error:', error);
                        res.status(500).json({ success: false, message: 'Import processing failed' });
                    }
                })
                .on('error', (error) => {
                    logger.error('CSV parsing error:', error);
                    fs.unlink(csvFilePath, () => {}); // Clean up file
                    res.status(500).json({ success: false, message: 'CSV parsing failed' });
                });
        });
        
    } catch (error) {
        logger.error('CSV import error:', error);
        res.status(500).json({ success: false, message: 'Import failed' });
    }
});

// Utility function for completion notifications
async function sendCompletionNotifications(customer) {
    try {
        const completionMessage = `🎉 Congratulations ${customer.name}! You've completed your RK Dragon Panipuri loyalty card. Visit us to claim your reward! 🐉`;
        
        // Send WhatsApp if enabled
        if (customer.notificationPreferences.whatsapp) {
            await sendWhatsAppMessage(customer.mobile, completionMessage);
        }
        
        // Send SMS if enabled
        if (customer.notificationPreferences.sms) {
            await sendSMSMessage(customer.mobile, completionMessage);
        }
        
        // Send Email if enabled and email available
        if (customer.notificationPreferences.email && customer.email) {
            const emailHtml = `
                <h2>🎉 Congratulations ${customer.name}!</h2>
                <p>You've completed your RK Dragon Panipuri loyalty card!</p>
                <p><strong>Customer ID:</strong> ${customer.id}</p>
                <p><strong>Completion Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p>Visit us to claim your exciting reward!</p>
                <br>
                <p>Thank you for being a loyal customer!</p>
                <p>RK Dragon Panipuri Team 🐉</p>
            `;
            
            await sendEmail(
                customer.email,
                'Loyalty Card Completed - Claim Your Reward!',
                emailHtml,
                completionMessage
            );
        }
        
        logger.info(`Completion notifications sent to customer ${customer.id}`);
        
    } catch (error) {
        logger.error('Failed to send completion notifications:', error);
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV
    });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
}

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    
    if (error.name === 'MulterError') {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File size too large' });
        }
    }
    
    res.status(500).json({ 
        success: false, 
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🐉 RK Dragon Panipuri Loyalty System Ready!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    mongoose.connection.close(() => {
        logger.info('Database connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    mongoose.connection.close(() => {
        logger.info('Database connection closed');
        process.exit(0);
    });
});

module.exports = app;
```