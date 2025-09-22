// RK Dragon Panipuri Loyalty System
class LoyaltySystem {
    constructor() {
        this.isAdminLoggedIn = false;
        this.currentCustomer = null;
        this.adminData = {
            mobile: '9876543210',
            otp: '1234'
        };
        
        this.initializeSystem();
        this.bindEvents();
        this.loadPersistedData();
    }

    initializeSystem() {
        // Ensure all modals are hidden on initialization
        this.hideAllModals();
        
        // Initialize localStorage if empty
        if (!localStorage.getItem('loyaltyCustomers')) {
            localStorage.setItem('loyaltyCustomers', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('adminSessions')) {
            localStorage.setItem('adminSessions', JSON.stringify([]));
        }

        // Load sample data if no customers exist
        const customers = this.getCustomers();
        if (customers.length === 0) {
            this.loadSampleData();
        }

        this.updateDashboardStats();
    }

    loadSampleData() {
        const sampleCustomers = [
            {
                id: 'RK-123456',
                name: 'முருகன்',
                mobile: '9988776655',
                registrationDate: '2025-09-20',
                stampsReceived: 3,
                completionDate: null,
                isActive: true
            },
            {
                id: 'RK-789012',
                name: 'லட்சுமி',
                mobile: '8877665544',
                registrationDate: '2025-09-18',
                stampsReceived: 6,
                completionDate: '2025-09-21',
                isActive: false
            }
        ];

        localStorage.setItem('loyaltyCustomers', JSON.stringify(sampleCustomers));
    }

    bindEvents() {
        // Admin login events
        document.getElementById('adminLoginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('closeModal').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('sendOtpBtn').addEventListener('click', () => this.sendOTP());
        document.getElementById('verifyOtpBtn').addEventListener('click', () => this.verifyOTP());
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.logout());

        // Dashboard navigation events
        document.getElementById('registerCustomerBtn').addEventListener('click', () => this.showCustomerRegistration());
        document.getElementById('verifyCustomerBtn').addEventListener('click', () => this.showCustomerVerification());
        document.getElementById('searchCustomerBtn').addEventListener('click', () => this.showCustomerSearch());

        // Form events
        document.getElementById('customerForm').addEventListener('submit', (e) => this.registerCustomer(e));
        document.getElementById('verifyIdBtn').addEventListener('click', () => this.verifyCustomerId());
        document.getElementById('searchMobileBtn').addEventListener('click', () => this.searchByMobile());

        // Customer details events
        document.getElementById('addStampBtn').addEventListener('click', () => this.addStamp());
        document.getElementById('printIdBtn').addEventListener('click', () => this.showPrintModal());
        document.getElementById('backToDashboard').addEventListener('click', () => this.showDashboard());

        // Cancel button events
        document.getElementById('cancelRegistration').addEventListener('click', () => this.showDashboard());
        document.getElementById('cancelVerification').addEventListener('click', () => this.showDashboard());
        document.getElementById('cancelSearch').addEventListener('click', () => this.showDashboard());

        // Modal close events - Fixed
        document.getElementById('closeCompletionModal').addEventListener('click', () => this.hideCompletionModal());
        document.getElementById('closePrintModal').addEventListener('click', () => this.hidePrintModal());
        document.getElementById('printVoucherBtn').addEventListener('click', () => this.printVoucher());

        // Modal backdrop clicks - Fixed
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                if (e.target.closest('#loginModal')) {
                    this.hideLoginModal();
                } else if (e.target.closest('#completionModal')) {
                    this.hideCompletionModal();
                } else if (e.target.closest('#printModal')) {
                    this.hidePrintModal();
                }
            }
        });

        // Keyboard events - Fixed
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    // Authentication Methods
    showLoginModal() {
        this.hideAllModals();
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('adminMobile').focus();
    }

    hideLoginModal() {
        document.getElementById('loginModal').classList.add('hidden');
        this.resetLoginForm();
    }

    resetLoginForm() {
        document.getElementById('adminMobile').value = '';
        document.getElementById('otpInput').value = '';
        document.getElementById('otpGroup').style.display = 'none';
        document.getElementById('sendOtpBtn').classList.remove('hidden');
        document.getElementById('verifyOtpBtn').classList.add('hidden');
    }

    sendOTP() {
        const mobile = document.getElementById('adminMobile').value.trim();
        
        if (!mobile) {
            this.showMessage('Please enter mobile number', 'error');
            return;
        }

        if (mobile !== this.adminData.mobile) {
            this.showMessage('Invalid admin mobile number', 'error');
            return;
        }

        // Simulate OTP sending
        document.getElementById('otpGroup').style.display = 'block';
        document.getElementById('sendOtpBtn').classList.add('hidden');
        document.getElementById('verifyOtpBtn').classList.remove('hidden');
        document.getElementById('otpInput').focus();

        this.showMessage('OTP sent successfully! Demo OTP: 1234', 'success');
    }

    verifyOTP() {
        const otp = document.getElementById('otpInput').value.trim();
        
        if (!otp) {
            this.showMessage('Please enter OTP', 'error');
            return;
        }

        if (otp !== this.adminData.otp) {
            this.showMessage('Invalid OTP. Please try again.', 'error');
            return;
        }

        // Successful login
        this.isAdminLoggedIn = true;
        this.saveAdminSession();
        this.hideLoginModal();
        this.showAdminInterface();
        this.showMessage('Login successful! Welcome Admin', 'success');
    }

    saveAdminSession() {
        const sessions = JSON.parse(localStorage.getItem('adminSessions') || '[]');
        sessions.push({
            loginTime: new Date().toISOString(),
            mobile: this.adminData.mobile
        });
        localStorage.setItem('adminSessions', JSON.stringify(sessions));
        
        // Set session cookie (simulated with localStorage)
        localStorage.setItem('currentAdminSession', JSON.stringify({
            mobile: this.adminData.mobile,
            loginTime: new Date().toISOString()
        }));
    }

    loadPersistedData() {
        const session = localStorage.getItem('currentAdminSession');
        if (session) {
            const sessionData = JSON.parse(session);
            const loginTime = new Date(sessionData.loginTime);
            const now = new Date();
            
            // Check if session is less than 24 hours old
            if (now - loginTime < 24 * 60 * 60 * 1000) {
                this.isAdminLoggedIn = true;
                this.showAdminInterface();
                return;
            }
        }
        
        // If no valid session, show welcome screen
        this.showWelcomeScreen();
    }

    logout() {
        this.isAdminLoggedIn = false;
        this.currentCustomer = null;
        localStorage.removeItem('currentAdminSession');
        this.showWelcomeScreen();
        this.showMessage('Logged out successfully', 'info');
    }

    // UI State Management - Fixed
    showWelcomeScreen() {
        this.hideAllModals();
        this.hideAllSections();
        document.getElementById('welcomeScreen').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
        document.getElementById('adminLoginBtn').classList.remove('hidden');
        document.getElementById('adminLogoutBtn').classList.add('hidden');
    }

    showAdminInterface() {
        this.hideAllModals();
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        document.getElementById('adminLoginBtn').classList.add('hidden');
        document.getElementById('adminLogoutBtn').classList.remove('hidden');
        this.showDashboard();
        this.displayAllCustomers();
    }

    showDashboard() {
        this.hideAllSections();
        this.updateDashboardStats();
    }

    hideAllSections() {
        const sections = ['customerRegistration', 'customerVerification', 'customerSearch', 'customerDetails'];
        sections.forEach(sectionId => {
            document.getElementById(sectionId).classList.add('hidden');
        });
    }

    // Customer Management
    showCustomerRegistration() {
        this.hideAllSections();
        document.getElementById('customerRegistration').classList.remove('hidden');
        document.getElementById('customerName').focus();
    }

    registerCustomer(e) {
        e.preventDefault();
        
        const name = document.getElementById('customerName').value.trim();
        const mobile = document.getElementById('customerMobile').value.trim();

        if (!name || !mobile) {
            this.showMessage('Please fill all fields', 'error');
            return;
        }

        if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
            this.showMessage('Please enter a valid 10-digit mobile number', 'error');
            return;
        }

        // Check if customer already exists
        const customers = this.getCustomers();
        const existingCustomer = customers.find(customer => customer.mobile === mobile);
        
        if (existingCustomer) {
            this.showMessage(`Customer already registered with ID: ${existingCustomer.id}`, 'error');
            return;
        }

        // Generate new customer
        const customerId = this.generateCustomerId();
        const newCustomer = {
            id: customerId,
            name: name,
            mobile: mobile,
            registrationDate: new Date().toISOString().split('T')[0],
            stampsReceived: 0,
            completionDate: null,
            isActive: true
        };

        customers.push(newCustomer);
        this.saveCustomers(customers);

        // Reset form
        document.getElementById('customerForm').reset();
        
        // Show success message and customer details
        this.showMessage(`Customer registered successfully! ID: ${customerId}`, 'success');
        this.currentCustomer = newCustomer;
        this.showCustomerDetails();
        this.updateDashboardStats();
        this.displayAllCustomers();
    }

    generateCustomerId() {
        const customers = this.getCustomers();
        let customerId;
        
        do {
            const randomNum = Math.floor(100000 + Math.random() * 900000);
            customerId = `RK-${randomNum}`;
        } while (customers.some(customer => customer.id === customerId));
        
        return customerId;
    }

    showCustomerVerification() {
        this.hideAllSections();
        document.getElementById('customerVerification').classList.remove('hidden');
        document.getElementById('verifyCustomerId').focus();
    }

    verifyCustomerId() {
        const customerId = document.getElementById('verifyCustomerId').value.trim().toUpperCase();
        
        if (!customerId) {
            this.showMessage('Please enter customer ID', 'error');
            return;
        }

        const customer = this.findCustomerById(customerId);
        
        if (!customer) {
            this.showMessage('Customer ID not found', 'error');
            return;
        }

        this.currentCustomer = customer;
        this.showCustomerDetails();
        document.getElementById('verifyCustomerId').value = '';
    }

    showCustomerSearch() {
        this.hideAllSections();
        document.getElementById('customerSearch').classList.remove('hidden');
        document.getElementById('searchMobile').focus();
    }

    searchByMobile() {
        const mobile = document.getElementById('searchMobile').value.trim();
        
        if (!mobile) {
            this.showMessage('Please enter mobile number', 'error');
            return;
        }

        const customer = this.findCustomerByMobile(mobile);
        
        if (!customer) {
            this.showMessage('Customer not found with this mobile number', 'error');
            return;
        }

        this.currentCustomer = customer;
        this.showCustomerDetails();
        document.getElementById('searchMobile').value = '';
    }

    showCustomerDetails() {
        this.hideAllSections();
        document.getElementById('customerDetails').classList.remove('hidden');

        if (!this.currentCustomer) return;

        // Update customer information
        document.getElementById('detailName').textContent = this.currentCustomer.name;
        document.getElementById('detailId').textContent = this.currentCustomer.id;
        document.getElementById('detailMobile').textContent = this.currentCustomer.mobile;
        document.getElementById('detailDate').textContent = this.currentCustomer.registrationDate;

        // Update loyalty card
        this.updateLoyaltyCard();
    }

    updateLoyaltyCard() {
        if (!this.currentCustomer) return;

        const stamps = this.currentCustomer.stampsReceived;
        const maxStamps = 6;

        // Update progress
        document.getElementById('progressText').textContent = `${stamps}/${maxStamps}`;
        document.getElementById('progressFill').style.width = `${(stamps / maxStamps) * 100}%`;

        // Update stamp boxes
        const stampBoxes = document.querySelectorAll('.stamp-box');
        stampBoxes.forEach((box, index) => {
            const dayNumber = index + 1;
            const stampIcon = box.querySelector('.stamp-icon');
            
            box.classList.remove('stamped', 'completed');
            
            if (dayNumber <= stamps) {
                if (stamps === maxStamps) {
                    box.classList.add('completed');
                    stampIcon.textContent = '🏆';
                } else {
                    box.classList.add('stamped');
                    stampIcon.textContent = '🐉';
                }
            } else {
                stampIcon.textContent = '🐲';
            }
        });

        // Update add stamp button
        const addStampBtn = document.getElementById('addStampBtn');
        if (stamps >= maxStamps || !this.currentCustomer.isActive) {
            addStampBtn.disabled = true;
            addStampBtn.textContent = stamps >= maxStamps ? 'Card Completed' : 'Card Inactive';
        } else {
            addStampBtn.disabled = false;
            addStampBtn.textContent = 'Add Stamp';
        }
    }

    addStamp() {
        if (!this.currentCustomer || this.currentCustomer.stampsReceived >= 6) return;

        const customers = this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === this.currentCustomer.id);
        
        if (customerIndex === -1) return;

        // Add stamp
        customers[customerIndex].stampsReceived++;
        this.currentCustomer.stampsReceived++;

        // Check if completed
        if (this.currentCustomer.stampsReceived >= 6) {
            customers[customerIndex].completionDate = new Date().toISOString().split('T')[0];
            customers[customerIndex].isActive = false;
            this.currentCustomer.completionDate = customers[customerIndex].completionDate;
            this.currentCustomer.isActive = false;
        }

        this.saveCustomers(customers);
        this.updateLoyaltyCard();
        
        if (this.currentCustomer.stampsReceived >= 6) {
            this.showCompletionModal();
        } else {
            this.showMessage(`Stamp added! ${this.currentCustomer.stampsReceived}/6 stamps collected`, 'success');
        }
        
        this.updateDashboardStats();
        this.displayAllCustomers();
    }

    // Completion and Rewards
    showCompletionModal() {
        document.getElementById('completionModal').classList.remove('hidden');
        document.getElementById('completionMessage').textContent = 
            `🎉 ${this.currentCustomer.name} has completed their loyalty card! 🎉`;
        
        // Set voucher expiry (30 days from now)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        document.getElementById('voucherExpiry').textContent = expiryDate.toLocaleDateString();
    }

    hideCompletionModal() {
        document.getElementById('completionModal').classList.add('hidden');
    }

    printVoucher() {
        // Create a simple print content for the voucher
        const voucherContent = `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px; border: 3px solid #FFD700; border-radius: 10px; max-width: 400px; margin: 20px auto;">
                <h2 style="color: #DC143C; margin-bottom: 10px;">🐉 RK DRAGON PANIPURI 🐉</h2>
                <h3 style="color: #FF6347;">🎁 REWARD VOUCHER 🎁</h3>
                <p><strong>Customer:</strong> ${this.currentCustomer.name}</p>
                <p><strong>ID:</strong> ${this.currentCustomer.id}</p>
                <h4 style="color: #32CD32;">Get 1 FREE Panipuri Set</h4>
                <p><strong>Valid Until:</strong> ${document.getElementById('voucherExpiry').textContent}</p>
                <p style="font-size: 12px; margin-top: 20px;">Present this voucher to redeem your reward</p>
            </div>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>Reward Voucher</title></head>
                <body>${voucherContent}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        
        this.hideCompletionModal();
    }

    // Print ID Card - Fixed
    showPrintModal() {
        if (!this.currentCustomer) return;
        
        document.getElementById('printModal').classList.remove('hidden');
        document.getElementById('printName').textContent = this.currentCustomer.name;
        document.getElementById('printId').textContent = this.currentCustomer.id;
        document.getElementById('printMobile').textContent = this.currentCustomer.mobile;
        document.getElementById('printDate').textContent = this.currentCustomer.registrationDate;
    }

    hidePrintModal() {
        document.getElementById('printModal').classList.add('hidden');
    }

    // Data Management
    getCustomers() {
        return JSON.parse(localStorage.getItem('loyaltyCustomers') || '[]');
    }

    saveCustomers(customers) {
        localStorage.setItem('loyaltyCustomers', JSON.stringify(customers));
    }

    findCustomerById(customerId) {
        const customers = this.getCustomers();
        return customers.find(customer => customer.id === customerId);
    }

    findCustomerByMobile(mobile) {
        const customers = this.getCustomers();
        return customers.find(customer => customer.mobile === mobile);
    }

    // Dashboard Statistics
    updateDashboardStats() {
        const customers = this.getCustomers();
        const totalCustomers = customers.length;
        const activeCards = customers.filter(c => c.isActive && c.stampsReceived < 6).length;
        const completedCards = customers.filter(c => c.stampsReceived >= 6).length;

        document.getElementById('totalCustomers').textContent = totalCustomers;
        document.getElementById('activeCards').textContent = activeCards;
        document.getElementById('completedCards').textContent = completedCards;
    }

    displayAllCustomers() {
        const customersList = document.getElementById('customersList');
        const customers = this.getCustomers();

        if (customers.length === 0) {
            customersList.innerHTML = '<p>No customers registered yet.</p>';
            return;
        }

        customersList.innerHTML = customers.map(customer => `
            <div class="customer-item" onclick="loyaltySystem.selectCustomer('${customer.id}')">
                <div class="customer-info-brief">
                    <h4>${customer.name}</h4>
                    <p><strong>ID:</strong> ${customer.id}</p>
                    <p><strong>Mobile:</strong> ${customer.mobile}</p>
                    <p><strong>Registered:</strong> ${customer.registrationDate}</p>
                </div>
                <div class="customer-status">
                    <span class="progress-badge ${customer.stampsReceived >= 6 ? 'completed-badge' : ''}">
                        ${customer.stampsReceived}/6 Stamps
                    </span>
                    ${customer.stampsReceived >= 6 ? '<span class="status status--success">Completed</span>' : '<span class="status status--info">Active</span>'}
                </div>
            </div>
        `).join('');
    }

    selectCustomer(customerId) {
        const customer = this.findCustomerById(customerId);
        if (customer) {
            this.currentCustomer = customer;
            this.showCustomerDetails();
        }
    }

    // Modal Management - Fixed
    hideAllModals() {
        const modals = ['loginModal', 'completionModal', 'printModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }

    // Message System
    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        const messageContent = document.getElementById('messageContent');
        
        messageContent.textContent = message;
        messageContainer.className = `message-container`;
        messageContent.className = `message ${type}`;
        messageContainer.classList.remove('hidden');

        // Auto hide after 5 seconds
        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 5000);
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.loyaltySystem = new LoyaltySystem();
});

// Additional utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

function validateMobile(mobile) {
    return /^[6-9]\d{9}$/.test(mobile);
}

// Export customer data functionality
function exportCustomerData() {
    const customers = JSON.parse(localStorage.getItem('loyaltyCustomers') || '[]');
    
    if (customers.length === 0) {
        loyaltySystem.showMessage('No customer data to export', 'info');
        return;
    }

    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Name,Mobile,Registration Date,Stamps,Completion Date,Status\n"
        + customers.map(customer => 
            `${customer.id},"${customer.name}",${customer.mobile},${customer.registrationDate},${customer.stampsReceived},${customer.completionDate || 'N/A'},${customer.isActive ? 'Active' : 'Completed'}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    loyaltySystem.showMessage('Customer data exported successfully', 'success');
}

// Add export button to dashboard
function addExportButton() {
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons && !document.getElementById('exportBtn')) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportBtn';
        exportBtn.className = 'btn btn--outline';
        exportBtn.textContent = 'Export Data';
        exportBtn.onclick = exportCustomerData;
        actionButtons.appendChild(exportBtn);
    }
}

// Call this function after admin login to add export functionality
setTimeout(addExportButton, 2000);