chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateImage') {
      chrome.storage.sync.get(['apiKey'], async function(data) {
        const apiKey = data.apiKey;
        if (!apiKey) {
          sendResponse({ error: 'No API key found' });
          return;
        }
  
        try {
          const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              prompt: `Create a simple, clear diagram explaining: ${request.text}`,
              n: 1,
              size: '512x512',
              response_format: 'url'
            })
          });
  
          const data = await response.json();
          if (data.data && data.data[0].url) {
            sendResponse({ imageUrl: data.data[0].url });
          } else {
            sendResponse({ error: 'Failed to generate image' });
          }
        } catch (error) {
          sendResponse({ error: error.message });
        }
      });
      return true;
    }
  });