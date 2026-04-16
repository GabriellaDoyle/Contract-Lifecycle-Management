const axios = require('axios');
const qs = require('querystring');
const llmConfig = require('../utils/llmConfig.json');

let cachedAccessToken = null;
let tokenExpiryTime = null;

async function getLLMAccessToken() {
    const now = Date.now();

    // Check if we have a cached token and if it's still valid (with 1 minute buffer)
    if (cachedAccessToken && tokenExpiryTime && tokenExpiryTime > now + 60000) {
        return cachedAccessToken;
    }

    console.log("Fetching new LLM access token...");

    const data = { grant_type: 'client_credentials' };
    const options = {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        auth: {
            username: llmConfig.LLM_clientId,
            password: llmConfig.LLM_clientSecret,
        },
        data: qs.stringify(data),
        url: llmConfig.LLM_tokenUrl,
    };

    try {
        const response = await axios.request(options);
        const accessToken = response.data.access_token;
        const expiresInSeconds = response.data.expires_in;

        cachedAccessToken = accessToken;
        tokenExpiryTime = now + (expiresInSeconds * 1000);

        console.log("LLM access token obtained successfully");
        return accessToken;

    } catch (err) {
        console.error("Error fetching LLM access token:", err.message);
        throw new Error("Failed to retrieve LLM access token: " + err.message);
    }
}

module.exports = { getLLMAccessToken };
