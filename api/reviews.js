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
    if (!response.ok) throw new Error('Database request failed');
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };
  try {
    const query = new URL(req.url, 'https://local.invalid').searchParams;
    if (req.method === 'GET' && query.get('config') === '1') return reply(200, { url, anon });
    const moderation = query.get('moderation') === '1' || req.method === 'PATCH';
    if (moderation) {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return reply(401, { error: 'Please sign in.' });
      const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return reply(401, { error: 'Your session expired. Please sign in again.' });
      const user = await response.json();
      if (user.id !== admin) return reply(403, { error: 'This account cannot manage reviews.' });
    }
    if (req.method === 'GET') {
      if (moderation) {
        const status = query.get('status') || 'pending';
        if (!['pending', 'approved', 'rejected'].includes(status)) return reply(400, { error: 'Invalid review status.' });
        return reply(200, { reviews: await db(`reviews?select=id,name,business,review,status,created_at&status=eq.${status}&order=created_at.desc&limit=100`) });
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
    if (req.method === 'PATCH') {
      if (!/^[0-9a-f-]{36}$/i.test(body.id || '') || !['approved', 'rejected', 'pending'].includes(body.status)) return reply(400, { error: 'Invalid review update.' });
      const rows = await db(`reviews?id=eq.${body.id}&select=id,status`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: body.status }) });
      if (!rows.length) return reply(404, { error: 'Review not found.' });
      return reply(200, { review: rows[0] });
    }
    const clean = value => typeof value === 'string' ? value.trim() : '';
    const name = clean(body.name), business = clean(body.business), review = clean(body.review);
    if (body.website) return reply(400, { error: 'Unable to submit this review.' });
    if (name.length < 2 || name.length > 80 || business.length > 100 || review.length < 20 || review.length > 1200 || body.consent !== true) return reply(400, { error: 'Add your name, 20–1,200 characters of feedback, and permission to publish.' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const rateHash = createHmac('sha256', salt).update(ip).digest('hex');
    const result = await db('rpc/submit_review', { method: 'POST', body: JSON.stringify({ p_name: name, p_business: business, p_review: review, p_rate_hash: rateHash }) });
    if (!result) return reply(429, { error: 'Too many reviews from this connection. Please try again in an hour.' });
    return reply(201, { message: 'Thank you. Your review was received and is waiting for approval.' });
  } catch {
    return reply(503, { error: 'We could not complete the request. Please try again later.' });
  }
};
