// Theme Toggle Functionality
(function() {
    // Initialize theme from localStorage or default to dark
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
    
    // Update theme icon based on current theme
    function updateThemeIcon(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('.theme-toggle-icon');
            if (icon) {
                icon.textContent = theme === 'light' ? '🌙' : '☀️';
            }
        }
    }
    
    // Toggle theme
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    }
    
    // Initialize theme on page load
    initTheme();
    
    // Add event listener to theme toggle button
    document.addEventListener('DOMContentLoaded', function() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
    });
})();

// Tourist Signup with OTP Verification and Digital ID Generation

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    // Backend API base URL (use same origin when served by Flask)
    const API_BASE = 'http://127.0.0.1:5000';
    
    if (signupForm) {
        // Store OTP temporarily (in real app, this would be sent via email/SMS)
        let generatedOTP = null;
        let otpInputContainer = null;
        
        // Handle form submission
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // If OTP hasn't been generated yet, generate and show OTP input
            if (!generatedOTP) {
                handleInitialSubmit();
            } else {
                // OTP input is visible, verify OTP
                handleOTPVerification();
            }
        });
        
        // Handle initial form submission - Generate OTP
        async function handleInitialSubmit() {
            // Get all form data
            const formData = {
                name: document.getElementById('name').value.trim(),
                age: document.getElementById('age').value.trim(),
                gender: document.getElementById('gender').value,
                email: document.getElementById('email').value.trim(),
                mobile: document.getElementById('mobile').value.trim(),
                city: document.getElementById('city').value.trim(),
                address: document.getElementById('address').value.trim(),
                guardianName: document.getElementById('guardianName').value.trim(),
                guardianNumber: document.getElementById('guardianNumber').value.trim()
            };
            
            // Validate required fields
            if (!validateForm(formData)) {
                return;
            }
            
            // Request OTP from backend
            try {
                const resp = await fetch(`${API_BASE}/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email })
                });

                const data = await resp.json();
                if (resp.ok && data && data.success) {
                    // OTP is always returned in response
                    const otp = data.otp;
                    const emailSent = data.email_sent !== false; // true if email was sent, false if not configured or failed
                    
                    // Store email for verification
                    generatedOTP = formData.email; // Store email to identify user during verification
                    
                    // Show OTP in a prominent popup
                    showOTPPopup(otp, emailSent, formData.email);
                    
                    if (emailSent) {
                        showMessage('OTP sent successfully to your email. Please check your inbox.', 'success');
                    } else {
                        showMessage('OTP generated. Please check the popup below or your email.', 'info');
                    }
                } else {
                    showMessage(data.message || 'Failed to send OTP. Please try again.', 'error');
                    return;
                }
            } catch (e) {
                console.error('OTP API failed:', e);
                showMessage('Failed to send OTP. Please check your connection and try again.', 'error');
                return;
            }
            
            // Show OTP input field
            showOTPInput();
        }
        
        // Handle OTP verification
        async function handleOTPVerification() {
            const otpInput = document.getElementById('otpInput');
            const enteredOTP = otpInput.value.trim();
            
            // Validate OTP input
            if (!enteredOTP || enteredOTP.length !== 6) {
                showMessage('Please enter a valid 6-digit OTP', 'error');
                return;
            }
            
            // Get email from form
            const email = document.getElementById('email').value.trim();
            
            // Verify OTP with backend
            try {
                const resp = await fetch(`${API_BASE}/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: email,
                        otp: enteredOTP 
                    })
                });

                const data = await resp.json();
                if (resp.ok && data && data.success) {
                // OTP verified successfully
                completeSignup();
            } else {
                    // Fallback: if backend verification fails, check local OTP (for testing)
                    if (generatedOTP && enteredOTP === generatedOTP && generatedOTP.length === 6) {
                        completeSignup();
                    } else {
                        showMessage(data.message || 'Invalid OTP. Please try again.', 'error');
                otpInput.value = '';
                otpInput.focus();
                    }
                }
            } catch (e) {
                console.error('OTP verification failed:', e);
                // Fallback: check local OTP if backend fails
                if (generatedOTP && enteredOTP === generatedOTP && generatedOTP.length === 6) {
                    completeSignup();
                } else {
                    showMessage('Failed to verify OTP. Please try again.', 'error');
                    otpInput.value = '';
                    otpInput.focus();
                }
            }
        }
        
        // Complete signup process
        async function completeSignup() {
            // Get all form data again
            const formData = {
                name: document.getElementById('name').value.trim(),
                age: document.getElementById('age').value.trim(),
                gender: document.getElementById('gender').value,
                email: document.getElementById('email').value.trim(),
                mobile: document.getElementById('mobile').value.trim(),
                city: document.getElementById('city').value.trim(),
                address: document.getElementById('address').value.trim(),
                guardianName: document.getElementById('guardianName').value.trim(),
                guardianNumber: document.getElementById('guardianNumber').value.trim()
            };
            
            // Generate Digital ID
            const digitalID = generateDigitalID();
            formData.digitalID = digitalID;
            
            // Add timestamp
            formData.signupDate = new Date().toISOString();
            
            // Try to save to backend, fallback to localStorage
            try {
                const resp = await fetch(`${API_BASE}/save-tourist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await resp.json();
                if (resp.ok && result && result.success) {
                    // Show Digital ID popup
                    showDigitalIDPopup(digitalID);
                } else {
                    // Backend returned error; fallback to localStorage and notify user
            saveToLocalStorage(formData);
                    showDigitalIDPopup(digitalID);
                }
            } catch (e) {
                console.warn('Save tourist API failed, saving locally:', e);
                saveToLocalStorage(formData);
                showDigitalIDPopup(digitalID);
            }
            
            // Reset form and OTP state
            setTimeout(() => {
                signupForm.reset();
                hideOTPInput();
                generatedOTP = null;
            }, 100);
        }
        
        // Generate 6-digit OTP
        function generateOTP() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        }
        
        // Generate Digital ID (format: YT + 5 digits)
        function generateDigitalID() {
            // Get existing IDs from localStorage to ensure uniqueness
            const existingIDs = getExistingDigitalIDs();
            let newID;
            let attempts = 0;
            const maxAttempts = 100;
            
            do {
                // Generate 5 random digits
                const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
                newID = 'YT' + randomDigits;
                attempts++;
                
                // Safety check to prevent infinite loop
                if (attempts >= maxAttempts) {
                    // Fallback: use timestamp-based ID
                    const timestamp = Date.now().toString().slice(-5);
                    newID = 'YT' + timestamp;
                    break;
                }
            } while (existingIDs.includes(newID));
            
            return newID;
        }
        
        // Get all existing Digital IDs from localStorage
        function getExistingDigitalIDs() {
            const existingIDs = [];
            
            // Check all localStorage keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('tourist_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data && data.digitalID) {
                            existingIDs.push(data.digitalID);
                        }
                    } catch (e) {
                        // Skip invalid entries
                        continue;
                    }
                }
            }
            
            return existingIDs;
        }
        
        // Show OTP popup with the generated OTP
        function showOTPPopup(otp, emailSent, email) {
            // Remove existing popup if any
            const existingPopup = document.getElementById('otpPopup');
            if (existingPopup) {
                existingPopup.remove();
            }
            
            // Create popup
            const popup = document.createElement('div');
            popup.id = 'otpPopup';
            popup.className = 'otp-popup';
            popup.innerHTML = `
                <div class="otp-popup-content">
                    <div class="otp-popup-header">
                        <h3>${emailSent ? '✓ OTP Sent to Email' : '⚠ OTP Generated'}</h3>
                        <button class="otp-popup-close" onclick="this.closest('.otp-popup').remove()">×</button>
                    </div>
                    <div class="otp-popup-body">
                        ${emailSent ? 
                            `<p>We've sent a verification code to:</p>
                             <p class="otp-email">${email}</p>
                             <p>Please check your inbox and enter the code below.</p>` :
                            `<p>Email is not configured. Your OTP is:</p>`
                        }
                        <div class="otp-display-box">
                            <div class="otp-code-display">${otp}</div>
                            <button class="btn-copy-otp" onclick="copyOTPToClipboard('${otp}')">
                                📋 Copy OTP
                            </button>
                        </div>
                        <p class="otp-validity">This OTP is valid for 10 minutes</p>
                        ${!emailSent ? 
                            `<p class="otp-warning">⚠ To receive OTP via email, configure SMTP settings in the backend</p>` :
                            ''
                        }
                    </div>
                </div>
            `;
            
            document.body.appendChild(popup);
            
            // Auto-close after 30 seconds
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.remove();
                }
            }, 30000);
        }
        
        // Copy OTP to clipboard
        function copyOTPToClipboard(otp) {
            navigator.clipboard.writeText(otp).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                btn.style.background = '#00ff00';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            }).catch(() => {
                alert('Failed to copy. OTP: ' + otp);
            });
        }
        
        // Make copyOTPToClipboard available globally
        window.copyOTPToClipboard = copyOTPToClipboard;
        
        // Show OTP input field
        function showOTPInput() {
            // Check if OTP input already exists
            if (document.getElementById('otpInput')) {
                return;
            }
            
            // Create OTP input container
            otpInputContainer = document.createElement('div');
            otpInputContainer.className = 'otp-container';
            otpInputContainer.innerHTML = `
                <div class="form-group">
                    <label for="otpInput">Enter OTP <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="otpInput" 
                        name="otpInput" 
                        maxlength="6" 
                        pattern="[0-9]{6}"
                        placeholder="Enter 6-digit OTP"
                        autocomplete="off"
                    >
                    <p class="otp-hint">Please enter the 6-digit OTP sent to your email</p>
                </div>
            `;
            
            // Insert before form actions
            const formActions = document.querySelector('.form-actions');
            signupForm.insertBefore(otpInputContainer, formActions);
            
            // Focus on OTP input
            setTimeout(() => {
                document.getElementById('otpInput').focus();
            }, 100);
            
            // Add input event listener to restrict to numbers only
            const otpInput = document.getElementById('otpInput');
            otpInput.addEventListener('input', function(e) {
                // Only allow numbers
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
            
            // Update submit button text
            const submitButton = document.querySelector('.btn-submit');
            if (submitButton) {
                submitButton.textContent = 'Verify OTP';
            }
        }
        
        // Hide OTP input field
        function hideOTPInput() {
            if (otpInputContainer && otpInputContainer.parentNode) {
                otpInputContainer.parentNode.removeChild(otpInputContainer);
                otpInputContainer = null;
            }
            
            // Reset submit button text
            const submitButton = document.querySelector('.btn-submit');
            if (submitButton) {
                submitButton.textContent = 'Sign Up';
            }
        }
        
        // Validate form data
        function validateForm(formData) {
            const requiredFields = {
                name: 'Name',
                age: 'Age',
                gender: 'Gender',
                email: 'Email',
                mobile: 'Mobile',
                city: 'City',
                address: 'Address'
            };
            
            // Check required fields
            for (const [field, label] of Object.entries(requiredFields)) {
                if (!formData[field] || formData[field] === '') {
                    showMessage(`${label} is required`, 'error');
                    document.getElementById(field).focus();
                    return false;
                }
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                showMessage('Please enter a valid email address', 'error');
                document.getElementById('email').focus();
                return false;
            }
            
            // Validate mobile number (basic validation - 10 digits)
            const mobileRegex = /^[0-9]{10}$/;
            if (!mobileRegex.test(formData.mobile)) {
                showMessage('Please enter a valid 10-digit mobile number', 'error');
                document.getElementById('mobile').focus();
                return false;
            }
            
            // Validate age
            const age = parseInt(formData.age);
            if (isNaN(age) || age < 1 || age > 120) {
                showMessage('Please enter a valid age (1-120)', 'error');
                document.getElementById('age').focus();
                return false;
            }
            
            // Validate guardian number if provided
            if (formData.guardianNumber && formData.guardianNumber !== '') {
                if (!mobileRegex.test(formData.guardianNumber)) {
                    showMessage('Please enter a valid 10-digit guardian mobile number', 'error');
                    document.getElementById('guardianNumber').focus();
                    return false;
                }
            }
            
            return true;
        }
        
        // Save data to localStorage
        function saveToLocalStorage(formData) {
            // Use email as key identifier (you can also use digitalID)
            const storageKey = 'tourist_' + formData.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
            
            // Save user data
            localStorage.setItem(storageKey, JSON.stringify(formData));
            
            // Also maintain a list of all tourist emails for easy lookup
            let touristList = JSON.parse(localStorage.getItem('tourist_list') || '[]');
            if (!touristList.includes(formData.email.toLowerCase())) {
                touristList.push(formData.email.toLowerCase());
                localStorage.setItem('tourist_list', JSON.stringify(touristList));
            }
            
            // Store mapping of Digital ID to email for quick lookup
            localStorage.setItem('digitalID_' + formData.digitalID, formData.email.toLowerCase());
        }
        
        // Show message to user
        function showMessage(message, type) {
            // Remove existing message if any
            const existingMessage = document.querySelector('.form-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `form-message form-message-${type}`;
            messageEl.textContent = message;
            
            // Insert before form
            signupForm.insertBefore(messageEl, signupForm.firstChild);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
            
            // Scroll to message
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Show Digital ID popup
        function showDigitalIDPopup(digitalID) {
            // Remove existing popup if any
            const existingPopup = document.getElementById('digitalIDPopup');
            if (existingPopup) {
                existingPopup.remove();
            }
            
            // Create popup overlay
            const popupOverlay = document.createElement('div');
            popupOverlay.id = 'digitalIDPopup';
            popupOverlay.className = 'digital-id-popup-overlay';
            
            // Create popup content
            popupOverlay.innerHTML = `
                <div class="digital-id-popup">
                    <div class="popup-header">
                        <h2 class="popup-title">🎉 Registration Successful!</h2>
                    </div>
                    <div class="popup-content">
                        <p class="popup-message">Your Digital ID is:</p>
                        <div class="digital-id-display" id="digitalIDDisplay">
                            ${digitalID}
                        </div>
                        <p class="popup-warning">⚠️ Please save this Digital ID. You will need it to login.</p>
                        <div class="popup-countdown">
                            <span id="countdown">10</span> seconds remaining...
                        </div>
                    </div>
                    <div class="popup-footer">
                        <button class="btn-neon btn-primary" onclick="copyDigitalID('${digitalID}')">Copy ID</button>
                        <button class="btn-neon btn-secondary" onclick="closeDigitalIDPopup()">Close</button>
                    </div>
                </div>
            `;
            
            // Add to body
            document.body.appendChild(popupOverlay);
            
            // Show popup with animation
            setTimeout(() => {
                popupOverlay.classList.add('show');
            }, 10);
            
            // Countdown timer
            let countdown = 10;
            const countdownElement = document.getElementById('countdown');
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdownElement) {
                    countdownElement.textContent = countdown;
                }
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    closeDigitalIDPopup();
                }
            }, 1000);
            
            // Store interval to clear if user closes manually
            popupOverlay.dataset.interval = countdownInterval;
        }
        
        // Close Digital ID popup
        window.closeDigitalIDPopup = function() {
            const popup = document.getElementById('digitalIDPopup');
            if (popup) {
                const interval = popup.dataset.interval;
                if (interval) {
                    clearInterval(interval);
                }
                popup.classList.remove('show');
                setTimeout(() => {
                    popup.remove();
                    // Redirect to login page
                    window.location.href = 'tourist_login.html';
                }, 300);
            }
        };
        
        // Copy Digital ID to clipboard
        window.copyDigitalID = function(digitalID) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(digitalID).then(() => {
                    const display = document.getElementById('digitalIDDisplay');
                    if (display) {
                        const originalText = display.textContent;
                        display.textContent = 'Copied!';
                        display.style.color = '#00ff7f';
                        setTimeout(() => {
                            display.textContent = originalText;
                            display.style.color = '';
                        }, 2000);
                    }
                }).catch(err => {
                    console.error('Failed to copy:', err);
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = digitalID;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    const display = document.getElementById('digitalIDDisplay');
                    if (display) {
                        display.textContent = 'Copied!';
                        setTimeout(() => {
                            display.textContent = digitalID;
                        }, 2000);
                    }
                } catch (err) {
                    console.error('Fallback copy failed:', err);
                }
                document.body.removeChild(textArea);
            }
        };
    }
    
    // Tourist Login Logic
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        // Auto-uppercase Digital ID as user types
        const digitalIDInput = document.getElementById('digitalID');
        if (digitalIDInput) {
            digitalIDInput.addEventListener('input', function(e) {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
        
        // Handle login
        function handleLogin() {
            const digitalID = document.getElementById('digitalID').value.trim().toUpperCase();
            const email = document.getElementById('email').value.trim().toLowerCase();
            
            // Validate inputs
            if (!digitalID || !email) {
                showLoginMessage('Please fill in all fields', 'error');
                return;
            }
            
            // Validate Digital ID format (YT followed by 5 digits)
            const digitalIDRegex = /^YT[0-9]{5}$/;
            if (!digitalIDRegex.test(digitalID)) {
                showLoginMessage('Invalid Digital ID format. Format should be YT12345', 'error');
                document.getElementById('digitalID').focus();
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showLoginMessage('Please enter a valid email address', 'error');
                document.getElementById('email').focus();
                return;
            }
            
            // Check if user exists in localStorage
            const userData = getUserFromLocalStorage(digitalID, email);
            
            if (userData) {
                // Login successful
                showLoginMessage('Login successful! Redirecting...', 'success');
                
                // Store current user session (optional - for dashboard use)
                sessionStorage.setItem('currentUser', JSON.stringify(userData));
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                // Login failed
                showLoginMessage('Invalid Digital ID or Email. Please check your credentials.', 'error');
                document.getElementById('digitalID').value = '';
                document.getElementById('email').value = '';
                document.getElementById('digitalID').focus();
            }
        }
        
        // Get user data from localStorage
        function getUserFromLocalStorage(digitalID, email) {
            // Method 1: Check using Digital ID mapping
            const emailFromID = localStorage.getItem('digitalID_' + digitalID);
            
            if (emailFromID && emailFromID.toLowerCase() === email.toLowerCase()) {
                // Found email via Digital ID, now get full user data
                const storageKey = 'tourist_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const userDataStr = localStorage.getItem(storageKey);
                
                if (userDataStr) {
                    try {
                        const userData = JSON.parse(userDataStr);
                        // Double-check Digital ID matches
                        if (userData.digitalID && userData.digitalID.toUpperCase() === digitalID.toUpperCase()) {
                            return userData;
                        }
                    } catch (e) {
                        console.error('Error parsing user data:', e);
                    }
                }
            }
            
            // Method 2: Direct lookup by email (fallback)
            const storageKey = 'tourist_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const userDataStr = localStorage.getItem(storageKey);
            
            if (userDataStr) {
                try {
                    const userData = JSON.parse(userDataStr);
                    // Verify both Digital ID and Email match
                    if (userData.digitalID && 
                        userData.digitalID.toUpperCase() === digitalID.toUpperCase() &&
                        userData.email && 
                        userData.email.toLowerCase() === email.toLowerCase()) {
                        return userData;
                    }
                } catch (e) {
                    console.error('Error parsing user data:', e);
                }
            }
            
            return null;
        }
        
        // Show message to user (login page)
        function showLoginMessage(message, type) {
            // Remove existing message if any
            const existingMessage = document.querySelector('.form-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `form-message form-message-${type}`;
            messageEl.textContent = message;
            
            // Insert before form
            loginForm.insertBefore(messageEl, loginForm.firstChild);
            
            // Auto remove after 5 seconds (or 3 seconds for success)
            const timeout = type === 'success' ? 3000 : 5000;
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, timeout);
            
            // Scroll to message
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    // Dashboard Form Logic
    const dashboardForm = document.getElementById('dashboardForm');
    
    if (dashboardForm) {
        dashboardForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleDashboardSubmit();
        });
        
        // Locations data structure: Country -> State -> Cities
        const LOCATIONS_MAP = {
            'india': {
                'maharashtra': ['mumbai', 'pune', 'nashik', 'nagpur', 'aurangabad'],
                'karnataka': ['bangalore', 'mysore', 'mangalore', 'hubli', 'belgaum'],
                'tamil-nadu': ['chennai', 'coimbatore', 'madurai', 'salem', 'tiruchirappalli'],
                'kerala': ['kochi', 'thiruvananthapuram', 'kozhikode', 'thrissur', 'kollam'],
                'rajasthan': ['jaipur', 'udaipur', 'jodhpur', 'ajmer', 'bikaner'],
                'goa': ['panaji', 'margao', 'vasco-da-gama', 'mapusa'],
                'himachal-pradesh': ['shimla', 'manali', 'dharamshala', 'solan', 'kullu'],
                'uttarakhand': ['dehradun', 'rishikesh', 'haridwar', 'nainital', 'mussoorie'],
                'west-bengal': ['kolkata', 'darjeeling', 'howrah', 'durgapur', 'asansol'],
                'gujarat': ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'bhavnagar'],
                'delhi': ['new-delhi', 'delhi'],
                'punjab': ['amritsar', 'ludhiana', 'chandigarh', 'jalandhar', 'patiala'],
                'uttar-pradesh': ['agra', 'varanasi', 'lucknow', 'kanpur', 'allahabad'],
                'madhya-pradesh': ['bhopal', 'indore', 'gwalior', 'jabalpur', 'ujjain'],
                'andhra-pradesh': ['hyderabad', 'vishakhapatnam', 'vijayawada', 'guntur', 'nellore']
            },
            'usa': {
                'california': ['los-angeles', 'san-francisco', 'san-diego', 'sacramento', 'oakland'],
                'new-york': ['new-york-city', 'buffalo', 'rochester', 'albany', 'syracuse'],
                'texas': ['houston', 'dallas', 'austin', 'san-antonio', 'fort-worth'],
                'florida': ['miami', 'tampa', 'orlando', 'jacksonville', 'fort-lauderdale']
            },
            'uk': {
                'england': ['london', 'manchester', 'birmingham', 'liverpool', 'leeds'],
                'scotland': ['edinburgh', 'glasgow', 'aberdeen', 'dundee', 'inverness'],
                'wales': ['cardiff', 'swansea', 'newport', 'wrexham']
            },
            'canada': {
                'ontario': ['toronto', 'ottawa', 'hamilton', 'london', 'windsor'],
                'british-columbia': ['vancouver', 'victoria', 'surrey', 'burnaby', 'richmond']
            },
            'australia': {
                'new-south-wales': ['sydney', 'newcastle', 'wollongong', 'albury'],
                'victoria': ['melbourne', 'geelong', 'ballarat', 'bendigo']
            }
        };

        const countrySelect = document.getElementById('country');
        const stateSelect = document.getElementById('state');
        const citySelect = document.getElementById('city');

        // Initialize: Populate countries
        const countries = Object.keys(LOCATIONS_MAP);
        setSelectOptions(countrySelect, countries, 'Select Country');

        // Helper to clear and set options
        function setSelectOptions(selectEl, optionsArray, placeholder) {
            if (!selectEl) return;
            
            selectEl.innerHTML = '';
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholder || 'Select';
            selectEl.appendChild(placeholderOption);

            if (Array.isArray(optionsArray) && optionsArray.length > 0) {
                optionsArray.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt;
                    // Format display name: convert kebab-case to Title Case
                    o.textContent = opt.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    selectEl.appendChild(o);
                });
            }
            
            // Add an 'Other' option so users can enter a custom value
            const otherOpt = document.createElement('option');
            otherOpt.value = '__other__';
            otherOpt.textContent = 'Other (Enter manually)';
            selectEl.appendChild(otherOpt);
        }

        // When country changes, populate states for that country
        countrySelect.addEventListener('change', function() {
            // hide/show custom country input
            toggleCustomInput('country', this.value === '__other__');
            const country = (this.value || '').toLowerCase();
            
            // Reset state and city dropdowns
            stateSelect.innerHTML = '<option value="">Select State</option>';
            citySelect.innerHTML = '<option value="">Select City</option>';
            toggleCustomInput('state', false);
            toggleCustomInput('city', false);
            
            if (country && country !== '__other__' && LOCATIONS_MAP[country]) {
                const states = Object.keys(LOCATIONS_MAP[country]);
                setSelectOptions(stateSelect, states, 'Select State');
            } else if (country === '__other__') {
                // Show custom input for country
                toggleCustomInput('country', true);
            }
        });

        // When state changes, populate cities for that state
        stateSelect.addEventListener('change', function() {
            // hide/show custom state input
            toggleCustomInput('state', this.value === '__other__');
            const country = (countrySelect.value || '').toLowerCase();
            const state = (this.value || '').toLowerCase();
            
            // Reset city dropdown
            citySelect.innerHTML = '<option value="">Select City</option>';
            toggleCustomInput('city', false);
            
            if (country && state && state !== '__other__' && LOCATIONS_MAP[country] && LOCATIONS_MAP[country][state]) {
                const cities = LOCATIONS_MAP[country][state];
                setSelectOptions(citySelect, cities, 'Select City');
            } else if (state === '__other__') {
                // Show custom input for state
                toggleCustomInput('state', true);
            }
        });

        // When city changes, toggle custom city input
        citySelect.addEventListener('change', function() {
            toggleCustomInput('city', this.value === '__other__');
        });

        // Utility to show/hide custom input fields
        function toggleCustomInput(kind, show) {
            const el = document.getElementById(kind + 'Custom');
            const selectEl = document.getElementById(kind);
            if (!el) return;
            if (show) {
                el.style.display = 'block';
                el.required = true;
                // mark select as not required so custom can be used
                if (selectEl) selectEl.required = false;
            } else {
                el.style.display = 'none';
                el.required = false;
                if (selectEl) selectEl.required = true;
                el.value = '';
            }
        }

        
        // Handle dashboard form submission
        function handleDashboardSubmit() {
            // Allow custom entries when 'Other' is selected
            const countrySel = document.getElementById('country');
            const stateSel = document.getElementById('state');
            const citySel = document.getElementById('city');

            const country = countrySel.value === '__other__' ? document.getElementById('countryCustom').value.trim() : countrySel.value;
            const state = stateSel.value === '__other__' ? document.getElementById('stateCustom').value.trim() : stateSel.value;
            const city = citySel.value === '__other__' ? document.getElementById('cityCustom').value.trim() : citySel.value;
            
            // Validate all fields are selected
            if (!country || !state || !city) {
                showDashboardMessage('Please provide Country, State, and City (or choose Other and enter manually)', 'error');
                return;
            }
            
            // Store selected location in sessionStorage (optional - for use in categories page)
            const locationData = {
                country: country,
                state: state,
                city: city,
                timestamp: new Date().toISOString()
            };
            sessionStorage.setItem('selectedLocation', JSON.stringify(locationData));
            // If user clicked a category first, continue to places page for that category
            const pendingCategory = sessionStorage.getItem('pendingCategory');
            if (pendingCategory) {
                // Set the selected category and remove pending
                sessionStorage.setItem('selectedCategory', pendingCategory);
                sessionStorage.removeItem('pendingCategory');
                window.location.href = 'places.html';
                return;
            }

            // Otherwise, redirect to categories page
            window.location.href = 'categories.html';
        }
        
        // Show message to user (dashboard page)
        function showDashboardMessage(message, type) {
            // Remove existing message if any
            const existingMessage = document.querySelector('.form-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `form-message form-message-${type}`;
            messageEl.textContent = message;
            
            // Insert before form
            dashboardForm.insertBefore(messageEl, dashboardForm.firstChild);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
            
            // Scroll to message
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    // Place Details Logic
    const placeName = document.getElementById('placeName');
    const currentStatus = document.getElementById('currentStatus');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const openingTime = document.getElementById('openingTime');
    const closingTime = document.getElementById('closingTime');
    const safetyBadge = document.getElementById('safetyBadge');
    
    if (placeName) {
        const locationText = document.getElementById('locationText');
        const crowdStatus = document.getElementById('crowdStatus');
        const crowdFill = document.getElementById('crowdFill');
        const startJourneyBtn = document.getElementById('startJourneyBtn');
        const journeyStatus = document.getElementById('journeyStatus');
        
        // Load selected place and location from sessionStorage
        const selectedPlaceStr = sessionStorage.getItem('selectedPlace');
        const selectedLocationStr = sessionStorage.getItem('selectedLocation');
        
        let placeData = {};
        let locationData = {};
        
        if (selectedPlaceStr) {
            try {
                placeData = JSON.parse(selectedPlaceStr);
                placeName.textContent = placeData.name;
                openingTime.textContent = placeData.openingTime;
                closingTime.textContent = placeData.closingTime;
                setSafetyIndicator(placeData.safety);
            } catch (e) {
                console.error('Error loading place:', e);
            }
        }
        
        if (selectedLocationStr) {
            try {
                locationData = JSON.parse(selectedLocationStr);
                // Display location
                if (locationText) {
                    const country = formatPlaceName(locationData.country);
                    const state = formatPlaceName(locationData.state);
                    const city = formatPlaceName(locationData.city);
                    locationText.textContent = `${city}, ${state}, ${country}`;
                }
            } catch (e) {
                console.error('Error loading location:', e);
            }
        }
        
        // Calculate and display crowd density (safety analysis)
        function updateCrowdDensity() {
            // Simulate crowd density based on time of day and day of week
            const now = new Date();
            const hour = now.getHours();
            const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
            
            // Calculate crowd density (0-100%)
            let density = 30; // Base density
            
            // Weekend has more crowd
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                density += 20;
            }
            
            // Peak hours (10 AM - 2 PM, 5 PM - 9 PM)
            if ((hour >= 10 && hour < 14) || (hour >= 17 && hour < 21)) {
                density += 30;
            }
            
            // Evening hours (6 PM - 10 PM) are busiest
            if (hour >= 18 && hour < 22) {
                density += 20;
            }
            
            // Random variation
            density += Math.random() * 20 - 10;
            density = Math.max(0, Math.min(100, density));
            
            // Determine safety level
            let safetyLevel = 'green';
            let safetyText = 'Low';
            
            if (density >= 70) {
                safetyLevel = 'red';
                safetyText = 'High';
            } else if (density >= 40) {
                safetyLevel = 'yellow';
                safetyText = 'Moderate';
            }
            
            // Update UI
            if (crowdStatus) {
                crowdStatus.textContent = safetyText;
                crowdStatus.className = `crowd-status crowd-${safetyLevel}`;
            }
            
            if (crowdFill) {
                crowdFill.style.width = density + '%';
                crowdFill.className = `crowd-fill crowd-${safetyLevel}`;
            }
            
            // Update safety badge
            setSafetyIndicator(safetyLevel);
        }
        
        // Update crowd density every 5 minutes
        updateCrowdDensity();
        setInterval(updateCrowdDensity, 300000); // 5 minutes
        
        // Start Journey button handler
        if (startJourneyBtn) {
            startJourneyBtn.addEventListener('click', function() {
                if (isJourneyActive) {
                    // Stop journey
                    stopJourney();
                    updateJourneyStatus('Journey stopped. Click to start again.');
                } else {
                    // Start journey
                    handleStartJourneyFromPlace();
                }
            });
        }
        
        function handleStartJourneyFromPlace() {
            // Check if user is logged in
            const currentUserStr = sessionStorage.getItem('currentUser');
            if (!currentUserStr) {
                showJourneyMessage('Please login to start a journey', 'error');
                window.location.href = 'tourist_login.html';
                return;
            }
            
            // Start journey with geofencing
            startJourneyWithGeofencing(placeData, locationData);
        }
        
        // Check if journey is already active on page load
        const currentUserStr = sessionStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const currentUser = JSON.parse(currentUserStr);
                const userEmail = currentUser.email;
                const watchIdStr = localStorage.getItem('activeWatchId_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                
                if (watchIdStr) {
                    isJourneyActive = true;
                    updateJourneyStatus('Journey active - Location tracking...');
                }
            } catch (e) {
                console.error('Error checking journey status:', e);
            }
        }
        
        // Update status based on current time
        updatePlaceStatus();
        
        // Update status every minute
        setInterval(updatePlaceStatus, 60000);
        
        function formatPlaceName(name) {
            if (!name) return '-';
            return name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        function updatePlaceStatus() {
            if (!openingTime || !closingTime) return;
            
            // Get opening and closing times (assuming format "HH:MM AM/PM")
            const openingTimeStr = openingTime.textContent.trim();
            const closingTimeStr = closingTime.textContent.trim();
            
            // Convert to 24-hour format and check current status
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = currentHour * 60 + currentMinute; // minutes since midnight
            
            const openingMinutes = parseTimeToMinutes(openingTimeStr);
            const closingMinutes = parseTimeToMinutes(closingTimeStr);
            
            // Check if currently open
            let isOpen = false;
            if (openingMinutes <= closingMinutes) {
                // Normal case: opening < closing (e.g., 6 AM to 7 PM)
                isOpen = currentTime >= openingMinutes && currentTime < closingMinutes;
            } else {
                // Overnight case: opening > closing (e.g., 10 PM to 2 AM)
                isOpen = currentTime >= openingMinutes || currentTime < closingMinutes;
            }
            
            // Update status badge
            if (isOpen) {
                currentStatus.className = 'status-badge status-open';
                statusText.textContent = 'OPEN';
            } else {
                currentStatus.className = 'status-badge status-closed';
                statusText.textContent = 'CLOSED';
            }
        }
        
        // Parse time string (e.g., "06:00 AM" or "7:00 PM") to minutes since midnight
        function parseTimeToMinutes(timeStr) {
            const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
            const match = timeStr.match(timeRegex);
            
            if (!match) return 0;
            
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const period = match[3].toUpperCase();
            
            if (period === 'PM' && hours !== 12) {
                hours += 12;
            } else if (period === 'AM' && hours === 12) {
                hours = 0;
            }
            
            return hours * 60 + minutes;
        }
        
        // Function to set safety indicator (can be called from backend)
        function setSafetyIndicator(level) {
            if (!safetyBadge) return;
            
            // Remove existing safety classes
            safetyBadge.classList.remove('safety-green', 'safety-yellow', 'safety-red');
            
            // Add appropriate class
            if (level === 'green' || level === 'safe') {
                safetyBadge.classList.add('safety-green');
                safetyBadge.innerHTML = '<span class="safety-dot"></span> Safe';
            } else if (level === 'yellow' || level === 'moderate') {
                safetyBadge.classList.add('safety-yellow');
                safetyBadge.innerHTML = '<span class="safety-dot"></span> Moderate';
            } else if (level === 'red' || level === 'unsafe') {
                safetyBadge.classList.add('safety-red');
                safetyBadge.innerHTML = '<span class="safety-dot"></span> Unsafe';
            }
        }
        
        // Example: Set safety indicator (can be updated from backend)
        // setSafetyIndicator('green'); // or 'yellow' or 'red'
    }
    
    // Start Journey Logic
    let watchId = null;
    let isJourneyActive = false;
    let geofenceCenter = null;
    let geofenceRadius = 1000; // 1km radius in meters
    
    // Function to start journey with geofencing
    function startJourneyWithGeofencing(placeData, locationData) {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            showJourneyMessage('Geolocation is not supported by your browser', 'error');
            return;
        }
        
        // Check if journey is already active
        if (isJourneyActive) {
            showJourneyMessage('Journey is already active', 'info');
            updateJourneyStatus('Journey is active. Location tracking...');
            return;
        }
        
        // Get current user from sessionStorage
        const currentUserStr = sessionStorage.getItem('currentUser');
        if (!currentUserStr) {
            showJourneyMessage('Please login to start a journey', 'error');
            window.location.href = 'tourist_login.html';
            return;
        }
        
        try {
            const currentUser = JSON.parse(currentUserStr);
            const userEmail = currentUser.email;
            const digitalID = currentUser.digitalID;
            
            // Show "Journey Started" popup
            showJourneyMessage('Journey Started! Your location is being tracked live.', 'success');
            updateJourneyStatus('Journey active - Location tracking enabled');
            
            // Initialize journey data
            const journeyData = {
                userId: digitalID || userEmail,
                userEmail: userEmail,
                digitalID: digitalID,
                placeName: placeData.name || 'Unknown Place',
                location: locationData,
                startTime: new Date().toISOString(),
                locations: [],
                isActive: true,
                geofencing: {
                    enabled: true,
                    radius: geofenceRadius
                }
            };
            
            // Save initial journey data
            const journeyKey = 'journey_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
            localStorage.setItem(journeyKey, JSON.stringify(journeyData));
            
            // Start watching position with geofencing
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            
            watchId = navigator.geolocation.watchPosition(
                function(position) {
                    // Success callback - location updated
                    handleLocationUpdateWithGeofencing(position, userEmail, digitalID, placeData, locationData);
                },
                function(error) {
                    // Error callback
                    handleLocationError(error);
                },
                options
            );
            
            isJourneyActive = true;
            
            // Save watch ID
            localStorage.setItem('activeWatchId_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_'), watchId.toString());
            
        } catch (e) {
            console.error('Error starting journey:', e);
            showJourneyMessage('Error starting journey. Please try again.', 'error');
        }
    }
    
    // Update journey status text
    function updateJourneyStatus(message) {
        const journeyStatus = document.getElementById('journeyStatus');
        const startJourneyBtn = document.getElementById('startJourneyBtn');
        
        if (journeyStatus) {
            journeyStatus.textContent = message;
        }
        
        if (startJourneyBtn) {
            if (isJourneyActive) {
                startJourneyBtn.textContent = '🛑 Stop Journey';
                startJourneyBtn.classList.add('journey-active');
            } else {
                startJourneyBtn.innerHTML = '<span class="journey-icon">🚀</span> Start Journey';
                startJourneyBtn.classList.remove('journey-active');
            }
        }
    }
    
    // Handle location update with geofencing
    async function handleLocationUpdateWithGeofencing(position, userEmail, digitalID, placeData, locationData) {
        const locationData_obj = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date().toISOString()
        };
        
        const lastSeenTime = new Date().toISOString();
        
        // Set geofence center on first location update if not set
        if (!geofenceCenter) {
            geofenceCenter = {
                lat: locationData_obj.latitude,
                lng: locationData_obj.longitude
            };
            console.log('Geofence center set:', geofenceCenter);
        }
        
        // Check geofencing
        let isWithinGeofence = true;
        if (geofenceCenter) {
            const distance = calculateDistance(
                geofenceCenter.lat,
                geofenceCenter.lng,
                locationData_obj.latitude,
                locationData_obj.longitude
            );
            isWithinGeofence = distance <= geofenceRadius;
        }
        
        // Get existing journey data
        const journeyKey = 'journey_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const journeyDataStr = localStorage.getItem(journeyKey);
        
        let journeyData;
        if (journeyDataStr) {
            try {
                journeyData = JSON.parse(journeyDataStr);
            } catch (e) {
                journeyData = {
                    userId: digitalID,
                    userEmail: userEmail,
                    digitalID: digitalID,
                    startTime: new Date().toISOString(),
                    locations: [],
                    isActive: true
                };
            }
        } else {
            journeyData = {
                userId: digitalID,
                userEmail: userEmail,
                digitalID: digitalID,
                startTime: new Date().toISOString(),
                locations: [],
                isActive: true
            };
        }
        
        // Add location with geofence status
        const locationEntry = {
            ...locationData_obj,
            lastSeenTime: lastSeenTime,
            isWithinGeofence: isWithinGeofence,
            placeName: placeData.name,
            location: locationData
        };
        
        journeyData.locations.push(locationEntry);
        journeyData.lastSeenTime = lastSeenTime;
        journeyData.lastLocation = locationEntry;
        
        // Save to localStorage
        localStorage.setItem(journeyKey, JSON.stringify(journeyData));
        
        // Save current location
        // Use journey start time from journeyData that was already parsed above
        const journeyStartTime = journeyData.startTime || new Date().toISOString();
        
        const currentLocationKey = 'currentLocation_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        localStorage.setItem(currentLocationKey, JSON.stringify({
            ...locationData_obj,
            lastSeenTime: lastSeenTime,
            digitalID: digitalID,
            placeName: placeData.name,
            location: locationData,
            journeyStartTime: journeyStartTime,
            isWithinGeofence: isWithinGeofence
        }));
        
        // Send location to backend
        try {
            const API_BASE = 'http://127.0.0.1:5000';
            await fetch(`${API_BASE}/track-location`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    digitalID: digitalID,
                    latitude: locationData_obj.latitude,
                    longitude: locationData_obj.longitude,
                    accuracy: locationData_obj.accuracy,
                    altitude: locationData_obj.altitude,
                    heading: locationData_obj.heading,
                    speed: locationData_obj.speed,
                    placeName: placeData.name,
                    location: locationData,
                    isWithinGeofence: isWithinGeofence
                })
            });
        } catch (e) {
            console.error('Error sending location to backend:', e);
        }
        
        // Update user's last seen time
        const userKey = 'tourist_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const userDataStr = localStorage.getItem(userKey);
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                userData.lastSeenTime = lastSeenTime;
                userData.lastLocation = {
                    latitude: locationData_obj.latitude,
                    longitude: locationData_obj.longitude
                };
                localStorage.setItem(userKey, JSON.stringify(userData));
            } catch (e) {
                console.error('Error updating user data:', e);
            }
        }
        
        // Update journey status
        if (isWithinGeofence) {
            updateJourneyStatus(`Journey active - Within geofence (${Math.round(geofenceRadius)}m)`);
        } else {
            updateJourneyStatus(`Journey active - Outside geofence`);
        }
    }
    
    // Calculate distance between two coordinates (Haversine formula)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in meters
    }
    
    // Function to start journey (original function - kept for compatibility)
    function startJourney() {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            showJourneyMessage('Geolocation is not supported by your browser', 'error');
            return;
        }
        
        // Check if journey is already active
        if (isJourneyActive) {
            showJourneyMessage('Journey is already active', 'info');
            return;
        }
        
        // Get current user from sessionStorage
        const currentUserStr = sessionStorage.getItem('currentUser');
        if (!currentUserStr) {
            showJourneyMessage('Please login to start a journey', 'error');
            return;
        }
        
        try {
            const currentUser = JSON.parse(currentUserStr);
            const userEmail = currentUser.email;
            
            // Show "Journey Started" popup
            showJourneyMessage('Journey Started! Your location is being tracked.', 'success');
            
            // Initialize journey data
            const journeyData = {
                userId: currentUser.digitalID || userEmail,
                userEmail: userEmail,
                startTime: new Date().toISOString(),
                locations: [],
                isActive: true
            };
            
            // Save initial journey data
            const journeyKey = 'journey_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
            localStorage.setItem(journeyKey, JSON.stringify(journeyData));
            
            // Start watching position
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            
            watchId = navigator.geolocation.watchPosition(
                function(position) {
                    // Success callback - location updated
                    handleLocationUpdate(position, userEmail);
                },
                function(error) {
                    // Error callback
                    handleLocationError(error);
                },
                options
            );
            
            isJourneyActive = true;
            
            // Save watch ID for later use (to stop tracking)
            localStorage.setItem('activeWatchId_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_'), watchId.toString());
            
        } catch (e) {
            console.error('Error starting journey:', e);
            showJourneyMessage('Error starting journey. Please try again.', 'error');
        }
    }
    
    // Handle location update
    function handleLocationUpdate(position, userEmail) {
        const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date().toISOString()
        };
        
        // Update lastSeenTime
        const lastSeenTime = new Date().toISOString();
        
        // Get existing journey data
        const journeyKey = 'journey_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const journeyDataStr = localStorage.getItem(journeyKey);
        
        let journeyData;
        if (journeyDataStr) {
            try {
                journeyData = JSON.parse(journeyDataStr);
            } catch (e) {
                journeyData = {
                    userId: userEmail,
                    userEmail: userEmail,
                    startTime: new Date().toISOString(),
                    locations: [],
                    isActive: true
                };
            }
        } else {
            journeyData = {
                userId: userEmail,
                userEmail: userEmail,
                startTime: new Date().toISOString(),
                locations: [],
                isActive: true
            };
        }
        
        // Add new location to array
        journeyData.locations.push(locationData);
        
        // Update lastSeenTime
        journeyData.lastSeenTime = lastSeenTime;
        journeyData.lastLocation = locationData;
        
        // Save to localStorage
        localStorage.setItem(journeyKey, JSON.stringify(journeyData));
        
        // Also save current location separately for quick access
        // Get journey start time
        const journeyKeyForLocation = 'journey_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const journeyDataStrForLocation = localStorage.getItem(journeyKeyForLocation);
        let journeyStartTimeForLocation = new Date().toISOString();
        if (journeyDataStrForLocation) {
            try {
                const journeyDataForLocation = JSON.parse(journeyDataStrForLocation);
                journeyStartTimeForLocation = journeyDataForLocation.startTime || journeyStartTimeForLocation;
            } catch (e) {
                // Use default
            }
        }
        
        const currentLocationKey = 'currentLocation_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        localStorage.setItem(currentLocationKey, JSON.stringify({
            ...locationData,
            lastSeenTime: lastSeenTime,
            journeyStartTime: journeyStartTimeForLocation
        }));
        
        // Update user's last seen time in their profile
        const userKey = 'tourist_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const userDataStr = localStorage.getItem(userKey);
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                userData.lastSeenTime = lastSeenTime;
                userData.lastLocation = {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude
                };
                localStorage.setItem(userKey, JSON.stringify(userData));
            } catch (e) {
                console.error('Error updating user data:', e);
            }
        }
        
        // Optional: Log location update (can be removed in production)
        console.log('Location updated:', {
            lat: locationData.latitude,
            lng: locationData.longitude,
            time: lastSeenTime
        });
    }
    
    // Handle location error
    function handleLocationError(error) {
        let errorMessage = 'Unknown error occurred';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied. Please enable location permissions.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable.';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out.';
                break;
        }
        
        showJourneyMessage(errorMessage, 'error');
        console.error('Geolocation error:', error);
    }
    
    // Function to stop journey
    function stopJourney() {
        if (!isJourneyActive) {
            return;
        }
        
        // Get current user
        const currentUserStr = sessionStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const currentUser = JSON.parse(currentUserStr);
                const userEmail = currentUser.email;
                
                // Stop watching position
                if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                }
                
                // Update journey data
                const journeyKey = 'journey_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const journeyDataStr = localStorage.getItem(journeyKey);
                
                if (journeyDataStr) {
                    const journeyData = JSON.parse(journeyDataStr);
                    journeyData.isActive = false;
                    journeyData.endTime = new Date().toISOString();
                    localStorage.setItem(journeyKey, JSON.stringify(journeyData));
                }
                
                // Remove watch ID
                localStorage.removeItem('activeWatchId_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                
                isJourneyActive = false;
                watchId = null;
                geofenceCenter = null;
                
                showJourneyMessage('Journey stopped', 'info');
                updateJourneyStatus('Journey stopped. Click to start again.');
            } catch (e) {
                console.error('Error stopping journey:', e);
            }
        }
    }
    
    // Show journey message popup
    function showJourneyMessage(message, type) {
        // Remove existing message if any
        const existingMessage = document.querySelector('.journey-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `journey-message journey-message-${type}`;
        messageEl.innerHTML = `
            <div class="journey-message-content">
                <span class="journey-message-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
                <span class="journey-message-text">${message}</span>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(messageEl);
        
        // Show with animation
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 10);
        
        // Auto remove after delay
        const timeout = type === 'success' ? 4000 : type === 'error' ? 5000 : 3000;
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, timeout);
    }
    
    // Check for active journey on page load
    function checkActiveJourney() {
        const currentUserStr = sessionStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const currentUser = JSON.parse(currentUserStr);
                const userEmail = currentUser.email;
                const watchIdStr = localStorage.getItem('activeWatchId_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                
                if (watchIdStr) {
                    // Journey was active, but watch was cleared (page reload)
                    // Restart journey tracking
                    const journeyKey = 'journey_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const journeyDataStr = localStorage.getItem(journeyKey);
                    
                    if (journeyDataStr) {
                        const journeyData = JSON.parse(journeyDataStr);
                        if (journeyData.isActive) {
                            // Restart journey
                            startJourney();
                        }
                    }
                }
            } catch (e) {
                console.error('Error checking active journey:', e);
            }
        }
    }
    
    // Make functions globally available (can be called from buttons)
    window.startJourney = startJourney;
    window.stopJourney = stopJourney;
    
    // Check for active journey on load
    checkActiveJourney();
    
    // SOS Button Logic
    const sosButton = document.getElementById('sosButton');
    
    if (sosButton) {
        // Function to get admin mobile number
        function getAdminMobileNumber() {
            // Try to get admin from admin_list
            const adminList = JSON.parse(localStorage.getItem('admin_list') || '[]');
            
            if (adminList.length > 0) {
                // Get first admin's mobile number
                const firstAdminEmail = adminList[0];
                const adminKey = 'admin_' + firstAdminEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const adminDataStr = localStorage.getItem(adminKey);
                
                if (adminDataStr) {
                    try {
                        const adminData = JSON.parse(adminDataStr);
                        if (adminData.mobile) {
                            return adminData.mobile;
                        }
                    } catch (e) {
                        console.error('Error parsing admin data:', e);
                    }
                }
            }
            
            // Fallback: Search through all localStorage keys for admin
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('admin_')) {
                    try {
                        const adminData = JSON.parse(localStorage.getItem(key));
                        if (adminData && adminData.mobile) {
                            return adminData.mobile;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            // If no admin found, return null
            return null;
        }
        
        // Get admin mobile number and set SOS button
        const adminMobile = getAdminMobileNumber();
        
        if (adminMobile) {
            // Format mobile number for tel: link (add country code if needed)
            // Assuming 10-digit mobile number, add +91 for India (adjust as needed)
            let formattedNumber = adminMobile;
            if (adminMobile.length === 10 && !adminMobile.startsWith('+')) {
                formattedNumber = '+91' + adminMobile; // India country code
            } else if (!adminMobile.startsWith('+')) {
                formattedNumber = '+' + adminMobile;
            }
            
            sosButton.href = `tel:${formattedNumber}`;
            sosButton.title = `Call Admin: ${adminMobile}`;
        } else {
            // No admin found - disable SOS button or show error
            sosButton.href = '#';
            sosButton.title = 'No administrator registered. Please contact support.';
            sosButton.style.opacity = '0.5';
            sosButton.style.cursor = 'not-allowed';
            console.warn('No admin found for SOS call');
        }
        
        // Handle click event
        sosButton.addEventListener('click', function(e) {
            // If no admin number, prevent default and show message
            if (!adminMobile) {
                e.preventDefault();
                alert('No administrator is registered. Please contact support.');
                return;
            }
            
            // Add active class for red glowing animation
            sosButton.classList.add('active');
            
            // Remove active class after animation completes
            setTimeout(() => {
                sosButton.classList.remove('active');
            }, 500);
            
            // Log SOS event
            logSOSEvent(adminMobile);
        });
        
        // Function to log SOS event
        function logSOSEvent(adminNumber) {
            const currentUserStr = sessionStorage.getItem('currentUser');
            let currentUser = null;
            let touristMobile = null;
            
            if (currentUserStr) {
                try {
                    currentUser = JSON.parse(currentUserStr);
                    // Get tourist's mobile number from their profile
                    const userEmail = currentUser.email;
                    const touristKey = 'tourist_' + userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const touristDataStr = localStorage.getItem(touristKey);
                    
                    if (touristDataStr) {
                        try {
                            const touristData = JSON.parse(touristDataStr);
                            touristMobile = touristData.mobile || null;
                        } catch (e) {
                            console.error('Error parsing tourist data:', e);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing current user:', e);
                }
            }
            
            const sosData = {
                timestamp: new Date().toISOString(),
                user: currentUser,
                touristMobile: touristMobile, // Include tourist's mobile number
                adminNumber: adminNumber
            };
            
            // Get current location if available
            const currentLocationKey = 'currentLocation_' + (sosData.user ? sosData.user.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'anonymous');
            const currentLocation = localStorage.getItem(currentLocationKey);
            
            if (currentLocation) {
                try {
                    sosData.location = JSON.parse(currentLocation);
                } catch (e) {
                    console.error('Error parsing location:', e);
                }
            }
            
            // Save SOS event to localStorage
            let sosEvents = JSON.parse(localStorage.getItem('sos_events') || '[]');
            sosEvents.push(sosData);
            localStorage.setItem('sos_events', JSON.stringify(sosEvents));
            
            // In production, send to backend
            console.log('SOS Event:', sosData);
            console.log('Tourist Mobile:', touristMobile);
            
            // Try to send to backend
            try {
                const API_BASE = 'http://127.0.0.1:5000';
                fetch(`${API_BASE}/sos-alert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sosData)
                }).catch(err => console.error('Failed to send SOS to backend:', err));
            } catch (e) {
                console.error('Error sending SOS to backend:', e);
            }
        }
    }
    
    // Admin Registration Logic
    const adminRegisterForm = document.getElementById('adminRegisterForm');
    
    if (adminRegisterForm) {
        adminRegisterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAdminRegistration();
        });
        
        // Handle admin registration
        function handleAdminRegistration() {
            // Get form data
            const formData = {
                name: document.getElementById('adminName').value.trim(),
                mobile: document.getElementById('adminMobile').value.trim(),
                email: document.getElementById('adminEmail').value.trim().toLowerCase(),
                city: document.getElementById('adminCity').value.trim()
            };
            
            // Validate form
            if (!validateAdminForm(formData)) {
                return;
            }
            
            // Check if admin with this email already exists
            const existingAdmin = getAdminByEmail(formData.email);
            if (existingAdmin) {
                showAdminMessage('Admin with this email already exists', 'error');
                return;
            }
            
            // Generate admin digital ID
            const adminDigitalID = generateAdminDigitalID();
            
            // Generate password
            const password = generateAdminPassword();
            
            // Create admin data object
            const adminData = {
                ...formData,
                adminDigitalID: adminDigitalID,
                password: password, // In production, this should be hashed
                registrationDate: new Date().toISOString(),
                role: 'admin'
            };
            
            // Try to save admin to backend, fallback to localStorage
            (async () => {
                try {
                    const resp = await fetch(`${API_BASE}/save-admin`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(adminData)
                    });

                    const result = await resp.json();
                    if (resp.ok && result && result.success) {
            showAdminCredentials(adminDigitalID, password);
                adminRegisterForm.reset();
                    } else {
                        // Backend error - fallback to local
                        saveAdminToLocalStorage(adminData);
                        showAdminCredentials(adminDigitalID, password);
                        adminRegisterForm.reset();
                    }
                } catch (e) {
                    console.warn('Save admin API failed, saving locally:', e);
                    saveAdminToLocalStorage(adminData);
                    showAdminCredentials(adminDigitalID, password);
                    adminRegisterForm.reset();
                }
            })();
        }
        
        // Validate admin form
        function validateAdminForm(formData) {
            // Check required fields
            if (!formData.name || formData.name === '') {
                showAdminMessage('Name is required', 'error');
                document.getElementById('adminName').focus();
                return false;
            }
            
            // Validate mobile number (10 digits)
            const mobileRegex = /^[0-9]{10}$/;
            if (!formData.mobile || !mobileRegex.test(formData.mobile)) {
                showAdminMessage('Please enter a valid 10-digit mobile number', 'error');
                document.getElementById('adminMobile').focus();
                return false;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!formData.email || !emailRegex.test(formData.email)) {
                showAdminMessage('Please enter a valid email address', 'error');
                document.getElementById('adminEmail').focus();
                return false;
            }
            
            // Check if admin already exists (one-time registration only)
            const existingAdmin = getAdminByEmail(formData.email);
            if (existingAdmin) {
                showAdminMessage('An admin account with this email already exists. Registration is one-time only.', 'error');
                document.getElementById('adminEmail').focus();
                return false;
            }
            
            // Check city
            if (!formData.city || formData.city === '') {
                showAdminMessage('City is required', 'error');
                document.getElementById('adminCity').focus();
                return false;
            }
            
            return true;
        }
        
        // Generate admin digital ID (format: AD + 5 digits)
        function generateAdminDigitalID() {
            // Get existing admin IDs to ensure uniqueness
            const existingIDs = getExistingAdminDigitalIDs();
            let newID;
            let attempts = 0;
            const maxAttempts = 100;
            
            do {
                // Generate 5 random digits
                const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
                newID = 'AD' + randomDigits;
                attempts++;
                
                // Safety check to prevent infinite loop
                if (attempts >= maxAttempts) {
                    // Fallback: use timestamp-based ID
                    const timestamp = Date.now().toString().slice(-5);
                    newID = 'AD' + timestamp;
                    break;
                }
            } while (existingIDs.includes(newID));
            
            return newID;
        }
        
        // Get all existing admin digital IDs
        function getExistingAdminDigitalIDs() {
            const existingIDs = [];
            
            // Check all localStorage keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('admin_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data && data.adminDigitalID) {
                            existingIDs.push(data.adminDigitalID);
                        }
                    } catch (e) {
                        // Skip invalid entries
                        continue;
                    }
                }
            }
            
            return existingIDs;
        }
        
        // Generate admin password (8-12 characters with mix of letters, numbers, and symbols)
        function generateAdminPassword() {
            const length = 10; // 10 character password
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            const symbols = '!@#$%&*';
            const allChars = uppercase + lowercase + numbers + symbols;
            
            let password = '';
            
            // Ensure at least one character from each type
            password += uppercase[Math.floor(Math.random() * uppercase.length)];
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
            password += numbers[Math.floor(Math.random() * numbers.length)];
            password += symbols[Math.floor(Math.random() * symbols.length)];
            
            // Fill the rest randomly
            for (let i = password.length; i < length; i++) {
                password += allChars[Math.floor(Math.random() * allChars.length)];
            }
            
            // Shuffle the password
            return password.split('').sort(() => Math.random() - 0.5).join('');
        }
        
        // Get admin by email
        function getAdminByEmail(email) {
            const adminKey = 'admin_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const adminDataStr = localStorage.getItem(adminKey);
            
            if (adminDataStr) {
                try {
                    return JSON.parse(adminDataStr);
                } catch (e) {
                    return null;
                }
            }
            
            return null;
        }
        
        // Save admin to localStorage
        function saveAdminToLocalStorage(adminData) {
            // Save using email as key
            const adminKey = 'admin_' + adminData.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
            localStorage.setItem(adminKey, JSON.stringify(adminData));
            
            // Also maintain a list of all admin emails
            let adminList = JSON.parse(localStorage.getItem('admin_list') || '[]');
            if (!adminList.includes(adminData.email.toLowerCase())) {
                adminList.push(adminData.email.toLowerCase());
                localStorage.setItem('admin_list', JSON.stringify(adminList));
            }
            
            // Store mapping of Digital ID to email for quick lookup
            localStorage.setItem('adminDigitalID_' + adminData.adminDigitalID, adminData.email.toLowerCase());
        }
        
        // Show admin credentials
        function showAdminCredentials(adminDigitalID, password) {
            // Create credentials display
            const credentialsHTML = `
                <div class="credentials-container">
                    <h3 class="credentials-title">Registration Successful!</h3>
                    <div class="credentials-info">
                        <p class="credentials-label">Your Admin Digital ID:</p>
                        <p class="credentials-value" id="adminIDDisplay">${adminDigitalID}</p>
                        <p class="credentials-label">Your Password:</p>
                        <p class="credentials-value" id="adminPasswordDisplay">${password}</p>
                        <p class="credentials-warning">⚠️ Please save these credentials. You will need them to login.</p>
                    </div>
                </div>
            `;
            
            // Remove existing message if any
            const existingMessage = document.querySelector('.form-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = 'form-message form-message-success credentials-message';
            messageEl.innerHTML = credentialsHTML;
            
            // Insert before form
            adminRegisterForm.insertBefore(messageEl, adminRegisterForm.firstChild);
            
            // Add copy buttons functionality
            const adminIDDisplay = document.getElementById('adminIDDisplay');
            const adminPasswordDisplay = document.getElementById('adminPasswordDisplay');
            
            if (adminIDDisplay) {
                adminIDDisplay.style.cursor = 'pointer';
                adminIDDisplay.title = 'Click to copy';
                adminIDDisplay.addEventListener('click', function() {
                    copyToClipboard(adminDigitalID);
                    showCopyFeedback(adminIDDisplay, 'Copied!');
                });
            }
            
            if (adminPasswordDisplay) {
                adminPasswordDisplay.style.cursor = 'pointer';
                adminPasswordDisplay.title = 'Click to copy';
                adminPasswordDisplay.addEventListener('click', function() {
                    copyToClipboard(password);
                    showCopyFeedback(adminPasswordDisplay, 'Copied!');
                });
            }
        }
        
        // Copy to clipboard
        function copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    console.log('Copied to clipboard');
                }).catch(err => {
                    console.error('Failed to copy:', err);
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback copy failed:', err);
                }
                document.body.removeChild(textArea);
            }
        }
        
        // Show copy feedback
        function showCopyFeedback(element, message) {
            const originalText = element.textContent;
            element.textContent = message;
            element.style.color = '#00ff7f';
            
            setTimeout(() => {
                element.textContent = originalText;
                element.style.color = '';
            }, 2000);
        }
        
        // Show admin message
        function showAdminMessage(message, type) {
            // Remove existing message if any
            const existingMessage = document.querySelector('.form-message');
            if (existingMessage && !existingMessage.classList.contains('credentials-message')) {
                existingMessage.remove();
            }
            
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `form-message form-message-${type}`;
            messageEl.textContent = message;
            
            // Insert before form
            adminRegisterForm.insertBefore(messageEl, adminRegisterForm.firstChild);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
            
            // Scroll to message
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    // Admin Login Logic
    const adminLoginForm = document.getElementById('adminLoginForm');
    
    if (adminLoginForm) {
        // Auto-uppercase Admin ID as user types
        const adminIDInput = document.getElementById('adminID');
        if (adminIDInput) {
            adminIDInput.addEventListener('input', function(e) {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAdminLogin();
        });
        
        // Handle admin login
        function handleAdminLogin() {
            const adminID = document.getElementById('adminID').value.trim().toUpperCase();
            const password = document.getElementById('adminPassword').value;
            
            // Validate inputs
            if (!adminID || !password) {
                showAdminLoginMessage('Please fill in all fields', 'error');
                return;
            }
            
            // Validate Admin ID format (AD followed by 5 digits)
            const adminIDRegex = /^AD[0-9]{5}$/;
            if (!adminIDRegex.test(adminID)) {
                showAdminLoginMessage('Invalid Admin ID format. Format should be AD12345', 'error');
                document.getElementById('adminID').focus();
                return;
            }
            
            // Check if admin exists in localStorage
            const adminData = getAdminByDigitalID(adminID);
            
            if (!adminData) {
                showAdminLoginMessage('Invalid Admin ID. Please check your credentials.', 'error');
                document.getElementById('adminID').value = '';
                document.getElementById('adminPassword').value = '';
                document.getElementById('adminID').focus();
                return;
            }
            
            // Verify password
            if (adminData.password !== password) {
                showAdminLoginMessage('Invalid password. Please try again.', 'error');
                document.getElementById('adminPassword').value = '';
                document.getElementById('adminPassword').focus();
                return;
            }
            
            // Login successful
            showAdminLoginMessage('Login successful! Redirecting...', 'success');
            
            // Store current admin session
            sessionStorage.setItem('currentAdmin', JSON.stringify(adminData));
            
            // Redirect to admin dashboard after short delay
            setTimeout(() => {
                window.location.href = 'admin_dashboard.html';
            }, 1500);
        }
        
        // Get admin by Digital ID
        function getAdminByDigitalID(adminDigitalID) {
            // Method 1: Check using Digital ID mapping
            const emailFromID = localStorage.getItem('adminDigitalID_' + adminDigitalID);
            
            if (emailFromID) {
                // Found email via Digital ID, now get full admin data
                const adminKey = 'admin_' + emailFromID.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const adminDataStr = localStorage.getItem(adminKey);
                
                if (adminDataStr) {
                    try {
                        const adminData = JSON.parse(adminDataStr);
                        // Double-check Digital ID matches
                        if (adminData.adminDigitalID && adminData.adminDigitalID.toUpperCase() === adminDigitalID.toUpperCase()) {
                            return adminData;
                        }
                    } catch (e) {
                        console.error('Error parsing admin data:', e);
                    }
                }
            }
            
            // Method 2: Search through all admin entries (fallback)
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('admin_')) {
                    try {
                        const adminData = JSON.parse(localStorage.getItem(key));
                        if (adminData && adminData.adminDigitalID && 
                            adminData.adminDigitalID.toUpperCase() === adminDigitalID.toUpperCase()) {
                            return adminData;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            return null;
        }
        
        // Show admin login message
        function showAdminLoginMessage(message, type) {
            // Remove existing message if any
            const existingMessage = document.querySelector('.form-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `form-message form-message-${type}`;
            messageEl.textContent = message;
            
            // Insert before form
            adminLoginForm.insertBefore(messageEl, adminLoginForm.firstChild);
            
            // Auto remove after delay (or 3 seconds for success)
            const timeout = type === 'success' ? 3000 : 5000;
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, timeout);
            
            // Scroll to message
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    // Admin Dashboard Logic
    const touristSearchForm = document.getElementById('touristSearchForm');
    const touristDetailsContainer = document.getElementById('touristDetailsContainer');
    const noResultsMessage = document.getElementById('noResultsMessage');
    
    if (touristSearchForm) {
        // Auto-uppercase Tourist Digital ID as user types
        const touristDigitalIDInput = document.getElementById('touristDigitalID');
        if (touristDigitalIDInput) {
            touristDigitalIDInput.addEventListener('input', function(e) {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        
        touristSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleTouristSearch();
        });
        
        // Handle tourist search
        function handleTouristSearch() {
            const touristDigitalID = document.getElementById('touristDigitalID').value.trim().toUpperCase();
            
            // Validate input
            if (!touristDigitalID) {
                showDashboardMessage('Please enter a Tourist Digital ID', 'error');
                return;
            }
            
            // Validate format (YT + 5 digits)
            const digitalIDRegex = /^YT[0-9]{5}$/;
            if (!digitalIDRegex.test(touristDigitalID)) {
                showDashboardMessage('Invalid Digital ID format. Format should be YT12345', 'error');
                return;
            }
            
            // Get tourist data
            const touristData = getTouristByDigitalID(touristDigitalID);
            
            if (!touristData) {
                // Tourist not found
                touristDetailsContainer.style.display = 'none';
                noResultsMessage.style.display = 'block';
                return;
            }
            
            // Tourist found - display details
            displayTouristDetails(touristData, touristDigitalID);
            noResultsMessage.style.display = 'none';
            touristDetailsContainer.style.display = 'grid';
            
            // Auto-refresh location every 5 seconds
            const refreshInterval = setInterval(() => {
                const updatedTourist = getTouristByDigitalID(touristDigitalID);
                if (updatedTourist) {
                    displayTouristDetails(updatedTourist, touristDigitalID);
                } else {
                    clearInterval(refreshInterval);
                }
            }, 5000);
            
            // Store interval to clear on new search
            if (window.locationRefreshInterval) {
                clearInterval(window.locationRefreshInterval);
            }
            window.locationRefreshInterval = refreshInterval;
            
            // Scroll to details
            setTimeout(() => {
                touristDetailsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
        
        // Get tourist by Digital ID
        function getTouristByDigitalID(digitalID) {
            // Method 1: Check using Digital ID mapping
            const emailFromID = localStorage.getItem('digitalID_' + digitalID);
            
            if (emailFromID) {
                // Found email via Digital ID, now get full tourist data
                const touristKey = 'tourist_' + emailFromID.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const touristDataStr = localStorage.getItem(touristKey);
                
                if (touristDataStr) {
                    try {
                        const touristData = JSON.parse(touristDataStr);
                        // Double-check Digital ID matches
                        if (touristData.digitalID && touristData.digitalID.toUpperCase() === digitalID.toUpperCase()) {
                            return touristData;
                        }
                    } catch (e) {
                        console.error('Error parsing tourist data:', e);
                    }
                }
            }
            
            return null;
        }
        
        // Display tourist details
        function displayTouristDetails(touristData, digitalID) {
            // Display registered details
            document.getElementById('touristName').textContent = touristData.name || '-';
            document.getElementById('touristEmail').textContent = touristData.email || '-';
            document.getElementById('touristMobile').textContent = touristData.mobile || '-';
            document.getElementById('touristAge').textContent = touristData.age || '-';
            document.getElementById('touristGender').textContent = touristData.gender ? touristData.gender.charAt(0).toUpperCase() + touristData.gender.slice(1) : '-';
            document.getElementById('touristCity').textContent = touristData.city || '-';
            document.getElementById('touristAddress').textContent = touristData.address || '-';
            document.getElementById('touristDigitalIDDisplay').textContent = digitalID;
            
            // Setup Call Tourist button
            const callTouristBtn = document.getElementById('callTouristBtn');
            if (callTouristBtn && touristData.mobile) {
                // Format mobile number for tel: link
                let formattedMobile = touristData.mobile;
                if (touristData.mobile.length === 10 && !touristData.mobile.startsWith('+')) {
                    formattedMobile = '+91' + touristData.mobile; // India country code
                } else if (!touristData.mobile.startsWith('+')) {
                    formattedMobile = '+' + touristData.mobile;
                }
                
                callTouristBtn.href = `tel:${formattedMobile}`;
                callTouristBtn.title = `Call Tourist: ${touristData.mobile}`;
                callTouristBtn.style.display = 'inline-block';
            } else if (callTouristBtn) {
                callTouristBtn.style.display = 'none';
            }
            
            // Get live location
            const userEmail = touristData.email.toLowerCase();
            const currentLocationKey = 'currentLocation_' + userEmail.replace(/[^a-z0-9]/g, '_');
            const currentLocationStr = localStorage.getItem(currentLocationKey);
            
            if (currentLocationStr) {
                try {
                    const currentLocation = JSON.parse(currentLocationStr);
                    
                    // Display live location
                    document.getElementById('latitude').textContent = currentLocation.latitude ? currentLocation.latitude.toFixed(6) : '-';
                    document.getElementById('longitude').textContent = currentLocation.longitude ? currentLocation.longitude.toFixed(6) : '-';
                    document.getElementById('accuracy').textContent = currentLocation.accuracy ? Math.round(currentLocation.accuracy) + ' m' : '-';
                    
                    // Show place name if available
                    if (currentLocation.placeName) {
                        const placeNameEl = document.getElementById('placeName');
                        if (placeNameEl) {
                            placeNameEl.textContent = `Current Place: ${currentLocation.placeName}`;
                        }
                    }
                    
                    // Show geofence status if available
                    if (currentLocation.isWithinGeofence !== undefined) {
                        const geofenceItem = document.getElementById('geofenceItem');
                        const geofenceStatus = document.getElementById('geofenceStatus');
                        if (geofenceItem && geofenceStatus) {
                            geofenceItem.style.display = 'flex';
                            geofenceStatus.textContent = currentLocation.isWithinGeofence ? 'Within Geofence ✓' : 'Outside Geofence ⚠';
                            geofenceStatus.className = currentLocation.isWithinGeofence ? 'geofence-status in' : 'geofence-status out';
                        }
                    }
                    
                    // Show place name if available
                    if (currentLocation.placeName) {
                        const placeNameDisplay = document.getElementById('placeNameDisplay');
                        const placeNameEl = document.getElementById('placeName');
                        if (placeNameDisplay && placeNameEl) {
                            placeNameDisplay.style.display = 'block';
                            placeNameEl.textContent = `Current Place: ${currentLocation.placeName}`;
                        }
                    }
                    
                    // Update map link
                    if (currentLocation.latitude && currentLocation.longitude) {
                        const mapLink = document.getElementById('mapLink');
                        if (mapLink) {
                        mapLink.href = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
                        }
                    }
                    
                    // Display last updated time
                    if (currentLocation.lastSeenTime) {
                        const lastSeenDate = new Date(currentLocation.lastSeenTime);
                        document.getElementById('lastSeenTime').textContent = formatDateTime(lastSeenDate);
                        document.getElementById('lastSeenRelative').textContent = getRelativeTime(lastSeenDate);
                        
                        // Calculate and display time at location
                        const timeAtLocation = calculateTimeAtLocation(currentLocation);
                        document.getElementById('timeAtLocation').textContent = timeAtLocation.formatted;
                        document.getElementById('timeAtLocationDetails').textContent = timeAtLocation.details;
                    } else {
                        document.getElementById('lastSeenTime').textContent = '-';
                        document.getElementById('lastSeenRelative').textContent = '-';
                        document.getElementById('timeAtLocation').textContent = 'No data';
                        document.getElementById('timeAtLocationDetails').textContent = 'Location tracking not started';
                    }
                } catch (e) {
                    console.error('Error parsing location data:', e);
                    // Set defaults if error
                    document.getElementById('latitude').textContent = '-';
                    document.getElementById('longitude').textContent = '-';
                    document.getElementById('accuracy').textContent = '-';
                    document.getElementById('lastSeenTime').textContent = '-';
                    document.getElementById('lastSeenRelative').textContent = '-';
                    document.getElementById('timeAtLocation').textContent = '-';
                    document.getElementById('timeAtLocationDetails').textContent = '-';
                }
            } else {
                // No location data
                document.getElementById('latitude').textContent = 'No data';
                document.getElementById('longitude').textContent = 'No data';
                document.getElementById('accuracy').textContent = 'No data';
                document.getElementById('lastSeenTime').textContent = 'No data';
                document.getElementById('lastSeenRelative').textContent = 'Location not tracked';
                document.getElementById('timeAtLocation').textContent = 'No data';
                document.getElementById('timeAtLocationDetails').textContent = 'Location tracking not started';
            }
            
            // Get selected place from location data or sessionStorage
            let locationInfo = null;
            if (currentLocationStr) {
                try {
                    const currentLocation = JSON.parse(currentLocationStr);
                    if (currentLocation.location) {
                        locationInfo = currentLocation.location;
                    }
                } catch (e) {
                    console.error('Error parsing location:', e);
                }
            }
            
            if (!locationInfo) {
                const selectedLocationStr = sessionStorage.getItem('selectedLocation');
                if (selectedLocationStr) {
                    try {
                        locationInfo = JSON.parse(selectedLocationStr);
                    } catch (e) {
                        console.error('Error parsing selected location:', e);
                    }
                }
            }
            
            if (locationInfo) {
                document.getElementById('selectedCountry').textContent = locationInfo.country ? formatPlaceName(locationInfo.country) : '-';
                document.getElementById('selectedState').textContent = locationInfo.state ? formatPlaceName(locationInfo.state) : '-';
                document.getElementById('selectedCity').textContent = locationInfo.city ? formatPlaceName(locationInfo.city) : '-';
            } else {
                document.getElementById('selectedCountry').textContent = 'Not selected';
                document.getElementById('selectedState').textContent = 'Not selected';
                document.getElementById('selectedCity').textContent = 'Not selected';
            }
        }
        
        // Format date and time
        function formatDateTime(date) {
            const options = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            };
            return date.toLocaleString('en-US', options);
        }
        
        // Get relative time (e.g., "2 minutes ago")
        function getRelativeTime(date) {
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) {
                return 'Just now';
            } else if (diffMins < 60) {
                return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else if (diffDays < 7) {
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else {
                return formatDateTime(date);
            }
        }
        
        // Calculate time at location
        function calculateTimeAtLocation(locationData) {
            if (!locationData.journeyStartTime) {
                return {
                    formatted: 'Not started',
                    details: 'Journey has not been started'
                };
            }
            
            const startTime = new Date(locationData.journeyStartTime);
            const now = new Date();
            const diffMs = now - startTime;
            
            if (diffMs < 0) {
                return {
                    formatted: 'Invalid',
                    details: 'Start time is in the future'
                };
            }
            
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            let formatted = '';
            let details = '';
            
            if (diffDays > 0) {
                formatted = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
                const remainingHours = diffHours % 24;
                if (remainingHours > 0) {
                    formatted += ` ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
                }
                details = `Started: ${formatDateTime(startTime)}`;
            } else if (diffHours > 0) {
                formatted = `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                const remainingMins = diffMins % 60;
                if (remainingMins > 0) {
                    formatted += ` ${remainingMins} minute${remainingMins > 1 ? 's' : ''}`;
                }
                details = `Started: ${formatDateTime(startTime)}`;
            } else if (diffMins > 0) {
                formatted = `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
                const remainingSecs = diffSecs % 60;
                if (remainingSecs > 0) {
                    formatted += ` ${remainingSecs} second${remainingSecs > 1 ? 's' : ''}`;
                }
                details = `Started: ${formatDateTime(startTime)}`;
            } else {
                formatted = `${diffSecs} second${diffSecs > 1 ? 's' : ''}`;
                details = `Just started`;
            }
            
            return {
                formatted: formatted,
                details: details
            };
        }
        
        // Format place name (convert kebab-case to Title Case)
        function formatPlaceName(name) {
            if (!name) return '-';
            return name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        // Show dashboard message
        function showDashboardMessage(message, type) {
            // Remove existing message if any
            const existingMessage = document.querySelector('.dashboard-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `form-message form-message-${type} dashboard-message`;
            messageEl.textContent = message;
            
            // Insert before search form
            const searchCard = document.querySelector('.search-card');
            if (searchCard) {
                searchCard.insertBefore(messageEl, searchCard.firstChild);
            }
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
        }
    }
    
    // Category Click Handler
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            handleCategoryClick(category);
        });
    });
    
    function handleCategoryClick(category) {
        // Get selected location from sessionStorage
        const selectedLocationStr = sessionStorage.getItem('selectedLocation');
        
        if (!selectedLocationStr) {
            // Save the clicked category so we can continue after selecting location
            sessionStorage.setItem('pendingCategory', category);
            alert('Please select a location first from the dashboard. You will be redirected back to view places after selecting a city.');
            window.location.href = 'dashboard.html';
            return;
        }
        
        try {
            const selectedLocation = JSON.parse(selectedLocationStr);
            
            // Store selected category
            sessionStorage.setItem('selectedCategory', category);
            
            // Redirect to places page
            window.location.href = 'places.html';
        } catch (e) {
            console.error('Error parsing location:', e);
            alert('Error loading location. Please select a location again.');
            window.location.href = 'dashboard.html';
        }
    }
    
    // Places Display Logic
    const placesGrid = document.getElementById('placesGrid');
    const placesTitle = document.getElementById('placesTitle');
    const placesSubtitle = document.getElementById('placesSubtitle');
    const noPlacesMessage = document.getElementById('noPlacesMessage');
    
    if (placesGrid) {
        // Load places on page load
        loadPlaces();
        
        function loadPlaces() {
            // Get selected category and location
            const selectedCategory = sessionStorage.getItem('selectedCategory');
            const selectedLocationStr = sessionStorage.getItem('selectedLocation');
            
            if (!selectedCategory || !selectedLocationStr) {
                // Redirect to dashboard if no selection
                window.location.href = 'dashboard.html';
                return;
            }
            
            try {
                const selectedLocation = JSON.parse(selectedLocationStr);
                const city = selectedLocation.city;
                
                // Update title and subtitle
                const categoryName = formatCategoryName(selectedCategory);
                placesTitle.textContent = `${categoryName} in ${formatPlaceName(city)}`;
                placesSubtitle.textContent = `Discover amazing ${categoryName.toLowerCase()} in ${formatPlaceName(city)}`;
                
                // Get places for this category and city
                const places = getPlacesByCategoryAndCity(selectedCategory, city);
                
                if (places.length === 0) {
                    placesGrid.style.display = 'none';
                    noPlacesMessage.style.display = 'block';
                } else {
                    placesGrid.style.display = 'grid';
                    noPlacesMessage.style.display = 'none';
                    displayPlaces(places);
                }
            } catch (e) {
                console.error('Error loading places:', e);
                placesGrid.style.display = 'none';
                noPlacesMessage.style.display = 'block';
            }
        }
        
        function getPlacesByCategoryAndCity(category, city) {
            // Generate 2 places for each category for each city
            const cityKey = city.toLowerCase().replace(/\s+/g, '-');
            const cityName = city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            // Category-specific place templates
            const categoryTemplates = {
                'places': [
                    { name: `${cityName} City Center`, description: `Main city center area in ${cityName}`, openingTime: 'Open 24 hours', closingTime: 'Open 24 hours', safety: 'green' },
                    { name: `${cityName} Public Square`, description: `Popular public square in ${cityName}`, openingTime: '06:00 AM', closingTime: '10:00 PM', safety: 'green' }
                ],
                'temples': [
                    { name: `${cityName} Main Temple`, description: `Famous temple in ${cityName}`, openingTime: '05:00 AM', closingTime: '09:00 PM', safety: 'green' },
                    { name: `${cityName} Sacred Shrine`, description: `Historic shrine in ${cityName}`, openingTime: '06:00 AM', closingTime: '08:00 PM', safety: 'green' }
                ],
                'historical': [
                    { name: `${cityName} Historical Museum`, description: `Museum showcasing ${cityName}'s history`, openingTime: '09:00 AM', closingTime: '05:00 PM', safety: 'green' },
                    { name: `${cityName} Heritage Site`, description: `Important heritage site in ${cityName}`, openingTime: '08:00 AM', closingTime: '06:00 PM', safety: 'green' }
                ],
                'shopping': [
                    { name: `${cityName} Central Market`, description: `Main shopping market in ${cityName}`, openingTime: '09:00 AM', closingTime: '09:00 PM', safety: 'yellow' },
                    { name: `${cityName} Shopping Mall`, description: `Modern shopping mall in ${cityName}`, openingTime: '10:00 AM', closingTime: '10:00 PM', safety: 'green' }
                ],
                'old-town': [
                    { name: `${cityName} Old Quarter`, description: `Historic old town area in ${cityName}`, openingTime: 'Open 24 hours', closingTime: 'Open 24 hours', safety: 'green' },
                    { name: `${cityName} Heritage District`, description: `Preserved heritage district in ${cityName}`, openingTime: 'Open 24 hours', closingTime: 'Open 24 hours', safety: 'green' }
                ],
                'beach': [
                    { name: `${cityName} Beach`, description: `Popular beach in ${cityName}`, openingTime: 'Open 24 hours', closingTime: 'Open 24 hours', safety: 'yellow' },
                    { name: `${cityName} Coastal Park`, description: `Scenic coastal park in ${cityName}`, openingTime: '06:00 AM', closingTime: '08:00 PM', safety: 'green' }
                ],
                'airports': [
                    { name: `${cityName} International Airport`, description: `Main airport serving ${cityName}`, openingTime: 'Open 24 hours', closingTime: 'Open 24 hours', safety: 'green' },
                    { name: `${cityName} Regional Airport`, description: `Regional airport in ${cityName}`, openingTime: 'Open 24 hours', closingTime: 'Open 24 hours', safety: 'green' }
                ],
                'cafe-restro': [
                    { name: `${cityName} Central Cafe`, description: `Popular cafe in ${cityName}`, openingTime: '07:00 AM', closingTime: '11:00 PM', safety: 'green' },
                    { name: `${cityName} Fine Dining Restaurant`, description: `Upscale restaurant in ${cityName}`, openingTime: '12:00 PM', closingTime: '11:00 PM', safety: 'green' }
                ]
            };
            
            // Return 2 places for the category
            return categoryTemplates[category] || [];
        }
        
        function displayPlaces(places) {
            placesGrid.innerHTML = '';
            
            places.forEach((place, index) => {
                const placeCard = document.createElement('div');
                placeCard.className = 'glass-card place-item-card';
                placeCard.innerHTML = `
                    <div class="place-item-header">
                        <h3 class="place-item-name">${place.name}</h3>
                        <div class="safety-badge-small safety-${place.safety}">
                            <span class="safety-dot-small"></span>
                        </div>
                    </div>
                    <p class="place-item-description">${place.description}</p>
                    <div class="place-item-details">
                        <div class="place-detail-row">
                            <span class="place-detail-label">Opening:</span>
                            <span class="place-detail-value">${place.openingTime}</span>
                        </div>
                        <div class="place-detail-row">
                            <span class="place-detail-label">Closing:</span>
                            <span class="place-detail-value">${place.closingTime}</span>
                        </div>
                    </div>
                    <button class="btn-neon btn-card view-details-btn" onclick="viewPlaceDetails('${place.name}', '${place.description}', '${place.openingTime}', '${place.closingTime}', '${place.safety}')">
                        View Details
                    </button>
                `;
                placesGrid.appendChild(placeCard);
            });
        }
        
        function formatCategoryName(category) {
            const names = {
                'places': 'Places',
                'temples': 'Temples',
                'historical': 'Historical Sites',
                'shopping': 'Shopping',
                'old-town': 'Old Town',
                'beach': 'Beaches',
                'airports': 'Airports',
                'cafe-restro': 'Cafes & Restaurants'
            };
            return names[category] || category;
        }
        
        function formatPlaceName(name) {
            if (!name) return '-';
            return name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        // Global function to view place details
        window.viewPlaceDetails = function(name, description, openingTime, closingTime, safety) {
            // Store place details in sessionStorage
            sessionStorage.setItem('selectedPlace', JSON.stringify({
                name: name,
                description: description,
                openingTime: openingTime,
                closingTime: closingTime,
                safety: safety
            }));
            
            // Redirect to place details page
            window.location.href = 'place_details.html';
        }
    }
});

