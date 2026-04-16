const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // serve contractiq.html

// ── Config (from ai-core-service-key.json) ─────────────────────
const config = {
  clientId:     'sb-2fc43eae-c941-47a9-b523-644716487e45!b88862|xsuaa_std!b77089',
  clientSecret: '9d9ca943-e96a-4eb2-a6c0-467b513d1d10$sm8_cVmSEqgm19t7B4lhSgGOiCp-oVeERp01wR6uAg0=',
  tokenUrl:     'https://cf-uki-innovation-lab-eb1in1ep.authentication.sap.hana.ondemand.com/oauth/token',
  models: {
    pro:   'https://api.ai.internalprod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/dda75dcb815ee217/models/gemini-2.5-pro:generateContent',
    flash: 'https://api.ai.internalprod.eu-central-1.aws.ml.hana.ondemand.com/v2/inference/deployments/dbb5bc3a2b51f7ea/models/gemini-2.5-flash:generateContent',
  }
};

// ── Token cache ────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiry = null;

async function getToken() {
  if (cachedToken && tokenExpiry && tokenExpiry > Date.now() + 60000) {
    return cachedToken;
  }
  console.log('Fetching new SAP AI Core access token…');
  const res = await axios.post(
    config.tokenUrl,
    qs.stringify({ grant_type: 'client_credentials' }),
    {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      auth: { username: config.clientId, password: config.clientSecret }
    }
  );
  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + res.data.expires_in * 1000;
  console.log('Token obtained, expires in', res.data.expires_in, 's');
  return cachedToken;
}

// ── POST /api/llm ──────────────────────────────────────────────
// Body: { systemPrompt, userMessage, model? ('pro'|'flash'), json?: true }
app.post('/api/llm', async (req, res) => {
  const { systemPrompt, userMessage, model = 'flash', json = false } = req.body;

  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ error: 'systemPrompt and userMessage are required' });
  }

  try {
    const token = await getToken();
    const url = config.models[model] || config.models.flash;

    const payload = {
      contents: [
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      systemInstruction: {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.4,
        responseMimeType: json ? 'application/json' : 'text/plain'
      }
    };

    console.log(`→ LLM (${model}): ${userMessage.slice(0, 80)}…`);

    const llmRes = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'AI-Resource-Group': 'default',
        'Authorization': `Bearer ${token}`
      },
      timeout: 60000
    });

    const text = llmRes.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log(`← LLM replied (${text.length} chars)`);
    res.json({ result: text });

  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('LLM error:', detail);
    res.status(500).json({ error: 'LLM call failed', detail });
  }
});

// ── Start ──────────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\nSAP ContractIQ server running at http://localhost:${PORT}`);
  console.log('Open http://localhost:3000/contractiq.html in your browser\n');
});
