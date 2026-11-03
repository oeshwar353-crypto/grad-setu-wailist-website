/**
 * ============================================================
 * GRADSETU — GOOGLE SHEETS REAL-TIME SYNC SERVICE
 * ============================================================
 * Handles bidirectional synchronization between the client,
 * Google Sheets (via Local Server Proxy or Apps Script Web App),
 * and LocalStorage cache.
 */

// Storage keys
const STORAGE_USERS_KEY = 'gs_waitlist_users';
const STORAGE_URL_KEY   = 'gs_google_sheets_url';
const STORAGE_PASSKEY   = 'gs_admin_passkey';
const DEFAULT_PASSKEY   = 'gradsetu2026';
const CLIENT_API_SECRET = 'gs_sec_launch_nov2026_gradsetu';
const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxADIyI5xwdQnQbmMPhHsUfYyMgAUxia70tjLtxdHqNr99OXaRhoavTLGIr8i5Q2xdV/exec';

// Initial realistic baseline seeds (if user opens admin before any registrations)
const INITIAL_SEED_USERS = [
  {
    timestamp: '30/10/2026, 04:15:20 PM IST',
    pass_id: 'GS-101',
    full_name: 'Aarav Sharma',
    whatsapp_number: '9820123456',
    email: 'aarav.sharma@iitb.ac.in',
    college_name: 'Indian Institute of Technology (IIT) Bombay',
    college_city: 'Mumbai, Maharashtra',
    department: 'CSE / Computer Science',
    year_of_study: '3rd Year',
    hometown_city: 'Indore, Madhya Pradesh',
    languages_known: 'English, Hindi, Marathi',
    languages_count: 3,
    referral_code: 'GS-AAR9124',
    referred_by: '',
    referral_count: 4
  },
  {
    timestamp: '30/10/2026, 05:40:12 PM IST',
    pass_id: 'GS-102',
    full_name: 'Ananya Deshmukh',
    whatsapp_number: '9765432109',
    email: 'ananya.deshmukh@coep.ac.in',
    college_name: 'COEP Technological University',
    college_city: 'Pune, Maharashtra',
    department: 'CSE (AI & ML / Data Science)',
    year_of_study: '2nd Year',
    hometown_city: 'Dhule, Maharashtra',
    languages_known: 'English, Hindi, Marathi, Gujarati',
    languages_count: 4,
    referral_code: 'GS-ANA5821',
    referred_by: 'GS-AAR9124',
    referral_count: 2
  },
  {
    timestamp: '30/10/2026, 07:11:05 PM IST',
    pass_id: 'GS-103',
    full_name: 'Rohan Mehta',
    whatsapp_number: '9988776655',
    email: 'rohan.m@bits-pilani.ac.in',
    college_name: 'BITS Pilani',
    college_city: 'Pilani, Rajasthan',
    department: 'Information Technology (IT)',
    year_of_study: '4th Year',
    hometown_city: 'Ahmedabad, Gujarat',
    languages_known: 'English, Hindi, Gujarati, Marwari',
    languages_count: 4,
    referral_code: 'GS-ROH3104',
    referred_by: 'GS-AAR9124',
    referral_count: 1
  },
  {
    timestamp: '30/10/2026, 08:35:48 PM IST',
    pass_id: 'GS-104',
    full_name: 'Sneha Iyer',
    whatsapp_number: '9443218765',
    email: 'sneha.iyer@vit.ac.in',
    college_name: 'Vellore Institute of Technology (VIT)',
    college_city: 'Vellore, Tamil Nadu',
    department: 'ECE / Electronics',
    year_of_study: '3rd Year',
    hometown_city: 'Bengaluru, Karnataka',
    languages_known: 'English, Tamil, Kannada, Hindi',
    languages_count: 4,
    referral_code: 'GS-SNE4410',
    referred_by: '',
    referral_count: 3
  },
  {
    timestamp: '30/10/2026, 09:22:19 PM IST',
    pass_id: 'GS-105',
    full_name: 'Kabir Verma',
    whatsapp_number: '9811223344',
    email: 'kabir.verma@dtu.ac.in',
    college_name: 'Delhi Technological University (DTU)',
    college_city: 'New Delhi, Delhi',
    department: 'Mechanical / Civil / Core',
    year_of_study: '1st Year',
    hometown_city: 'Chandigarh, Punjab',
    languages_known: 'English, Hindi, Punjabi',
    languages_count: 3,
    referral_code: 'GS-KAB7732',
    referred_by: 'GS-SNE4410',
    referral_count: 0
  }
];

