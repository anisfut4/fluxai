const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gemini-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const RAILWAY_URL = 'https://fluxai-proxy-production.up.railway.app/api/gpt-image';
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405, CORS); res.end('Method Not Allowed'); return; }
  const authHeader = req.headers['authorization'] || 'Bearer none';
  const geminiKey  = req.headers['x-gemini-key'] || '';
  const body = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
  const fwd = { 'Content-Type': 'application/json', 'Authorization': authHeader };
  if (geminiKey) fwd['X-Gemini-Key'] = geminiKey;
  try {
    const response = await fetch(RAILWAY_URL, { method: 'POST', headers: fwd, body, signal: AbortSignal.timeout(180000) });
    const data = await response.text();
    res.writeHead(response.status, { ...CORS, 'Content-Type': 'application/json' });
    res.end(data);
  } catch (err) {
    res.writeHead(502, CORS);
    res.end(JSON.stringify({ error: err.message }));
  }
};
