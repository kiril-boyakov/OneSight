const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/reviews.js');
const originalFetch = global.fetch;
const names = ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','REVIEW_ADMIN_ID','REVIEW_RATE_SALT','RESEND_API_KEY','INQUIRY_NOTIFY_TO','INQUIRY_NOTIFY_FROM'];
const originalEnv = Object.fromEntries(names.map(key => [key, process.env[key]]));
function configured() {
  Object.assign(process.env, { SUPABASE_URL: 'https://project.invalid', SUPABASE_ANON_KEY: 'public-test', SUPABASE_SERVICE_ROLE_KEY: 'secret-test', REVIEW_ADMIN_ID: 'owner', REVIEW_RATE_SALT: 'test-salt' });
}
afterEach(() => { global.fetch = originalFetch; for (const key of names) { if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key]; } });
async function request(method='GET', url='/api/reviews', body, extra={}) {
  const req={ method,url,body,headers:{ host:'1sight.eu','content-type':'application/json','x-forwarded-for':'192.0.2.1',...extra },socket:{} };
  const res={ code:0,value:null,setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;} };
  await handler(req,res); return res;
}
test('unconfigured API does not accept submissions or claim success',async()=>{ delete process.env.SUPABASE_URL; const r=await request('POST'); assert.equal(r.code,503); });
test('public reader only queries approved reviews without consent or connection details',async()=>{ configured(); let seen; global.fetch=async(url)=>{seen=url;return new Response('[]');}; const r=await request();assert.equal(r.code,200);assert.match(seen,/status=eq.approved/);assert.doesNotMatch(seen,/consent|rate_hash/); });
test('moderation requires authentication',async()=>{ configured();global.fetch=()=>{throw Error('must not fetch');};assert.equal((await request('GET','/api/reviews?moderation=1')).code,401); });
test('a valid user other than owner cannot moderate',async()=>{configured();global.fetch=async()=>new Response('{"id":"someone-else"}');assert.equal((await request('GET','/api/reviews?moderation=1',null,{authorization:'Bearer user-token'})).code,403);});
test('forged or expired tokens are refused',async()=>{configured();global.fetch=async()=>new Response('{}',{status:401});assert.equal((await request('PATCH','/api/reviews',{}, {authorization:'Bearer invalid'})).code,401);});
test('invalid review and missing consent never reach storage',async()=>{configured();global.fetch=()=>{throw Error('must not fetch');};assert.equal((await request('POST','/api/reviews',{name:'Joe',review:'too short',consent:false})).code,400);});
test('cross-site submissions are refused',async()=>{configured();assert.equal((await request('POST','/api/reviews',{}, {origin:'https://other.invalid'})).code,403);});
test('honeypot rejects automated submissions',async()=>{configured();assert.equal((await request('POST','/api/reviews',{website:'spam'})).code,400);});
const valid={name:'Test Client',business:'Example',review:'This is a labelled test review for the moderation system.',consent:true};
test('success only follows database insert and never accepts a client approval status',async()=>{configured();let payload;global.fetch=async(url,options)=>{assert.match(url,/rpc\/submit_review_with_alert$/);payload=JSON.parse(options.body);return new Response('true');};const r=await request('POST','/api/reviews',{...valid,status:'approved'});assert.equal(r.code,201);assert.equal(payload.p_name,valid.name);assert.equal(payload.status,undefined);assert.equal(payload.p_rate_hash.length,64);assert.doesNotMatch(JSON.stringify(payload),/192\.0\.2\.1/);});
test('rate-limit exhaustion returns 429 without success',async()=>{configured();global.fetch=async()=>new Response('false');assert.equal((await request('POST','/api/reviews',valid)).code,429);});
test('database failure never reports success',async()=>{configured();global.fetch=async()=>new Response('{}',{status:500});assert.equal((await request('POST','/api/reviews',valid)).code,503);});
test('owner can approve and only the status is written',async()=>{configured();let count=0;global.fetch=async(url,options)=>{if(count++===0)return new Response('{"id":"owner"}');assert.deepEqual(JSON.parse(options.body),{status:'approved'});return new Response('[{"id":"11111111-1111-1111-1111-111111111111","status":"approved"}]');};assert.equal((await request('PATCH','/api/reviews',{id:'11111111-1111-1111-1111-111111111111',status:'approved',review:'overwrite attempt'}, {authorization:'Bearer owner-token'})).code,200);});

test('saved reviews send a private alert to all configured recipients', async () => {
  configured();
  Object.assign(process.env, {
    RESEND_API_KEY:'test-key', INQUIRY_NOTIFY_FROM:'alerts@example.invalid',
    INQUIRY_NOTIFY_TO:'studio@example.invalid, owner@example.invalid, team@example.invalid'
  });
  const calls = [];
  let mail;
  global.fetch = async (url, options) => {
    calls.push(url);
    if (url.includes('/rpc/submit_review_with_alert')) return new Response('true');
    mail = JSON.parse(options.body);
    return new Response('{"id":"mail-test"}');
  };
  assert.equal((await request('POST','/api/reviews',valid)).code, 201);
  assert.deepEqual(mail.to, ['studio@example.invalid', 'owner@example.invalid', 'team@example.invalid']);
  assert.match(mail.text, /1sight\.eu\/admin/);
  assert.ok(!mail.text.includes(valid.review));
  assert.equal(calls.length, 2);
  assert.match(calls[0], /submit_review_with_alert$/);
  assert.equal(calls[1], 'https://api.resend.com/emails');
});

test('failed review alert is recorded, only admins can retry, and a sent alert is not repeated', async () => {
  configured();
  Object.assign(process.env, { RESEND_API_KEY:'test', INQUIRY_NOTIFY_FROM:'alerts@example.invalid', INQUIRY_NOTIFY_TO:'team@example.invalid' });
  const id = '11111111-1111-4111-8111-111111111111';
  let state = 'pending', sends = 0, key;
  global.fetch = async (url, options) => {
    if (url.includes('/auth/')) return new Response('{"id":"owner"}');
    if (url.includes('/rpc/')) return Response.json(id);
    if (url.includes('resend.com')) {
      key = options.headers['Idempotency-Key'];
      return ++sends === 1 ? new Response(null, {status:503}) : Response.json({id:'accepted'});
    }
    if (options.method === 'PATCH') {
      state = JSON.parse(options.body).notification_status;
      return new Response(null, {status:204});
    }
    return Response.json([{id, notification_status:state}]);
  };
  assert.equal((await request('POST','/api/reviews',valid)).code, 201);
  assert.equal(state,'failed');
  assert.equal((await request('POST','/api/reviews?notify=1',{id})).code,401);
  const retry = () => request('POST','/api/reviews?notify=1',{id},{authorization:'Bearer owner'});
  assert.equal((await retry()).value.notificationStatus,'sent');
  assert.equal(state,'sent');
  assert.equal(key,'review-'+id);
  assert.equal((await retry()).value.notificationStatus,'sent');
  assert.equal(sends,2);
});

test('review submission still works before the tracking migration', async () => {
  configured();
  const calls = [];
  global.fetch = async url => {
    calls.push(url);
    return url.endsWith('_with_alert') ? Response.json({code:'PGRST202'},{status:404}) : Response.json(true);
  };
  assert.equal((await request('POST','/api/reviews',valid)).code,201);
  assert.match(calls[1], /submit_review$/);
});