class GoogleSheetsService {
  constructor() {
    this._initStorage();
  }

  _initStorage() {
    try {
      if (typeof localStorage !== 'undefined' && !localStorage.getItem(STORAGE_USERS_KEY)) {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_SEED_USERS));
      }
    } catch (e) {
      console.warn('LocalStorage not available:', e);
    }
  }

  getWebAppUrl() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_URL_KEY)) || 
             (typeof window !== 'undefined' && window.__GOOGLE_SHEETS_WEBAPP_URL__) || 
             DEFAULT_SHEETS_URL;
    } catch {
      return DEFAULT_SHEETS_URL;
    }
  }

  setWebAppUrl(url) {
    try {
      if (url) {
        localStorage.setItem(STORAGE_URL_KEY, url.trim());
      } else {
        localStorage.removeItem(STORAGE_URL_KEY);
      }
    } catch (e) {}
  }

  getAdminPasskey() {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_PASSKEY)) || DEFAULT_PASSKEY;
    } catch {
      return DEFAULT_PASSKEY;
    }
  }

  setAdminPasskey(key) {
    try {
      if (key) {
        localStorage.setItem(STORAGE_PASSKEY, key.trim());
      }
    } catch (e) {}
  }

  getLocalUsers() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  saveLocalUsers(users) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(Array.isArray(users) ? users : []));
      }
    } catch (e) {}
  }

  clearLocalUsers() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_USERS_KEY);
        this._initStorage();
      }
    } catch (e) {}
  }

  _getNextPassId(localUsers) {
    var baseNum = 101 + (Array.isArray(localUsers) ? localUsers.length : 0);
    return 'GS-' + baseNum;
  }

  _generateRefCode(name) {
    var prefix = String(name || 'STU').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 3);
    if (prefix.length < 3) prefix = 'GSX';
    var rand = Math.floor(1000 + Math.random() * 9000);
    return 'GS-' + prefix + rand;
  }

  _getISTTimestamp() {
    var now = new Date();
    try {
      var d = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
      var t = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      return d + ', ' + t + ' IST';
    } catch (e) {
      return now.toISOString();
    }
  }

  /**
   * Submit registration to Google Sheets (via Server Proxy + Direct Apps Script + LocalStorage Cache)
   */
  async registerUser(formData) {
    var fullName = String(formData.full_name || '').trim();
    var email    = String(formData.email || '').trim().toLowerCase();
    var whatsapp = String(formData.whatsapp_number || '').trim();
    var cleanPhone = whatsapp.replace(/[^0-9]/g, '').slice(-10);

    var languagesList = Array.isArray(formData.languages_list)
      ? formData.languages_list.join(', ')
      : String(formData.languages_known || '');

    var languagesCount = Number(formData.languages_count) || 
      (languagesList ? languagesList.split(',').length : 1);

    var payload = {
      secret: CLIENT_API_SECRET,
      full_name: fullName,
      whatsapp_number: whatsapp,
      email: email,
      college_name: String(formData.college_name || '').trim(),
      college_city: String(formData.college_city || '').trim(),
      department: String(formData.department || '').trim(),
      year_of_study: String(formData.year_of_study || '').trim(),
      hometown_city: String(formData.hometown_city || '').trim(),
      languages_known: languagesList,
      languages_count: languagesCount,
      referred_by: String(formData.referred_by || formData.referred_by_code || '').trim()
    };

    // 1. Check local storage duplicate safely
    var localUsers = this.getLocalUsers();
    var existingIdx = -1;

    try {
      existingIdx = localUsers.findIndex(function(u) {
        if (!u) return false;
        var uPhone = String(u.whatsapp_number != null ? u.whatsapp_number : '').replace(/[^0-9]/g, '').slice(-10);
        var uEmail = String(u.email || '').trim().toLowerCase();
        return (email && uEmail === email) || (cleanPhone && uPhone === cleanPhone);
      });
    } catch (findErr) {
      console.warn('Error during findIndex:', findErr);
    }

    var passId    = (existingIdx > -1) ? localUsers[existingIdx].pass_id : this._getNextPassId(localUsers);
    var refCode   = (existingIdx > -1) ? localUsers[existingIdx].referral_code : this._generateRefCode(fullName);
    var timestamp = this._getISTTimestamp();

    var userRecord = {
      timestamp: timestamp,
      pass_id: passId,
      full_name: fullName,
      whatsapp_number: whatsapp,
      email: email,
      college_name: payload.college_name,
      college_city: payload.college_city,
      department: payload.department,
      year_of_study: payload.year_of_study,
      hometown_city: payload.hometown_city,
      languages_known: languagesList,
      languages_count: languagesCount,
      referral_code: refCode,
      referred_by: payload.referred_by,
      referral_count: (existingIdx > -1) ? (Number(localUsers[existingIdx].referral_count) || 0) : 0
    };

    // Save into local cache first so pass is immediately guaranteed
    if (existingIdx > -1) {
      localUsers[existingIdx] = userRecord;
    } else {
      localUsers.unshift(userRecord);
    }
    this.saveLocalUsers(localUsers);

    // 2. Dispatch to Server Proxy (/api/register) or Google Apps Script directly
    let syncedWithSheets = false;
    let serverPassData = null;

    try {
      // Step 2A: Try server proxy (best path, bypasses browser CORS & adblock)
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
      const proxyResp = await fetch(origin + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (proxyResp.ok) {
        const json = await proxyResp.json();
        if (json.status === 'success' || json.passData) {
          syncedWithSheets = true;
          if (json.passData) {
            serverPassData = json.passData;
            // Update userRecord with exact server values
            if (serverPassData.pass_id) userRecord.pass_id = serverPassData.pass_id;
            if (serverPassData.referral_code) userRecord.referral_code = serverPassData.referral_code;
            if (serverPassData.timestamp) userRecord.timestamp = serverPassData.timestamp;
            this._mirrorToLocal(userRecord);
          }
        }
      }
    } catch (proxyErr) {
      console.warn('Local proxy /api/register failed or not found, trying direct Apps Script:', proxyErr.message);

      // Step 2B: Direct Google Apps Script fallback
      const webAppUrl = this.getWebAppUrl();
      if (webAppUrl && webAppUrl.startsWith('https://script.google.com')) {
        try {
          fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          }).catch(() => {});

          const getParams = new URLSearchParams({
            action: 'register',
            full_name: payload.full_name,
            whatsapp_number: payload.whatsapp_number,
            email: payload.email,
            college_name: payload.college_name,
            college_city: payload.college_city,
            department: payload.department,
            year_of_study: payload.year_of_study,
            hometown_city: payload.hometown_city,
            languages_known: payload.languages_known,
            languages_count: payload.languages_count,
            referred_by: payload.referred_by
          });
          const getUrl = webAppUrl + (webAppUrl.indexOf('?') === -1 ? '?' : '&') + getParams.toString();
          fetch(getUrl, { mode: 'no-cors' }).catch(() => {});
        } catch (gasErr) {
          console.warn('Direct GAS sync failed:', gasErr);
        }
      }
    }

    return {
      data: userRecord,
      isDuplicate: existingIdx > -1,
      syncedWithSheets: syncedWithSheets,
      error: null
    };
  }

  _mirrorToLocal(passData) {
    if (!passData) return;
    var users = this.getLocalUsers();
    var idx = users.findIndex(function(u) {
      if (!u) return false;
      return (passData.pass_id && u.pass_id === passData.pass_id) || 
             (passData.email && u.email && u.email.toLowerCase() === passData.email.toLowerCase());
    });

    if (idx > -1) {
      users[idx] = { ...users[idx], ...passData };
    } else {
      users.unshift(passData);
    }
    this.saveLocalUsers(users);
  }

  /**
   * Fetch Live Waitlist Count (79 baseline + Google Sheets registrations)
   */
  async getLiveWaitlistCount() {
    const baseCount = 79;

    // 1. Try server proxy /api/count first (works on localhost & Vercel)
    try {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
      const resp = await fetch(`${origin}/api/count`);
      if (resp.ok) {
        const json = await resp.json();
        if (typeof json.totalCount === 'number') {
          const count = Math.max(baseCount, json.totalCount);
          try { localStorage.setItem('gs_cached_count', count); } catch (e) {}
          return count;
        }
        if (typeof json.sheetRows === 'number') {
          const count = baseCount + json.sheetRows;
          try { localStorage.setItem('gs_cached_count', count); } catch (e) {}
          return count;
        }
      }
    } catch (proxyErr) {}

    // 2. Direct Google Apps Script ping fallback
    const webAppUrl = this.getWebAppUrl();
    if (webAppUrl && webAppUrl.startsWith('https://script.google.com')) {
      try {
        const pingUrl = webAppUrl + (webAppUrl.indexOf('?') === -1 ? '?' : '&') + 'action=ping';
        const res = await fetch(pingUrl);
        if (res.ok) {
          const json = await res.json();
          if (typeof json.totalRows === 'number') {
            const count = baseCount + json.totalRows;
            try { localStorage.setItem('gs_cached_count', count); } catch (e) {}
            return count;
          }
        }
      } catch (gasErr) {}
    }

    // 3. Fallback: cached count or baseline (always >= 79)
    try {
      const cached = localStorage.getItem('gs_cached_count');
      if (cached && !isNaN(Number(cached))) {
        return Math.max(baseCount, Number(cached));
      }
    } catch (e) {}

    return baseCount;
  }

  /**
   * Lookup Pass for returning user (by Email or WhatsApp)
   */
  async lookupUser(query) {
    var q = String(query || '').trim().toLowerCase();
    var cleanPhone = q.replace(/[^0-9]/g, '').slice(-10);

    // 1. Try server proxy
    try {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
      const resp = await fetch(`${origin}/api/lookup?query=${encodeURIComponent(q)}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.status === 'success' && json.passData) {
          this._mirrorToLocal(json.passData);
          return { data: json.passData, error: null };
        }
      }
    } catch (e) {}

    // 2. Direct Apps Script
    var webAppUrl = this.getWebAppUrl();
    if (webAppUrl && webAppUrl.startsWith('https://script.google.com')) {
      try {
        var url = webAppUrl + (webAppUrl.indexOf('?') === -1 ? '?' : '&') + 
                  'action=lookup&query=' + encodeURIComponent(q);
        var res = await fetch(url);
        if (res.ok) {
          var json = await res.json();
          if (json.status === 'success' && json.passData) {
            this._mirrorToLocal(json.passData);
            return { data: json.passData, error: null };
          }
        }
      } catch (e) {}
    }

    // 3. Local lookup
    var users = this.getLocalUsers();
    var found = users.find(function(u) {
      if (!u) return false;
      var uPhone = String(u.whatsapp_number != null ? u.whatsapp_number : '').replace(/[^0-9]/g, '').slice(-10);
      var uEmail = String(u.email || '').trim().toLowerCase();
      return (uEmail && uEmail === q) || (cleanPhone && uPhone === cleanPhone);
    });

    if (found) {
      return { data: found, error: null };
    }

    return { data: null, error: 'No early-access pass found for that Email or WhatsApp number.' };
  }

  /**
   * Retrieve all registered users for Founder Admin Dashboard
   */
  async getAdminData(passkey) {
    var expectedKey = this.getAdminPasskey();
    if (passkey !== expectedKey) {
      return { error: 'Invalid admin passkey.' };
    }

    // 1. Try server proxy first (/api/admin/data)
    try {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
      const proxyResp = await fetch(`${origin}/api/admin/data?key=${encodeURIComponent(passkey)}`);
      if (proxyResp.ok) {
        const json = await proxyResp.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          this.saveLocalUsers(json.data);
          return {
            users: json.data,
            stats: json.stats || this._calculateStats(json.data),
            isLiveSheets: true,
            error: null
          };
        }
      }
    } catch (e) {
      console.warn('Proxy /api/admin/data unreachable, trying direct web app:', e);
    }

    // 2. Direct Google Apps Script fetch
    var webAppUrl = this.getWebAppUrl();
    if (webAppUrl && webAppUrl.startsWith('https://script.google.com')) {
      try {
        var url = webAppUrl + (webAppUrl.indexOf('?') === -1 ? '?' : '&') +
                  'action=admin&key=' + encodeURIComponent(passkey);
        var res = await fetch(url);
        if (res.ok) {
          var json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data)) {
            this.saveLocalUsers(json.data);
            return {
              users: json.data,
              stats: json.stats || this._calculateStats(json.data),
              isLiveSheets: true,
              error: null
            };
          }
        }
      } catch (err) {
        console.warn('Direct Apps Script fetch failed:', err);
      }
    }

    // 3. Fallback: Local Cache
    var users = this.getLocalUsers();
    return {
      users: users,
      stats: this._calculateStats(users),
      isLiveSheets: false,
      error: null
    };
  }

  _calculateStats(users) {
    var uniqueColleges = {};
    var uniqueCities = {};
    var uniqueHometowns = {};
    var langCounts = {};
    var totalReferrals = 0;

    users.forEach(function(u) {
      if (!u) return;
      if (u.college_name) uniqueColleges[String(u.college_name).trim().toLowerCase()] = true;
      if (u.college_city) uniqueCities[String(u.college_city).trim().toLowerCase()] = true;
      if (u.hometown_city) uniqueHometowns[String(u.hometown_city).trim().toLowerCase()] = true;
      totalReferrals += (Number(u.referral_count) || 0);

      if (u.languages_known) {
        var langs = String(u.languages_known).split(',');
        langs.forEach(function(l) {
          var clean = l.trim();
          if (clean) {
            langCounts[clean] = (langCounts[clean] || 0) + 1;
          }
        });
      }
    });

    return {
      totalUsers: users.length,
      uniqueColleges: Object.keys(uniqueColleges).length,
      uniqueCampusCities: Object.keys(uniqueCities).length,
      uniqueHometowns: Object.keys(uniqueHometowns).length,
      totalReferrals: totalReferrals,
      languageBreakdown: langCounts
    };
  }

  /**
   * Export Users Array to CSV
   */
  exportToCSV(users) {
    if (!users || !users.length) return;

    var headers = [
      'Timestamp',
      'Pass_ID',
      'Full_Name',
      'WhatsApp_Number',
      'Email_ID',
      'College_Name',
      'College_City',
      'Department',
      'Year_Of_Study',
      'Hometown_City',
      'Languages_Known',
      'Languages_Count',
      'Referral_Code',
      'Referred_By',
      'Referral_Count'
    ];

    var csvRows = [];
    csvRows.push(headers.join(','));

    users.forEach(function(u) {
      if (!u) return;
      var row = [
        escapeCSV(u.timestamp),
        escapeCSV(u.pass_id),
        escapeCSV(u.full_name),
        escapeCSV(u.whatsapp_number),
        escapeCSV(u.email),
        escapeCSV(u.college_name),
        escapeCSV(u.college_city),
        escapeCSV(u.department),
        escapeCSV(u.year_of_study),
        escapeCSV(u.hometown_city),
        escapeCSV(u.languages_known),
        escapeCSV(u.languages_count),
        escapeCSV(u.referral_code),
        escapeCSV(u.referred_by),
        escapeCSV(u.referral_count)
      ];
      csvRows.push(row.join(','));
    });

    var csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
    var link = document.createElement('a');
    link.setAttribute('href', csvContent);
    var dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', 'GradSetu_Waitlist_' + dateStr + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function escapeCSV(val) {
  if (val === undefined || val === null) return '""';
  var str = val.toString().replace(/"/g, '""');
  return '"' + str + '"';
}

// Singleton export
export const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;
