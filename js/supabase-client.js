/**
 * GradSetu — Supabase Client with localStorage Mock Fallback
 * If Supabase credentials are not configured, all operations
 * fall back to localStorage so the page works fully offline.
 */

// ── Configuration ──────────────────────────────────────────
// Replace these values with your actual Supabase project URL and anon key.
// For production, inject via your server/CI environment.
const SUPABASE_URL  = window.__SUPABASE_URL__  || '';
const SUPABASE_KEY  = window.__SUPABASE_KEY__  || '';
const FORCE_MOCK    = window.__USE_MOCK__       || false;

const USE_SUPABASE  = !FORCE_MOCK && SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('https://');

// ── Mock Storage Keys ───────────────────────────────────────
const MOCK_STORE_KEY   = 'gs_waitlist_users';
const MOCK_COUNTER_KEY = 'gs_waitlist_counter';

// ── Helpers ─────────────────────────────────────────────────
function generateReferralCode(name) {
  const clean = (name || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = clean.substring(0, 3).padEnd(3, 'X');
  const rand   = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GS-${prefix}${rand}`;
}

function getMockUsers() {
  try { return JSON.parse(localStorage.getItem(MOCK_STORE_KEY) || '[]'); }
  catch { return []; }
}

function saveMockUsers(users) {
  localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(users));
}

function getNextMockNumber() {
  const n = parseInt(localStorage.getItem(MOCK_COUNTER_KEY) || '0', 10) + 1;
  localStorage.setItem(MOCK_COUNTER_KEY, String(n));
  return n;
}

// ── Supabase SDK loader (CDN) ───────────────────────────────
let _supabaseClient = null;

async function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  // Supabase JS v2 CDN — loaded lazily only if credentials exist
  if (!USE_SUPABASE) return null;
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _supabaseClient;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Register a new waitlist user.
 * Returns: { data, error }
 * data: { waitlist_number, referral_code, full_name, college_name, college_city, ... }
 */
export async function registerUser(formData) {
  const {
    full_name, whatsapp_number, email,
    college_name, college_city, department,
    year_of_study, hometown_city,
    languages_list, languages_count,
    referred_by_code
  } = formData;

  const referral_code = generateReferralCode(full_name);

  if (USE_SUPABASE) {
    const db = await getSupabaseClient();
    const payload = {
      full_name, whatsapp_number, email,
      college_name, college_city, department,
      year_of_study, hometown_city,
      languages_list, languages_count,
      referral_code,
      referred_by_code: referred_by_code || null,
    };
    const { data, error } = await db
      .from('waitlist_users')
      .insert(payload)
      .select('waitlist_number, referral_code, full_name, college_name, college_city, email, whatsapp_number')
      .single();

    if (!error && referred_by_code) {
      // Fire-and-forget: increment referrer's count
      db.rpc('increment_referral_count', { ref_code: referred_by_code }).catch(() => {});
    }

    return { data, error };
  }

  // ── Mock fallback ──
  const users = getMockUsers();

  if (users.find(u => u.email === email.toLowerCase())) {
    return { data: null, error: { message: 'This email is already registered.' } };
  }
  if (users.find(u => u.whatsapp_number === whatsapp_number)) {
    return { data: null, error: { message: 'This WhatsApp number is already registered.' } };
  }

  const waitlist_number = getNextMockNumber();
  const newUser = {
    id: crypto.randomUUID?.() || Math.random().toString(36),
    waitlist_number,
    full_name,
    whatsapp_number,
    email: email.toLowerCase(),
    college_name,
    college_city,
    department,
    year_of_study,
    hometown_city,
    languages_list,
    languages_count,
    referral_code,
    referred_by_code: referred_by_code || null,
    referral_count: 0,
    created_at: new Date().toISOString(),
  };

  if (referred_by_code) {
    const refIdx = users.findIndex(u => u.referral_code === referred_by_code);
    if (refIdx > -1) users[refIdx].referral_count++;
  }

  users.push(newUser);
  saveMockUsers(users);

  return {
    data: {
      waitlist_number: newUser.waitlist_number,
      referral_code:   newUser.referral_code,
      full_name:       newUser.full_name,
      college_name:    newUser.college_name,
      college_city:    newUser.college_city,
      email:           newUser.email,
      whatsapp_number: newUser.whatsapp_number,
    },
    error: null
  };
}

/**
 * Look up a user by email OR whatsapp_number.
 * Returns: { data, error }
 */
export async function lookupUser(identifier) {
  const val = (identifier || '').trim().toLowerCase();
  const isEmail = val.includes('@');

  if (USE_SUPABASE) {
    const db = await getSupabaseClient();
    const field = isEmail ? 'email' : 'whatsapp_number';
    const { data, error } = await db
      .from('waitlist_users')
      .select('waitlist_number, referral_code, full_name, college_name, college_city, referral_count')
      .eq(field, isEmail ? val : identifier.trim())
      .single();
    return { data, error };
  }

  // Mock
  const users = getMockUsers();
  const user  = isEmail
    ? users.find(u => u.email === val)
    : users.find(u => u.whatsapp_number === identifier.trim());

  if (!user) return { data: null, error: { message: 'No pass found for that identifier.' } };

  return {
    data: {
      waitlist_number: user.waitlist_number,
      referral_code:   user.referral_code,
      full_name:       user.full_name,
      college_name:    user.college_name,
      college_city:    user.college_city,
      referral_count:  user.referral_count,
    },
    error: null
  };
}

/**
 * Get total waitlist count (for social proof bar).
 */
export async function getWaitlistCount() {
  if (USE_SUPABASE) {
    const db = await getSupabaseClient();
    const { count, error } = await db
      .from('waitlist_users')
      .select('*', { count: 'exact', head: true });
    return { count: count ?? 0, error };
  }
  // Mock
  const users = getMockUsers();
  return { count: users.length, error: null };
}

export { USE_SUPABASE };

