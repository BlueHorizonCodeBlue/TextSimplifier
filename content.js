// Add at the start of content.js
console.log('Content script loaded');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded in content script');
    // Check for stored settings
    chrome.storage.sync.get(['enabled', 'simplificationLevel'], function(data) {
        if (data.enabled) {
            applyTextSimplification(true, {
                level: data.simplificationLevel || 2
            });
        }
    });
});

let originalText = new Map();
let isProcessing = false;

async function simplifyText(text, level) {
  console.log('Starting simplification...');
  try {
    const data = await chrome.storage.sync.get(['apiKey']);
    if (chrome.runtime.lastError) {
      throw new Error('Failed to get API key: ' + chrome.runtime.lastError.message);
    }
    
    const apiKey = data.apiKey;
    if (!apiKey) {
      console.error('No API key provided');
      return text;
    }
    
    const prompt = `Simplify the following text to a ${level === 1 ? 'basic' : level === 2 ? 'moderate' : 'very simple'} reading level, maintaining the key information: ${text}`;
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "user",
            content: prompt
          }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (!response.ok) {
          console.error('API Error:', data);
          throw new Error(data.error?.message || 'API request failed');
      }
      console.log('Simplified text received');
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Simplification failed:', error);
      return text;
    }
  } catch (error) {
    console.error('Failed to get API key:', error);
    return text;
  }
}  // Close simplifyText function

async function applyTextSimplification(enabled, settings = {}) {
    console.log('applyTextSimplification called:', { enabled, settings });
    if (isProcessing) {
        console.log('Already processing, skipping');
        return;
    }
    isProcessing = true;
    
    console.log('Applying text simplification:', { enabled, settings });
    if (!settings.level) {
        console.error('No simplification level provided');
        isProcessing = false;
        return;
    }
    
    try {
        const paragraphs = document.querySelectorAll('p');
        console.log('Found paragraphs:', paragraphs.length);
        
        if (paragraphs.length === 0) {
            console.log('No paragraphs found on page');
            return;
        }
        
        for (const paragraph of paragraphs) {
            if (enabled) {
                if (!originalText.has(paragraph)) {
                    originalText.set(paragraph, paragraph.textContent);
                    paragraph.classList.add('simplifying');
                    const simplifiedText = await simplifyText(paragraph.textContent, settings.level);
                    paragraph.textContent = simplifiedText;
                    paragraph.classList.remove('simplifying');
                    paragraph.classList.add('simplified-text');
                }
            } else {
                const original = originalText.get(paragraph);
                if (original) {
                    paragraph.textContent = original;
                    paragraph.classList.remove('simplified-text', 'simplifying');
                }
            }
        }
    } catch (error) {
        console.error('Error during text simplification:', error);
    } finally {
        isProcessing = false;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (chrome.runtime.lastError) {
        console.error('Extension context invalid:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return true;
    }

    console.log('Message received:', request);
    
    if (request.action === 'toggle') {
        applyTextSimplification(request.enabled, {
            level: request.simplificationLevel
        }).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;  // Keep the message channel open for async response
    }

    sendResponse({ success: true });
    return true;
});

// Check for stored settings on page load
try {
    chrome.storage.sync.get(['enabled', 'simplificationLevel'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Storage error:', chrome.runtime.lastError);
            return;
        }
        
        if (data.enabled) {
            applyTextSimplification(true, {
                level: data.simplificationLevel
            }).catch(error => {
                console.error('Failed to apply simplification:', error);
            });
        }
    });
} catch (error) {
    console.error('Failed to access storage:', error);
}
