function alertConfig(env = process.env) {
  const { RESEND_API_KEY: key, INQUIRY_NOTIFY_FROM: from, INQUIRY_NOTIFY_TO: recipients = '' } = env;
  const to = [...new Set(recipients.split(',').map(email => email.trim().toLowerCase()).filter(Boolean))];
  return key && from && to.length > 0 && to.length <= 50 && to.every(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ? { key, from, to } : null;
}

async function sendAlert({ key, from, to }, { subject, text, key: idempotencyKey }) {
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers, body: JSON.stringify({ from, to, subject, text }),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) return null;
  return (await response.json()).id || null;
}

module.exports = { alertConfig, sendAlert };
