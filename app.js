// RK Dragon Panipuri Loyalty System - Enhanced Version
class LoyaltySystem {
    constructor() {
        this.isAdminLoggedIn = false;
        this.currentCustomer = null;
        this.importedData = null;
        this.currentFilter = 'all';
        
        // Wait for DOM to be fully loaded before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeSystem();
                this.bindEvents();
                this.loadPersistedData();
            });
        } else {
            this.initializeSystem();
            this.bindEvents();
            this.loadPersistedData();
        }
    }

    initializeSystem() {
        // Ensure all modals are hidden on initialization
        this.hideAllModals();
        
        // Initialize localStorage if empty
        if (!localStorage.getItem('loyaltyCustomers')) {
            localStorage.setItem('loyaltyCustomers', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('adminConfig')) {
            localStorage.setItem('adminConfig', JSON.stringify({ isSetup: false }));
        }

        // Load sample data if no customers exist
        const customers = this.getCustomers();
        if (customers.length === 0) {
            this.loadSampleData();
        }

        this.updateDashboardStats();
        this.checkAdminSetup();
    }

    loadSampleData() {
        const sampleCustomers = [
            {
                id: 'RK-1695045600-123',
                name: 'முருகன்',
                mobile: '9988776655',
                registrationDate: '2025-09-22',
                stampsReceived: 3,
                completionDate: null,
                isActive: true,
                lastStampDate: '2025-09-21'
            },
            {
                id: 'RK-1695045600-456',
                name: 'லட்சுமி',
                mobile: '8877665544',
                registrationDate: '2025-09-20',
                stampsReceived: 6,
                completionDate: '2025-09-22',
                isActive: false,
                lastStampDate: '2025-09-22'
            },
            {
                id: 'RK-1695045600-789',
                name: 'கிருஷ்ணன்',
                mobile: '7766554433',
                registrationDate: '2025-09-21',
                stampsReceived: 1,
                completionDate: null,
                isActive: true,
                lastStampDate: '2025-09-21'
            }
        ];

        localStorage.setItem('loyaltyCustomers', JSON.stringify(sampleCustomers));
    }

    bindEvents() {
        // Ensure elements exist before binding events
        const adminLoginBtn = document.getElementById('adminLoginBtn');
        const adminLogoutBtn = document.getElementById('adminLogoutBtn');
        const closeModal = document.getElementById('closeModal');

        if (adminLoginBtn) {
            adminLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Admin login clicked'); // Debug log
                this.showLoginModal();
            });
        }

        if (adminLogoutBtn) {
            adminLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        if (closeModal) {
            closeModal.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideLoginModal();
            });
        }

        // Setup form events
        const setupForm = document.getElementById('setupForm');
        const loginForm = document.getElementById('loginForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const resetPasswordForm = document.getElementById('resetPasswordForm');

        if (setupForm) {
            setupForm.addEventListener('submit', (e) => this.handleSetup(e));
        }
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // Navigation events
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
        const backToLoginBtn = document.getElementById('backToLoginBtn');

        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPassword();
            });
        }
        if (backToLoginBtn) {
            backToLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegularLogin();
            });
        }

        // Dashboard navigation events
        const registerCustomerBtn = document.getElementById('registerCustomerBtn');
        const verifyCustomerBtn = document.getElementById('verifyCustomerBtn');
        const searchCustomerBtn = document.getElementById('searchCustomerBtn');
        const exportDataBtn = document.getElementById('exportDataBtn');
        const importDataBtn = document.getElementById('importDataBtn');

        if (registerCustomerBtn) {
            registerCustomerBtn.addEventListener('click', () => this.showCustomerRegistration());
        }
        if (verifyCustomerBtn) {
            verifyCustomerBtn.addEventListener('click', () => this.showCustomerVerification());
        }
        if (searchCustomerBtn) {
            searchCustomerBtn.addEventListener('click', () => this.showCustomerSearch());
        }
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportCustomerData());
        }
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => this.showImportData());
        }

        // Form events
        const customerForm = document.getElementById('customerForm');
        const verifyIdBtn = document.getElementById('verifyIdBtn');
        const searchMobileBtn = document.getElementById('searchMobileBtn');

        if (customerForm) {
            customerForm.addEventListener('submit', (e) => this.registerCustomer(e));
        }
        if (verifyIdBtn) {
            verifyIdBtn.addEventListener('click', () => this.verifyCustomerId());
        }
        if (searchMobileBtn) {
            searchMobileBtn.addEventListener('click', () => this.searchByMobile());
        }

        // CSV Import events
        const importCsvBtn = document.getElementById('importCsvBtn');
        const confirmImportBtn = document.getElementById('confirmImportBtn');
        const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
        const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');

        if (importCsvBtn) {
            importCsvBtn.addEventListener('click', () => this.handleCsvImport());
        }
        if (confirmImportBtn) {
            confirmImportBtn.addEventListener('click', () => this.confirmImport());
        }
        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', () => this.downloadCsvTemplate());
        }
        if (cancelPreviewBtn) {
            cancelPreviewBtn.addEventListener('click', () => this.cancelImportPreview());
        }

        // Customer details events
        const addStampBtn = document.getElementById('addStampBtn');
        const shareCustomerBtn = document.getElementById('shareCustomerBtn');
        const printIdBtn = document.getElementById('printIdBtn');
        const backToDashboard = document.getElementById('backToDashboard');

        if (addStampBtn) {
            addStampBtn.addEventListener('click', () => this.addStamp());
        }
        if (shareCustomerBtn) {
            shareCustomerBtn.addEventListener('click', () => this.showSharingModal());
        }
        if (printIdBtn) {
            printIdBtn.addEventListener('click', () => this.showPrintModal());
        }
        if (backToDashboard) {
            backToDashboard.addEventListener('click', () => this.showDashboard());
        }

        // Cancel button events
        const cancelRegistration = document.getElementById('cancelRegistration');
        const cancelVerification = document.getElementById('cancelVerification');
        const cancelSearch = document.getElementById('cancelSearch');
        const cancelImport = document.getElementById('cancelImport');

        if (cancelRegistration) {
            cancelRegistration.addEventListener('click', () => this.showDashboard());
        }
        if (cancelVerification) {
            cancelVerification.addEventListener('click', () => this.showDashboard());
        }
        if (cancelSearch) {
            cancelSearch.addEventListener('click', () => this.showDashboard());
        }
        if (cancelImport) {
            cancelImport.addEventListener('click', () => this.showDashboard());
        }

        // Modal close events
        const closeCompletionModal = document.getElementById('closeCompletionModal');
        const closePrintModal = document.getElementById('closePrintModal');
        const closeSharingModal = document.getElementById('closeSharingModal');

        if (closeCompletionModal) {
            closeCompletionModal.addEventListener('click', () => this.hideCompletionModal());
        }
        if (closePrintModal) {
            closePrintModal.addEventListener('click', () => this.hidePrintModal());
        }
        if (closeSharingModal) {
            closeSharingModal.addEventListener('click', () => this.hideSharingModal());
        }

        // Sharing events
        const shareWhatsappBtn = document.getElementById('shareWhatsappBtn');
        const shareEmailBtn = document.getElementById('shareEmailBtn');
        const shareSmsBtn = document.getElementById('shareSmsBtn');
        const copyDetailsBtn = document.getElementById('copyDetailsBtn');

        if (shareWhatsappBtn) {
            shareWhatsappBtn.addEventListener('click', () => this.shareWhatsApp());
        }
        if (shareEmailBtn) {
            shareEmailBtn.addEventListener('click', () => this.shareEmail());
        }
        if (shareSmsBtn) {
            shareSmsBtn.addEventListener('click', () => this.shareSms());
        }
        if (copyDetailsBtn) {
            copyDetailsBtn.addEventListener('click', () => this.copyDetails());
        }

        // Completion events
        const printVoucherBtn = document.getElementById('printVoucherBtn');
        const shareRewardBtn = document.getElementById('shareRewardBtn');

        if (printVoucherBtn) {
            printVoucherBtn.addEventListener('click', () => this.printVoucher());
        }
        if (shareRewardBtn) {
            shareRewardBtn.addEventListener('click', () => this.shareReward());
        }

        // Print events
        const downloadCardBtn = document.getElementById('downloadCardBtn');
        if (downloadCardBtn) {
            downloadCardBtn.addEventListener('click', () => this.downloadCard());
        }

        // Filter events
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterCustomers(e.target.dataset.filter));
        });

        // Modal backdrop and keyboard events
        this.bindModalEvents();

        console.log('All events bound successfully'); // Debug log
    }

    bindModalEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                if (e.target.closest('#loginModal')) {
                    this.hideLoginModal();
                } else if (e.target.closest('#completionModal')) {
                    this.hideCompletionModal();
                } else if (e.target.closest('#printModal')) {
                    this.hidePrintModal();
                } else if (e.target.closest('#sharingModal')) {
                    this.hideSharingModal();
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    // Admin Setup and Authentication
    checkAdminSetup() {
        const adminConfig = JSON.parse(localStorage.getItem('adminConfig') || '{"isSetup": false}');
        if (!adminConfig.isSetup) {
            this.isFirstTimeSetup = true;
        }
    }

    showLoginModal() {
        console.log('showLoginModal called'); // Debug log
        this.hideAllModals();
        
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
            console.log('Login modal should be visible now'); // Debug log
            
            const adminConfig = JSON.parse(localStorage.getItem('adminConfig') || '{"isSetup": false}');
            if (!adminConfig.isSetup) {
                this.showFirstTimeSetup();
            } else {
                this.showRegularLogin();
            }
        } else {
            console.error('Login modal element not found'); // Debug log
        }
    }

    showFirstTimeSetup() {
        const loginModalTitle = document.getElementById('loginModalTitle');
        const firstTimeSetup = document.getElementById('firstTimeSetup');
        const regularLogin = document.getElementById('regularLogin');
        const forgotPassword = document.getElementById('forgotPassword');
        const resetPassword = document.getElementById('resetPassword');

        if (loginModalTitle) loginModalTitle.textContent = 'Admin Setup - First Time';
        if (firstTimeSetup) firstTimeSetup.classList.remove('hidden');
        if (regularLogin) regularLogin.classList.add('hidden');
        if (forgotPassword) forgotPassword.classList.add('hidden');
        if (resetPassword) resetPassword.classList.add('hidden');
        
        const setupUsername = document.getElementById('setupUsername');
        if (setupUsername) setupUsername.focus();
    }

    showRegularLogin() {
        const loginModalTitle = document.getElementById('loginModalTitle');
        const firstTimeSetup = document.getElementById('firstTimeSetup');
        const regularLogin = document.getElementById('regularLogin');
        const forgotPassword = document.getElementById('forgotPassword');
        const resetPassword = document.getElementById('resetPassword');

        if (loginModalTitle) loginModalTitle.textContent = 'Admin Login';
        if (firstTimeSetup) firstTimeSetup.classList.add('hidden');
        if (regularLogin) regularLogin.classList.remove('hidden');
        if (forgotPassword) forgotPassword.classList.add('hidden');
        if (resetPassword) resetPassword.classList.add('hidden');
        
        const loginUsername = document.getElementById('loginUsername');
        if (loginUsername) loginUsername.focus();
    }

    showForgotPassword() {
        const loginModalTitle = document.getElementById('loginModalTitle');
        const firstTimeSetup = document.getElementById('firstTimeSetup');
        const regularLogin = document.getElementById('regularLogin');
        const forgotPassword = document.getElementById('forgotPassword');
        const resetPassword = document.getElementById('resetPassword');

        if (loginModalTitle) loginModalTitle.textContent = 'Reset Password';
        if (firstTimeSetup) firstTimeSetup.classList.add('hidden');
        if (regularLogin) regularLogin.classList.add('hidden');
        if (forgotPassword) forgotPassword.classList.remove('hidden');
        if (resetPassword) resetPassword.classList.add('hidden');
        
        const securityAnswer1 = document.getElementById('securityAnswer1');
        if (securityAnswer1) securityAnswer1.focus();
    }

    handleSetup(e) {
        e.preventDefault();
        
        const username = document.getElementById('setupUsername').value.trim();
        const password = document.getElementById('setupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const securityAnswers = [
            document.getElementById('securityQ1').value.trim().toLowerCase(),
            document.getElementById('securityQ2').value.trim().toLowerCase(),
            document.getElementById('securityQ3').value.trim().toLowerCase(),
            document.getElementById('securityQ4').value.trim().toLowerCase()
        ];

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        if (securityAnswers.some(answer => !answer)) {
            this.showMessage('Please answer all security questions', 'error');
            return;
        }

        // Save admin configuration
        const adminConfig = {
            isSetup: true,
            username: username,
            password: this.hashPassword(password),
            securityQuestions: [
                "What is your mother's maiden name?",
                "What city were you born in?",
                "What was your first pet's name?",
                "What is your favorite food?"
            ],
            securityAnswers: securityAnswers.map(answer => this.hashPassword(answer))
        };

        localStorage.setItem('adminConfig', JSON.stringify(adminConfig));
        this.showMessage('Admin account setup successful!', 'success');
        
        // Auto-login after setup
        this.isAdminLoggedIn = true;
        this.saveAdminSession(false);
        this.hideLoginModal();
        this.showAdminInterface();
        this.showMessage(`Welcome, ${username}! Setup completed successfully.`, 'success');
    }

    handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        const adminConfig = JSON.parse(localStorage.getItem('adminConfig'));
        
        if (!adminConfig || !adminConfig.isSetup) {
            this.showMessage('Admin account not setup. Please complete setup first.', 'error');
            this.showFirstTimeSetup();
            return;
        }

        if (username !== adminConfig.username || this.hashPassword(password) !== adminConfig.password) {
            this.showMessage('Invalid username or password', 'error');
            return;
        }

        this.isAdminLoggedIn = true;
        this.saveAdminSession(rememberMe);
        this.hideLoginModal();
        this.showAdminInterface();
        this.showMessage(`Welcome back, ${username}!`, 'success');
    }

    handleForgotPassword(e) {
        e.preventDefault();
        
        const answer1 = document.getElementById('securityAnswer1').value.trim().toLowerCase();
        const answer2 = document.getElementById('securityAnswer2').value.trim().toLowerCase();

        const adminConfig = JSON.parse(localStorage.getItem('adminConfig'));
        
        if (!adminConfig || !adminConfig.isSetup) {
            this.showMessage('Admin account not found', 'error');
            return;
        }

        if (this.hashPassword(answer1) !== adminConfig.securityAnswers[0] || 
            this.hashPassword(answer2) !== adminConfig.securityAnswers[1]) {
            this.showMessage('Security answers do not match', 'error');
            return;
        }

        this.showMessage('Security verification successful!', 'success');
        this.showResetPassword();
    }

    showResetPassword() {
        const loginModalTitle = document.getElementById('loginModalTitle');
        const firstTimeSetup = document.getElementById('firstTimeSetup');
        const regularLogin = document.getElementById('regularLogin');
        const forgotPassword = document.getElementById('forgotPassword');
        const resetPassword = document.getElementById('resetPassword');

        if (loginModalTitle) loginModalTitle.textContent = 'Set New Password';
        if (firstTimeSetup) firstTimeSetup.classList.add('hidden');
        if (regularLogin) regularLogin.classList.add('hidden');
        if (forgotPassword) forgotPassword.classList.add('hidden');
        if (resetPassword) resetPassword.classList.remove('hidden');
        
        const newPassword = document.getElementById('newPassword');
        if (newPassword) newPassword.focus();
    }

    handleResetPassword(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmNewPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        const adminConfig = JSON.parse(localStorage.getItem('adminConfig'));
        adminConfig.password = this.hashPassword(newPassword);
        localStorage.setItem('adminConfig', JSON.stringify(adminConfig));

        this.showMessage('Password reset successful!', 'success');
        this.showRegularLogin();
    }

    hashPassword(password) {
        // Simple hash function for demo - in production use proper hashing
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    saveAdminSession(rememberMe = false) {
        const sessionData = {
            loginTime: new Date().toISOString(),
            rememberMe: rememberMe
        };
        
        localStorage.setItem('currentAdminSession', JSON.stringify(sessionData));
        
        if (rememberMe) {
            localStorage.setItem('adminRememberMe', 'true');
        }
    }

    loadPersistedData() {
        const session = localStorage.getItem('currentAdminSession');
        if (session) {
            const sessionData = JSON.parse(session);
            const loginTime = new Date(sessionData.loginTime);
            const now = new Date();
            
            const sessionDuration = sessionData.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
            
            if (now - loginTime < sessionDuration) {
                this.isAdminLoggedIn = true;
                this.showAdminInterface();
                return;
            }
        }
        
        this.showWelcomeScreen();
    }

    hideLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.add('hidden');
        }
        this.resetLoginForms();
    }

    resetLoginForms() {
        const forms = ['setupForm', 'loginForm', 'forgotPasswordForm', 'resetPasswordForm'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.reset();
        });
    }

    logout() {
        this.isAdminLoggedIn = false;
        this.currentCustomer = null;
        localStorage.removeItem('currentAdminSession');
        localStorage.removeItem('adminRememberMe');
        this.showWelcomeScreen();
        this.showMessage('Logged out successfully', 'info');
    }

    // UI State Management
    showWelcomeScreen() {
        this.hideAllModals();
        this.hideAllSections();
        
        const welcomeScreen = document.getElementById('welcomeScreen');
        const adminDashboard = document.getElementById('adminDashboard');
        const adminLoginBtn = document.getElementById('adminLoginBtn');
        const adminLogoutBtn = document.getElementById('adminLogoutBtn');

        if (welcomeScreen) welcomeScreen.classList.remove('hidden');
        if (adminDashboard) adminDashboard.classList.add('hidden');
        if (adminLoginBtn) adminLoginBtn.classList.remove('hidden');
        if (adminLogoutBtn) adminLogoutBtn.classList.add('hidden');
    }

    showAdminInterface() {
        this.hideAllModals();
        
        const welcomeScreen = document.getElementById('welcomeScreen');
        const adminDashboard = document.getElementById('adminDashboard');
        const adminLoginBtn = document.getElementById('adminLoginBtn');
        const adminLogoutBtn = document.getElementById('adminLogoutBtn');

        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        if (adminDashboard) adminDashboard.classList.remove('hidden');
        if (adminLoginBtn) adminLoginBtn.classList.add('hidden');
        if (adminLogoutBtn) adminLogoutBtn.classList.remove('hidden');
        
        this.showDashboard();
        this.displayAllCustomers();
    }

    showDashboard() {
        this.hideAllSections();
        this.updateDashboardStats();
    }

    hideAllSections() {
        const sections = ['customerRegistration', 'customerVerification', 'customerSearch', 'customerDetails', 'csvImportSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.classList.add('hidden');
        });
    }

    // Customer Management
    showCustomerRegistration() {
        this.hideAllSections();
        const customerRegistration = document.getElementById('customerRegistration');
        if (customerRegistration) {
            customerRegistration.classList.remove('hidden');
        }
        const customerName = document.getElementById('customerName');
        if (customerName) customerName.focus();
    }

    registerCustomer(e) {
        e.preventDefault();
        
        const nameEl = document.getElementById('customerName');
        const mobileEl = document.getElementById('customerMobile');
        
        if (!nameEl || !mobileEl) {
            this.showMessage('Form elements not found', 'error');
            return;
        }

        const name = nameEl.value.trim();
        const mobile = mobileEl.value.trim();

        if (!name || !mobile) {
            this.showMessage('Please fill all fields', 'error');
            return;
        }

        if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
            this.showMessage('Please enter a valid 10-digit mobile number', 'error');
            return;
        }

        const customers = this.getCustomers();
        const existingCustomer = customers.find(customer => customer.mobile === mobile);
        
        if (existingCustomer) {
            this.showMessage(`Customer already registered with ID: ${existingCustomer.id}`, 'error');
            this.currentCustomer = existingCustomer;
            this.showCustomerDetails();
            return;
        }

        const customerId = this.generateCustomerId();
        const newCustomer = {
            id: customerId,
            name: name,
            mobile: mobile,
            registrationDate: new Date().toISOString().split('T')[0],
            stampsReceived: 0,
            completionDate: null,
            isActive: true,
            lastStampDate: null
        };

        customers.push(newCustomer);
        this.saveCustomers(customers);

        const customerForm = document.getElementById('customerForm');
        if (customerForm) customerForm.reset();
        
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
            const timestamp = Date.now();
            const randomNum = Math.floor(100 + Math.random() * 900);
            customerId = `RK-${timestamp}-${randomNum}`;
        } while (customers.some(customer => customer.id === customerId));
        
        return customerId;
    }

    showCustomerVerification() {
        this.hideAllSections();
        const customerVerification = document.getElementById('customerVerification');
        if (customerVerification) {
            customerVerification.classList.remove('hidden');
        }
        const verifyCustomerId = document.getElementById('verifyCustomerId');
        if (verifyCustomerId) verifyCustomerId.focus();
    }

    verifyCustomerId() {
        const verifyCustomerIdEl = document.getElementById('verifyCustomerId');
        if (!verifyCustomerIdEl) {
            this.showMessage('Input element not found', 'error');
            return;
        }

        const customerId = verifyCustomerIdEl.value.trim().toUpperCase();
        
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
        verifyCustomerIdEl.value = '';
        this.showMessage('Customer verified successfully!', 'success');
    }

    showCustomerSearch() {
        this.hideAllSections();
        const customerSearch = document.getElementById('customerSearch');
        if (customerSearch) {
            customerSearch.classList.remove('hidden');
        }
        const searchMobile = document.getElementById('searchMobile');
        if (searchMobile) searchMobile.focus();
    }

    searchByMobile() {
        const searchMobileEl = document.getElementById('searchMobile');
        if (!searchMobileEl) {
            this.showMessage('Input element not found', 'error');
            return;
        }

        const mobile = searchMobileEl.value.trim();
        
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
        searchMobileEl.value = '';
        this.showMessage('Customer found successfully!', 'success');
    }

    showCustomerDetails() {
        this.hideAllSections();
        const customerDetails = document.getElementById('customerDetails');
        if (customerDetails) {
            customerDetails.classList.remove('hidden');
        }

        if (!this.currentCustomer) return;

        // Update customer information
        const detailElements = {
            detailName: this.currentCustomer.name,
            detailId: this.currentCustomer.id,
            detailMobile: this.currentCustomer.mobile,
            detailDate: this.formatDate(this.currentCustomer.registrationDate)
        };

        Object.keys(detailElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = detailElements[id];
        });
        
        // Update status
        const statusElement = document.getElementById('detailStatus');
        if (statusElement) {
            if (this.currentCustomer.stampsReceived >= 6) {
                statusElement.textContent = 'Completed';
                statusElement.className = 'status status--success';
            } else {
                statusElement.textContent = 'Active';
                statusElement.className = 'status status--info';
            }
        }

        this.updateLoyaltyCard();
    }

    updateLoyaltyCard() {
        if (!this.currentCustomer) return;

        const stamps = this.currentCustomer.stampsReceived;
        const maxStamps = 6;

        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');

        if (progressText) progressText.textContent = `${stamps}/${maxStamps}`;
        if (progressFill) progressFill.style.width = `${(stamps / maxStamps) * 100}%`;

        const stampBoxes = document.querySelectorAll('.stamp-box');
        stampBoxes.forEach((box, index) => {
            const dayNumber = index + 1;
            const stampIcon = box.querySelector('.stamp-icon');
            
            if (stampIcon) {
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
            }
        });

        const addStampBtn = document.getElementById('addStampBtn');
        if (addStampBtn) {
            if (stamps >= maxStamps || !this.currentCustomer.isActive) {
                addStampBtn.disabled = true;
                addStampBtn.textContent = stamps >= maxStamps ? '🏆 Card Completed' : '❌ Card Inactive';
            } else {
                addStampBtn.disabled = false;
                addStampBtn.textContent = '➕ Add Dragon Stamp';
            }
        }
    }

    addStamp() {
        if (!this.currentCustomer || this.currentCustomer.stampsReceived >= 6) return;

        const customers = this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === this.currentCustomer.id);
        
        if (customerIndex === -1) return;

        customers[customerIndex].stampsReceived++;
        customers[customerIndex].lastStampDate = new Date().toISOString().split('T')[0];
        this.currentCustomer.stampsReceived++;
        this.currentCustomer.lastStampDate = customers[customerIndex].lastStampDate;

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
            this.showMessage(`🐉 Dragon stamp added! ${this.currentCustomer.stampsReceived}/6 stamps collected`, 'success');
        }
        
        this.updateDashboardStats();
        this.displayAllCustomers();
    }

    // CSV Import/Export Functionality
    showImportData() {
        this.hideAllSections();
        const csvImportSection = document.getElementById('csvImportSection');
        if (csvImportSection) {
            csvImportSection.classList.remove('hidden');
        }
        const importPreview = document.getElementById('importPreview');
        if (importPreview) {
            importPreview.classList.add('hidden');
        }
    }

    handleCsvImport() {
        const fileInput = document.getElementById('csvFileInput');
        if (!fileInput) {
            this.showMessage('File input not found', 'error');
            return;
        }

        const file = fileInput.files[0];
        
        if (!file) {
            this.showMessage('Please select a CSV file', 'error');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showMessage('Please select a valid CSV file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    this.showMessage('CSV file appears to be empty or invalid', 'error');
                    return;
                }

                const parsedData = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = this.parseCSVLine(lines[i]);
                    if (values.length >= 7) {
                        parsedData.push({
                            id: values[0].trim(),
                            name: values[1].trim(),
                            mobile: values[2].trim(),
                            registrationDate: values[3].trim(),
                            stampsReceived: parseInt(values[4]) || 0,
                            completionDate: values[5].trim() || null,
                            isActive: values[6].trim().toLowerCase() === 'active'
                        });
                    }
                }

                if (parsedData.length === 0) {
                    this.showMessage('No valid data found in CSV file', 'error');
                    return;
                }

                this.importedData = parsedData;
                this.showImportPreview();
                
            } catch (error) {
                this.showMessage('Error parsing CSV file: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    showImportPreview() {
        const importPreview = document.getElementById('importPreview');
        if (importPreview) {
            importPreview.classList.remove('hidden');
        }
        
        const previewTable = document.getElementById('previewTable');
        if (!previewTable) return;

        let tableHTML = '<table class="preview-table"><thead><tr>';
        
        const headers = ['ID', 'Name', 'Mobile', 'Registration', 'Stamps', 'Status'];
        headers.forEach(header => {
            tableHTML += `<th>${header}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';
        
        this.importedData.slice(0, 10).forEach(customer => {
            tableHTML += `<tr>
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.mobile}</td>
                <td>${customer.registrationDate}</td>
                <td>${customer.stampsReceived}/6</td>
                <td>${customer.isActive ? 'Active' : 'Completed'}</td>
            </tr>`;
        });
        
        tableHTML += '</tbody></table>';
        
        if (this.importedData.length > 10) {
            tableHTML += `<p><small>Showing first 10 of ${this.importedData.length} records</small></p>`;
        }
        
        previewTable.innerHTML = tableHTML;
    }

    confirmImport() {
        if (!this.importedData) return;
        
        const existingCustomers = this.getCustomers();
        let imported = 0;
        let updated = 0;
        
        this.importedData.forEach(importCustomer => {
            const existingIndex = existingCustomers.findIndex(c => c.id === importCustomer.id || c.mobile === importCustomer.mobile);
            
            if (existingIndex >= 0) {
                existingCustomers[existingIndex] = { ...existingCustomers[existingIndex], ...importCustomer };
                updated++;
            } else {
                existingCustomers.push(importCustomer);
                imported++;
            }
        });
        
        this.saveCustomers(existingCustomers);
        this.updateDashboardStats();
        this.displayAllCustomers();
        
        this.showMessage(`Import successful! ${imported} new customers imported, ${updated} existing customers updated.`, 'success');
        this.showDashboard();
        
        const csvFileInput = document.getElementById('csvFileInput');
        if (csvFileInput) csvFileInput.value = '';
        this.importedData = null;
    }

    cancelImportPreview() {
        const importPreview = document.getElementById('importPreview');
        if (importPreview) importPreview.classList.add('hidden');
        
        const csvFileInput = document.getElementById('csvFileInput');
        if (csvFileInput) csvFileInput.value = '';
        
        this.importedData = null;
    }

    downloadCsvTemplate() {
        const csvContent = "data:text/csv;charset=utf-8," +
            "Customer ID,Name,Mobile,Registration Date,Stamps Received,Completion Date,Status\n" +
            'RK-1234567890-123,"Sample Customer",9876543210,2025-09-22,3,,Active\n' +
            'RK-1234567890-456,"Completed Customer",9876543211,2025-09-20,6,2025-09-22,Completed';

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `customer_template_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('CSV template downloaded successfully', 'success');
    }

    exportCustomerData() {
        const customers = this.getCustomers();
        
        if (customers.length === 0) {
            this.showMessage('No customer data to export', 'info');
            return;
        }

        const csvContent = "data:text/csv;charset=utf-8," 
            + "Customer ID,Name,Mobile,Registration Date,Stamps Received,Completion Date,Status\n"
            + customers.map(customer => 
                `${customer.id},"${customer.name}",${customer.mobile},${customer.registrationDate},${customer.stampsReceived},${customer.completionDate || 'N/A'},${customer.isActive ? 'Active' : 'Completed'}`
            ).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `rk_dragon_customers_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage(`Customer data exported successfully (${customers.length} records)`, 'success');
    }

    // Sharing Functionality
    showSharingModal() {
        if (!this.currentCustomer) return;
        
        const sharingModal = document.getElementById('sharingModal');
        if (sharingModal) {
            sharingModal.classList.remove('hidden');
        }
        
        const sharingContent = this.generateSharingContent();
        const sharingContentEl = document.getElementById('sharingContent');
        if (sharingContentEl) {
            sharingContentEl.textContent = sharingContent;
        }
    }

    hideSharingModal() {
        const sharingModal = document.getElementById('sharingModal');
        if (sharingModal) {
            sharingModal.classList.add('hidden');
        }
    }

    generateSharingContent() {
        if (!this.currentCustomer) return '';
        
        return `🐉 RK DRAGON PANIPURI LOYALTY CARD 🐉

Customer Name: ${this.currentCustomer.name}
Customer ID: ${this.currentCustomer.id}
Mobile: ${this.currentCustomer.mobile}
Registration Date: ${this.formatDate(this.currentCustomer.registrationDate)}
Dragon Stamps: ${this.currentCustomer.stampsReceived}/6
Status: ${this.currentCustomer.isActive ? 'Active' : 'Completed'}

${this.currentCustomer.stampsReceived >= 6 ? 
    '🏆 Congratulations! You have completed your loyalty card and earned a FREE Panipuri Set!' :
    `Collect ${6 - this.currentCustomer.stampsReceived} more dragon stamps to earn your reward!`}

Visit RK Dragon Panipuri and show this ID to collect stamps!`;
    }

    shareWhatsApp() {
        const content = this.generateSharingContent();
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(content)}`;
        window.open(whatsappUrl, '_blank');
        this.hideSharingModal();
        this.showMessage('WhatsApp sharing opened', 'info');
    }

    shareEmail() {
        const content = this.generateSharingContent();
        const subject = `RK Dragon Panipuri - Your Loyalty Card Details`;
        const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(content)}`;
        window.open(emailUrl, '_blank');
        this.hideSharingModal();
        this.showMessage('Email client opened', 'info');
    }

    shareSms() {
        const content = this.generateSharingContent();
        const smsUrl = `sms:?body=${encodeURIComponent(content)}`;
        window.open(smsUrl, '_blank');
        this.hideSharingModal();
        this.showMessage('SMS app opened', 'info');
    }

    copyDetails() {
        const content = this.generateSharingContent();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(content).then(() => {
                this.hideSharingModal();
                this.showMessage('Customer details copied to clipboard', 'success');
            }).catch(() => {
                this.showMessage('Failed to copy to clipboard', 'error');
            });
        } else {
            this.showMessage('Clipboard not supported in this browser', 'warning');
        }
    }

    // Completion and Rewards
    showCompletionModal() {
        const completionModal = document.getElementById('completionModal');
        if (completionModal) {
            completionModal.classList.remove('hidden');
        }
        
        const completionMessage = document.getElementById('completionMessage');
        if (completionMessage) {
            completionMessage.textContent = `🎉 ${this.currentCustomer.name} has completed their loyalty card! 🎉`;
        }
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        const voucherExpiry = document.getElementById('voucherExpiry');
        if (voucherExpiry) {
            voucherExpiry.textContent = expiryDate.toLocaleDateString();
        }
        
        const voucherCode = `DRAGON-${this.currentCustomer.id.slice(-6)}-${Date.now().toString().slice(-4)}`;
        const voucherCodeEl = document.getElementById('voucherCode');
        if (voucherCodeEl) {
            voucherCodeEl.textContent = voucherCode;
        }
    }

    hideCompletionModal() {
        const completionModal = document.getElementById('completionModal');
        if (completionModal) {
            completionModal.classList.add('hidden');
        }
    }

    printVoucher() {
        const voucherCode = document.getElementById('voucherCode');
        const voucherExpiry = document.getElementById('voucherExpiry');
        
        const voucherContent = `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px; border: 3px solid #FFD700; border-radius: 10px; max-width: 400px; margin: 20px auto; background: linear-gradient(135deg, #9370DB, #6a5acd);">
                <h2 style="color: #FFD700; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">🐉 RK DRAGON PANIPURI 🐉</h2>
                <h3 style="color: #FFD700;">🎁 REWARD VOUCHER 🎁</h3>
                <p style="color: white;"><strong>Customer:</strong> ${this.currentCustomer.name}</p>
                <p style="color: white;"><strong>ID:</strong> ${this.currentCustomer.id}</p>
                <p style="color: white;"><strong>Voucher Code:</strong> ${voucherCode ? voucherCode.textContent : 'N/A'}</p>
                <h4 style="color: #32CD32;">🍽️ Get 1 FREE Panipuri Set (6 pieces) 🍽️</h4>
                <p style="color: white;"><strong>Valid Until:</strong> ${voucherExpiry ? voucherExpiry.textContent : 'N/A'}</p>
                <p style="font-size: 12px; margin-top: 20px; color: #FFD700;">Present this voucher to redeem your reward</p>
                <div style="margin-top: 15px; padding: 10px; background: white; color: #333; border-radius: 5px;">
                    <small>🐲 Thank you for your loyalty! 🐲</small>
                </div>
            </div>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>RK Dragon Panipuri - Reward Voucher</title></head>
                <body>${voucherContent}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        
        this.hideCompletionModal();
        this.showMessage('Reward voucher printed successfully!', 'success');
    }

    shareReward() {
        const voucherCode = document.getElementById('voucherCode');
        const voucherExpiry = document.getElementById('voucherExpiry');

        const rewardMessage = `🎉 CONGRATULATIONS! 🎉

${this.currentCustomer.name} has completed their RK Dragon Panipuri Loyalty Card!

🏆 REWARD EARNED: FREE Panipuri Set (6 pieces)
🎫 Voucher Code: ${voucherCode ? voucherCode.textContent : 'N/A'}
📅 Valid Until: ${voucherExpiry ? voucherExpiry.textContent : 'N/A'}

Thank you for choosing RK Dragon Panipuri! 🐉`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(rewardMessage)}`;
        window.open(whatsappUrl, '_blank');
        this.hideCompletionModal();
        this.showMessage('Reward shared via WhatsApp', 'success');
    }

    // Print ID Card
    showPrintModal() {
        if (!this.currentCustomer) return;
        
        const printModal = document.getElementById('printModal');
        if (printModal) {
            printModal.classList.remove('hidden');
        }
        
        const printElements = {
            printName: this.currentCustomer.name,
            printId: this.currentCustomer.id,
            printMobile: this.currentCustomer.mobile,
            printDate: this.formatDate(this.currentCustomer.registrationDate)
        };

        Object.keys(printElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = printElements[id];
        });
    }

    hidePrintModal() {
        const printModal = document.getElementById('printModal');
        if (printModal) {
            printModal.classList.add('hidden');
        }
    }

    downloadCard() {
        this.showMessage('ID card download feature would be available with a canvas-to-image conversion in production', 'info');
    }

    // Customer List Management
    displayAllCustomers() {
        const customersList = document.getElementById('customersList');
        if (!customersList) return;

        const customers = this.getCustomers();

        if (customers.length === 0) {
            customersList.innerHTML = `
                <div class="card">
                    <div class="card__body text-center">
                        <p>No customers registered yet.</p>
                        <button class="btn btn--primary" onclick="loyaltySystem.showCustomerRegistration()">
                            Register First Customer
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        const filteredCustomers = this.filterCustomerList(customers);
        
        customersList.innerHTML = filteredCustomers.map(customer => `
            <div class="customer-item" onclick="loyaltySystem.selectCustomer('${customer.id}')">
                <div class="customer-info-brief">
                    <h4>${customer.name}</h4>
                    <p><strong>ID:</strong> ${customer.id}</p>
                    <p><strong>Mobile:</strong> ${customer.mobile}</p>
                    <p><strong>Registered:</strong> ${this.formatDate(customer.registrationDate)}</p>
                    ${customer.completionDate ? `<p><strong>Completed:</strong> ${this.formatDate(customer.completionDate)}</p>` : ''}
                </div>
                <div class="customer-status">
                    <span class="progress-badge ${customer.stampsReceived >= 6 ? 'completed-badge' : ''}">
                        ${customer.stampsReceived}/6 🐉
                    </span>
                    ${customer.stampsReceived >= 6 ? 
                        '<span class="status status--success">🏆 Completed</span>' : 
                        '<span class="status status--info">📋 Active</span>'
                    }
                </div>
            </div>
        `).join('');
    }

    filterCustomers(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        
        this.displayAllCustomers();
    }

    filterCustomerList(customers) {
        switch (this.currentFilter) {
            case 'active':
                return customers.filter(c => c.isActive && c.stampsReceived < 6);
            case 'completed':
                return customers.filter(c => c.stampsReceived >= 6);
            default:
                return customers;
        }
    }

    selectCustomer(customerId) {
        const customer = this.findCustomerById(customerId);
        if (customer) {
            this.currentCustomer = customer;
            this.showCustomerDetails();
        }
    }

    // Dashboard Statistics
    updateDashboardStats() {
        const customers = this.getCustomers();
        const totalCustomers = customers.length;
        const activeCards = customers.filter(c => c.isActive && c.stampsReceived < 6).length;
        const completedCards = customers.filter(c => c.stampsReceived >= 6).length;
        const today = new Date().toISOString().split('T')[0];
        const todayRegistrations = customers.filter(c => c.registrationDate === today).length;

        const statElements = {
            totalCustomers: totalCustomers,
            activeCards: activeCards,
            completedCards: completedCards,
            todayRegistrations: todayRegistrations
        };

        Object.keys(statElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = statElements[id];
        });
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
        return customers.find(customer => customer.id.toUpperCase() === customerId.toUpperCase());
    }

    findCustomerByMobile(mobile) {
        const customers = this.getCustomers();
        return customers.find(customer => customer.mobile === mobile);
    }

    // Modal Management
    hideAllModals() {
        const modals = ['loginModal', 'completionModal', 'printModal', 'sharingModal'];
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
        
        if (messageContainer && messageContent) {
            messageContent.textContent = message;
            messageContainer.className = `message-container`;
            messageContent.className = `message ${type}`;
            messageContainer.classList.remove('hidden');

            setTimeout(() => {
                messageContainer.classList.add('hidden');
            }, 5000);
        }
    }

    // Utility Functions
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    validateMobile(mobile) {
        return /^[6-9]\d{9}$/.test(mobile);
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing loyalty system'); // Debug log
    window.loyaltySystem = new LoyaltySystem();
});

// Service Worker Registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
            console.log('SW registered: ', registration);
        }).catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}