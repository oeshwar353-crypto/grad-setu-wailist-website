const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxADIyI5xwdQnQbmMPhHsUfYyMgAUxia70tjLtxdHqNr99OXaRhoavTLGIr8i5Q2xdV/exec';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    let gasRes = null;
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      gasRes = await resp.json();
    } catch (postErr) {
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
    }

    if (gasRes) {
      return res.status(200).json(gasRes);
    } else {
      return res.status(200).json({ status: 'success', savedLocally: true });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

