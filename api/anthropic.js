const https = require('https');
const zlib  = require('zlib');
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, Authorization',
};
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405, CORS); res.end('Method Not Allowed'); return; }
  const body = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
  const fwd = {
    'content-type': 'application/json',
    'accept-encoding': 'identity',
    'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
    'content-length': body.length,
  };
  if (req.headers['x-api-key'])     fwd['x-api-key']    = req.headers['x-api-key'];
  if (req.headers['authorization']) fwd['authorization'] = req.headers['authorization'];
  return new Promise((resolve) => {
    const pr = https.request({ hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST', headers: fwd }, pr2 => {
      const chunks2 = [];
      pr2.on('data', c => chunks2.push(c));
      pr2.on('end', () => {
        const raw = Buffer.concat(chunks2);
        const enc = pr2.headers['content-encoding'];
        const send = (data) => { res.writeHead(pr2.statusCode, { ...CORS, 'content-type': 'application/json' }); res.end(data); resolve(); };
        if      (enc === 'gzip')    zlib.gunzip(raw,           (e, d) => send(e ? raw : d));
        else if (enc === 'br')      zlib.brotliDecompress(raw, (e, d) => send(e ? raw : d));
        else if (enc === 'deflate') zlib.inflate(raw,          (e, d) => send(e ? raw : d));
        else send(raw);
      });
    });
    pr.on('error', e => { res.writeHead(502, CORS); res.end(JSON.stringify({ error: e.message })); resolve(); });
    pr.write(body); pr.end();
  });
}
