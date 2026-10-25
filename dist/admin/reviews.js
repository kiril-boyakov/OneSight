let config, token;
const status = document.getElementById('admin-status');
const login = document.getElementById('admin-login');
const panel = document.getElementById('moderation');
const list = document.getElementById('moderation-list');
const filter = document.getElementById('review-filter');
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to complete this request.');
  return result;
}
async function refresh() {
  list.replaceChildren(); status.textContent = 'Loading reviews…';
  try {
    const { reviews } = await api('/api/reviews?moderation=1&status=' + filter.value);
    status.textContent = reviews.length ? `${reviews.length} ${filter.value} review(s).` : `No ${filter.value} reviews.`;
    for (const review of reviews) {
      const card = document.createElement('article'); card.className = 'review-card';
      const name = document.createElement('h2'); name.textContent = review.name;
      const detail = document.createElement('p'); detail.textContent = [review.business, new Date(review.created_at).toLocaleDateString()].filter(Boolean).join(' · ');
      const quote = document.createElement('blockquote'); quote.textContent = review.review;
      const actions = document.createElement('div'); actions.className = 'admin-actions';
      for (const [value, label] of [['approved', 'Approve'], ['rejected', 'Reject / unpublish'], ['pending', 'Return to pending']]) {
        if (value === review.status) continue;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'button'; button.textContent = label;
        button.addEventListener('click', async () => {
          actions.querySelectorAll('button').forEach(b => b.disabled = true);
          try { await api('/api/reviews', { method: 'PATCH', body: JSON.stringify({ id: review.id, status: value }) }); await refresh(); }
          catch (error) { status.textContent = error.message; actions.querySelectorAll('button').forEach(b => b.disabled = false); }
        });
        actions.append(button);
      }
      card.append(name, detail, quote, actions); list.append(card);
    }
  } catch (error) { status.textContent = error.message; }
}
login.addEventListener('submit', async event => {
  event.preventDefault(); const data = new FormData(login); document.getElementById('login-fields').disabled = true;
  try {
    const response = await fetch(config.url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: config.anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) });
    const result = await response.json(); if (!response.ok) throw new Error('Sign in failed. Check your credentials.');
    token = result.access_token;
    await api('/api/reviews?moderation=1');
    login.reset(); login.hidden = true; panel.hidden = false; await refresh();
  } catch (error) { token = null; status.textContent = error.message; }
  finally { document.getElementById('login-fields').disabled = false; }
});
filter.addEventListener('change', refresh);
document.getElementById('logout').addEventListener('click', async () => {
  const current = token; token = null; list.replaceChildren(); panel.hidden = true; login.hidden = false; status.textContent = 'Signed out.';
  try { await fetch(config.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: config.anon, Authorization: `Bearer ${current}` } }); } catch {}
});
fetch('/api/reviews?config=1').then(async response => {
  if (!response.ok) throw new Error(); config = await response.json(); document.getElementById('login-fields').disabled = false; status.textContent = 'Sign in with your configured owner account. Sessions stay in memory and end when this page is reloaded.';
}).catch(() => { status.textContent = 'Review management is not connected yet.'; });
