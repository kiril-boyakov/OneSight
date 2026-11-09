const { alertConfig, sendAlert } = require('./_notifications');
const isAdmin = require('./_admin');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const { createHmac } = require('node:crypto');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: secret, REVIEW_ADMIN_ID: admin, REVIEW_RATE_SALT: salt } = process.env;
  const ready = Boolean(url && anon && secret && admin && salt);
  const reply = (code, value) => res.status(code).json(value);
  if (!ready) return reply(503, { error: 'Review submissions are not available yet.' });
  const headers = { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
  const db = async (path, options = {}) => {
    const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      const error = new Error('Database request failed');
      try { error.code = (await response.json()).code; } catch {}
      throw error;
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };
  const mail = alertConfig();
  async function notify(id, previous) {
    if (previous === 'sent') return 'sent';
    let state = mail ? 'failed' : 'not_configured';
    if (mail) {
      try {
        if (await sendAlert(mail, {
          subject: 'New 1sight client review',
          text: 'A new review was submitted to your private 1sight dashboard.\n\nSign in: https://1sight.eu/admin/',
          ...(id ? { key: 'review-' + id } : {})
        })) state = 'sent';
      } catch {}
    }
    if (id) {
      try {
        await db(`reviews?id=eq.${id}&notification_status=neq.sent`, {
          method: 'PATCH', body: JSON.stringify({ notification_status: state })
        });
      } catch { return state === 'sent' ? 'unrecorded' : state; }
    }
    if (state === 'failed') console.warn('Review notification was not accepted');
    return state;
  }
  try {
    const query = new URL(req.url, 'https://local.invalid').searchParams;
    if (req.method === 'GET' && query.get('config') === '1') return reply(200, { url, anon });
    const retry = req.method === 'POST' && query.get('notify') === '1';
    const moderation = query.get('moderation') === '1' || req.method === 'PATCH' || retry;
    if (moderation) {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return reply(401, { error: 'Please sign in.' });
      const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return reply(401, { error: 'Your session expired. Please sign in again.' });
      const user = await response.json();
      if (!isAdmin(user, admin)) return reply(403, { error: 'This account cannot manage reviews.' });
    }
    if (req.method === 'GET') {
      if (moderation) {
        const status = query.get('status') || 'pending';
        if (!['pending', 'approved', 'rejected'].includes(status)) return reply(400, { error: 'Invalid review status.' });
        const filters = `&status=eq.${status}&order=created_at.desc&limit=100`;
        const fields = 'reviews?select=id,name,business,review,status,created_at';
        try {
          return reply(200, { reviews: await db(fields + ',notification_status' + filters), notificationsConfigured: Boolean(mail), notificationTracking: true });
        } catch (error) {
          if (error.code !== '42703') throw error;
          return reply(200, { reviews: await db(fields + filters), notificationsConfigured: Boolean(mail), notificationTracking: false });
        }
      }
      return reply(200, { reviews: await db('reviews?select=id,name,business,review&status=eq.approved&order=created_at.desc&limit=50') });
    }
    if (!['POST', 'PATCH'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, PATCH');
      return reply(405, { error: 'Method not allowed.' });
    }
    // Block browser submissions from other websites; native clients still face validation and rate limits.
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) return reply(403, { error: 'Please submit from the OneSight website.' });
    if (!String(req.headers['content-type'] || '').includes('application/json')) return reply(415, { error: 'JSON is required.' });
    if (Number(req.headers['content-length'] || 0) > 10000) return reply(413, { error: 'The review is too long.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object') return reply(400, { error: 'Please check your review.' });
    if (retry) {
      if (!UUID.test(body.id || '')) return reply(400, { error: 'Invalid review reference.' });
      if (!mail) return reply(503, { error: 'Email alerts are not configured.' });
      const rows = await db(`reviews?id=eq.${body.id}&select=id,notification_status`);
      if (!rows.length) return reply(404, { error: 'Review not found.' });
      if (rows[0].notification_status === null) return reply(409, { error: 'This review predates alert tracking.' });
      return reply(200, { notificationStatus: await notify(body.id, rows[0].notification_status) });
    }
    if (req.method === 'PATCH') {
      if (!/^[0-9a-f-]{36}$/i.test(body.id || '') || !['approved', 'rejected', 'pending'].includes(body.status)) return reply(400, { error: 'Invalid review update.' });
      if (body.previousStatus !== undefined && !['approved','rejected','pending'].includes(body.previousStatus)) return reply(400,{error:'Invalid previous status.'});
      const rows = await db(`reviews?id=eq.${body.id}${body.previousStatus ? '&status=eq.'+body.previousStatus : ''}&select=id,status`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: body.status }) });
      if (!rows.length) return reply(409, { error: 'This review changed or was removed. Refresh before trying again.' });
      return reply(200, { review: rows[0] });
    }
    const clean = value => typeof value === 'string' ? value.trim() : '';
    const name = clean(body.name), business = clean(body.business), review = clean(body.review);
    if (body.website) return reply(400, { error: 'Unable to submit this review.' });
    if (name.length < 2 || name.length > 80 || business.length > 100 || review.length < 20 || review.length > 1200 || body.consent !== true) return reply(400, { error: 'Add your name, 20–1,200 characters of feedback, and permission to publish.' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const rateHash = createHmac('sha256', salt).update(ip).digest('hex');
    const options = { method: 'POST', body: JSON.stringify({ p_name: name, p_business: business, p_review: review, p_rate_hash: rateHash }) };
    let result;
    try { result = await db('rpc/submit_review_with_alert', options); }
    catch (error) {
      if (error.code !== 'PGRST202') throw error;
      result = await db('rpc/submit_review', options);
    }
    if (!result) return reply(429, { error: 'Too many reviews from this connection. Please try again in an hour.' });
    await notify(UUID.test(result) ? result : null);
    return reply(201, { message: 'Thank you. Your review was received and is waiting for approval.' });
  } catch {
    return reply(503, { error: 'We could not complete the request. Please try again later.' });
  }
};
