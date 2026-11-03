const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxADIyI5xwdQnQbmMPhHsUfYyMgAUxia70tjLtxdHqNr99OXaRhoavTLGIr8i5Q2xdV/exec';
const BASE_COUNT = 79;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

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
    return res.status(200).json({
      status: 'success',
      sheetRows: rows,
      totalCount: BASE_COUNT + rows,
      baseCount: BASE_COUNT
    });
  } catch (err) {
    return res.status(200).json({
      status: 'fallback',
      sheetRows: 0,
      totalCount: BASE_COUNT,
      baseCount: BASE_COUNT
    });
  }
}
