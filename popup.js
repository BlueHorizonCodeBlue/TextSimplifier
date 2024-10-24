document.addEventListener('DOMContentLoaded', function() {
    const simplifyToggle = document.getElementById('simplifyToggle');
    const simplificationLevel = document.getElementById('simplificationLevel');
    const simplificationLevelValue = document.getElementById('simplificationLevelValue');
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
  
    const levelLabels = {
      '1': 'Basic',
      '2': 'Medium',
      '3': 'Advanced'
    };
  
    // Load saved settings
    chrome.storage.sync.get(['enabled', 'simplificationLevel', 'apiKey'], function(data) {
      simplifyToggle.checked = data.enabled || false;
      simplificationLevel.value = data.simplificationLevel || 2;
      apiKeyInput.value = data.apiKey || '';
      updateValues();
    });
  
    function updateValues() {
      simplificationLevelValue.textContent = levelLabels[simplificationLevel.value];
    }
  
    function sendSettings() {
        chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
            if (!tabs[0]?.id) {
                console.error('No active tab found');
                return;
            }
            
            try {
                // Inject the content script first
                await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                });
                
                // Then send the message
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggle',
                    enabled: simplifyToggle.checked,
                    simplificationLevel: parseInt(simplificationLevel.value)
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('Message sending failed:', chrome.runtime.lastError.message);
                        return;
                    }
                    console.log('Settings applied:', response);
                });
            } catch (error) {
                console.error('Failed to inject content script:', error);
            }
        });
    }
  
    // Save API Key
    saveApiKeyButton.addEventListener('click', function() {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        alert('Please enter an API key');
        return;
      }
      
      // Test the API key before saving
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{role: "user", content: "test"}],
          temperature: 0.7
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Invalid API key');
        }
        return response.json();
      })
      .then(() => {
        chrome.storage.sync.set({ apiKey }, function() {
          alert('API key verified and saved successfully!');
          sendSettings(); // Try to apply settings immediately
        });
      })
      .catch(error => {
        alert('Error validating API key: ' + error.message);
      });
    });
  
    // Add these after your saveApiKeyButton event listener
    
    // Toggle simplification
    simplifyToggle.addEventListener('change', function() {
        chrome.storage.sync.set({ enabled: this.checked }, () => {
            sendSettings();
        });
    });

    // Change simplification level
    simplificationLevel.addEventListener('input', function() {
        updateValues();
        chrome.storage.sync.set({ simplificationLevel: this.value }, () => {
            sendSettings();
        });
    });

    apiKeyInput.addEventListener('input', function() {
      chrome.storage.sync.set({ apiKey: this.value });
      console.log('API key saved');
    });
  });  // Add this closing parenthesis
