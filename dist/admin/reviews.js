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
async function refreshReviews() {
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
          try { await api('/api/reviews', { method: 'PATCH', body: JSON.stringify({ id: review.id, status: value, previousStatus: review.status }) }); await refresh(); }
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
    document.getElementById('team-identity').textContent = 'Signed in as ' + result.user.email; login.reset(); login.hidden = true; panel.hidden = false; await refresh();
  } catch (error) { token = null; status.textContent = error.message; }
  finally { document.getElementById('login-fields').disabled = false; }
});
filter.addEventListener('change', refresh);
document.getElementById('inquiry-filter').addEventListener('change',refresh);
document.getElementById('admin-view').addEventListener('change',refresh);
document.getElementById('logout').addEventListener('click', async () => {
  const current = token; token = null; list.replaceChildren(); panel.hidden = true; login.hidden = false; status.textContent = 'Signed out.';
  try { await fetch(config.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: config.anon, Authorization: `Bearer ${current}` } }); } catch {}
});
fetch('/api/reviews?config=1').then(async response => {
  if (!response.ok) throw new Error(); config = await response.json(); document.getElementById('login-fields').disabled = false; status.textContent = 'Sign in with your team account. Sessions stay in memory and end when this page is reloaded.';
}).catch(() => { status.textContent = 'Review management is not connected yet.'; });

async function refresh(){
 const inquiries=document.getElementById('admin-view').value==='inquiries';
 document.getElementById('review-filter-label').hidden=inquiries;
 document.getElementById('inquiry-filter-label').hidden=!inquiries;
 if(!inquiries)return refreshReviews();
 list.replaceChildren();status.textContent='Loading private inquiries…';
 try{
  const selected=document.getElementById('inquiry-filter').value;
  const result=await api('/api/inquiries?status='+selected);
  status.textContent=`${result.inquiries.length} ${selected} inquiry/inquiries.`+(result.notificationsConfigured?'':' Email alerts are not configured yet.');
  for(const inquiry of result.inquiries){
   const card=document.createElement('article');card.className='review-card';
   const heading=document.createElement('h2');heading.textContent=inquiry.name;
   const detail=document.createElement('p');detail.textContent=[inquiry.business,new Date(inquiry.created_at).toLocaleString()].filter(Boolean).join(' · ');
   const email=document.createElement('a');email.className='text-link';email.textContent=inquiry.email;email.href='mailto:'+encodeURIComponent(inquiry.email);
   const description=document.createElement('blockquote');description.textContent=inquiry.description;
   const context=document.createElement('p');context.textContent=`Project: ${inquiry.project_type}. Timeline: ${inquiry.timeline||'Not specified'}.`;
   const notification=document.createElement('p');notification.textContent='Email alert: '+({sent:'accepted by email provider',failed:'failed — inquiry is safely stored',pending:'pending',not_configured:'not configured'}[inquiry.notification_status]||'unknown');
   const actions=document.createElement('div');actions.className='admin-actions';
   async function act(path,body){
    actions.querySelectorAll('button').forEach(button=>button.disabled=true);
    try{const outcome=await api(path,{method:path.includes('notify')?'POST':'PATCH',body:JSON.stringify(body)});await refresh();if(outcome.notificationStatus&&outcome.notificationStatus!=='sent')status.textContent='Inquiry is stored, but the email alert was not accepted. Check email configuration.';}
    catch(error){status.textContent=error.message;actions.querySelectorAll('button').forEach(button=>button.disabled=false);}
   }
   for(const [value,label]of [['new','Mark new'],['contacted','Mark contacted'],['archived','Archive']]){
    if(value===inquiry.status)continue;
    const button=document.createElement('button');button.type='button';button.className='button';button.textContent=label;button.addEventListener('click',()=>act('/api/inquiries',{id:inquiry.id,status:value,previousStatus:inquiry.status}));actions.append(button);
   }
   if(inquiry.notification_status!=='sent'&&result.notificationsConfigured){
    const retry=document.createElement('button');retry.type='button';retry.className='button';retry.textContent='Retry email alert';retry.addEventListener('click',()=>act('/api/inquiries?notify=1',{id:inquiry.id}));actions.append(retry);
   }
   card.append(heading,detail,email,description,context,notification,actions);list.append(card);
  }
 }catch(error){status.textContent='Inquiries are not connected yet, or could not be loaded. '+error.message;}
}

const search=document.getElementById('admin-search');
function filterCards(){const term=search.value.trim().toLowerCase();for(const card of list.children)card.hidden=!card.textContent.toLowerCase().includes(term);}
search.addEventListener('input',filterCards);
new MutationObserver(filterCards).observe(list,{childList:true});
document.getElementById('refresh-inbox').addEventListener('click',refresh);
