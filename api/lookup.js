const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxADIyI5xwdQnQbmMPhHsUfYyMgAUxia70tjLtxdHqNr99OXaRhoavTLGIr8i5Q2xdV/exec';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const query = req.query.query || '';

  try {
    const resp = await fetch(`${APPS_SCRIPT_URL}?action=lookup&query=${encodeURIComponent(query)}`);
    const data = await resp.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ status: 'error', message: err.message });
  }
}

