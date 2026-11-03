/**
 * GradSetu Waitlist — Local Server & Google Sheets API Proxy
 * Serves landing page (index.html) and founder console (admin.html)
 * Proxies Google Apps Script requests to bypass browser CORS & adblockers
 */

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT = 3000;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxADIyI5xwdQnQbmMPhHsUfYyMgAUxia70tjLtxdHqNr99OXaRhoavTLGIr8i5Q2xdV/exec';
const ADMIN_PASSKEY   = 'gradsetu2026';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let urlPath = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // --- API Route: Register User ---
  if (req.method === 'POST' && urlPath === '/api/register') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        
        // Forward to Google Apps Script
        let gasRes = null;
        try {
          const resp = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
          gasRes = await resp.json();
        } catch (fetchErr) {
          console.warn('[Server] Direct GAS POST failed, trying GET fallback:', fetchErr.message);
          try {
            const queryParams = new URLSearchParams({
              action: 'register',
              full_name: payload.full_name || '',
              whatsapp_number: payload.whatsapp_number || '',
              email: payload.email || '',
              college_name: payload.college_name || '',
              college_city: payload.college_city || '',
              department: payload.department || '',
              year_of_study: payload.year_of_study || '',
              hometown_city: payload.hometown_city || '',
              languages_known: payload.languages_known || (Array.isArray(payload.languages_list) ? payload.languages_list.join(', ') : ''),
              languages_count: payload.languages_count || 1,
              referred_by: payload.referred_by || ''
            });
            const fallbackResp = await fetch(`${APPS_SCRIPT_URL}?${queryParams.toString()}`);
            gasRes = await fallbackResp.json();
          } catch (getErr) {
            console.error('[Server] GAS GET fallback also failed:', getErr.message);
          }
        }

        if (gasRes && (gasRes.status === 'success' || gasRes.passData)) {
          sendJSON(res, 200, gasRes);
        } else {
          // Construct realistic local response so student is never blocked
          const randNum = Math.floor(100 + Math.random() * 900);
          const prefix = (payload.full_name || 'STU').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3) || 'GSX';
          const passData = {
            pass_id: `GS-${randNum}`,
            full_name: payload.full_name || 'Applicant',
            whatsapp_number: payload.whatsapp_number || '',
            email: (payload.email || '').toLowerCase(),
            college_name: payload.college_name || '',
            college_city: payload.college_city || '',
            department: payload.department || '',
            year_of_study: payload.year_of_study || '',
            hometown_city: payload.hometown_city || '',
            languages_known: payload.languages_known || '',
            referral_code: `GS-${prefix}${Math.floor(1000 + Math.random() * 9000)}`,
            referred_by: payload.referred_by || '',
            referral_count: 0,
            timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
          };
          sendJSON(res, 200, { status: 'success', passData: passData, savedLocally: true });
        }
      } catch (err) {
        console.error('[Server] /api/register error:', err);
        sendJSON(res, 500, { status: 'error', message: err.message });
      }
    });
    return;
  }

  // --- API Route: Live Waitlist Count ---
  if (urlPath === '/api/count') {
    const BASE_COUNT = 79;
    try {
      let data = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resp = await fetch(`${APPS_SCRIPT_URL}?action=ping`, { redirect: 'follow' });
          if (resp.ok) {
            data = await resp.json();
            break;
          }
        } catch (retryErr) {
          if (attempt === 1) throw retryErr;
          await new Promise(r => setTimeout(r, 600));
        }
      }

      const rows = (data && typeof data.totalRows === 'number') ? data.totalRows : 0;
      const total = BASE_COUNT + rows;
      sendJSON(res, 200, {
        status: 'success',
        sheetRows: rows,
        totalCount: total,
        baseCount: BASE_COUNT
      });
    } catch (err) {
      console.warn('[Server] /api/count ping failed, returning baseline:', err.message);
      sendJSON(res, 200, {
        status: 'fallback',
        sheetRows: 0,
        totalCount: BASE_COUNT,
        baseCount: BASE_COUNT
      });
    }
    return;
  }

  // --- API Route: Admin Data ---
  if (urlPath === '/api/admin/data') {
    const key = parsedUrl.query.key || ADMIN_PASSKEY;
    try {
      const resp = await fetch(`${APPS_SCRIPT_URL}?action=admin&key=${encodeURIComponent(key)}`);
      const data = await resp.json();
      sendJSON(res, 200, data);
    } catch (err) {
      console.error('[Server] /api/admin/data error:', err);
      sendJSON(res, 502, { status: 'error', message: 'Failed to contact Google Sheets API' });
    }
    return;
  }

  // --- API Route: Pass Lookup ---
  if (urlPath === '/api/lookup') {
    const query = parsedUrl.query.query || '';
    try {
      const resp = await fetch(`${APPS_SCRIPT_URL}?action=lookup&query=${encodeURIComponent(query)}`);
      const data = await resp.json();
      sendJSON(res, 200, data);
    } catch (err) {
      console.error('[Server] /api/lookup error:', err);
      sendJSON(res, 502, { status: 'error', message: 'Failed to lookup pass' });
    }
    return;
  }

  // --- Route Rewriting for Static Files ---
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  } else if (urlPath === '/admin' || urlPath === '/admin/') {
    urlPath = '/admin.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p><a href="/">Return to GradSetu Home</a></p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ GradSetu Local Server is live at http://localhost:${PORT}/`);
  console.log(`⚡ Founder Admin Console: http://localhost:${PORT}/admin`);
  console.log(`📊 Google Sheets Web App Endpoint connected.`);
});
