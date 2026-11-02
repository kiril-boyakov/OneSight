const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/inquiries.js');
const originalFetch=global.fetch;
const keys=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','REVIEW_ADMIN_ID','REVIEW_RATE_SALT','RESEND_API_KEY','INQUIRY_NOTIFY_TO','INQUIRY_NOTIFY_FROM'];
const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function configure(mail=false){
 Object.assign(process.env,{SUPABASE_URL:'https://project.invalid',SUPABASE_ANON_KEY:'anon-test',SUPABASE_SERVICE_ROLE_KEY:'secret-test',REVIEW_ADMIN_ID:'owner',REVIEW_RATE_SALT:'test-salt'});
 for(const k of keys.slice(5))delete process.env[k];
 if(mail)Object.assign(process.env,{RESEND_API_KEY:'mail-test',INQUIRY_NOTIFY_TO:'owner@example.invalid',INQUIRY_NOTIFY_FROM:'OneSight <alerts@example.invalid>'});
}
afterEach(()=>{global.fetch=originalFetch;for(const k of keys){if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}});
const id='11111111-1111-4111-8111-111111111111';
const valid={id,name:'Test Client',email:'client@example.invalid',business:'Test business',projectType:'new',description:'Clearly labelled test project inquiry for the website.',timeline:'Next month'};
async function request(method='POST',body=valid,url='/api/inquiries',headers={}){
 const req={method,body,url,headers:{host:'1sight.eu','content-type':'application/json','x-forwarded-for':'192.0.2.1',...headers},socket:{}};
 const res={setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;}};await handler(req,res);return res;
}
test('missing configuration or missing schema never claims readiness or receipt',async()=>{
 configure();delete process.env.SUPABASE_URL;assert.equal((await request()).code,503);
 configure();global.fetch=async()=>new Response('{}',{status:404});assert.equal((await request('GET',null,'/api/inquiries?ready=1')).code,503);assert.equal((await request()).code,503);
});
test('public readiness exposes no inquiry fields or credentials',async()=>{
 configure(true);global.fetch=async url=>{assert.match(url,/select=id&limit=0$/);return new Response('[]');};
 assert.deepEqual((await request('GET',null,'/api/inquiries?ready=1')).value,{ready:true});
});
test('inbox and updates require the configured owner, not any logged-in user',async()=>{
 configure();assert.equal((await request('GET')).code,401);
 global.fetch=async()=>new Response('{"id":"other"}');assert.equal((await request('GET',null,'/api/inquiries',{authorization:'Bearer other'})).code,403);
 global.fetch=async()=>new Response('{}',{status:401});assert.equal((await request('PATCH',{id,status:'contacted'},'/api/inquiries',{authorization:'Bearer forged'})).code,401);
});
test('invalid, bot and cross-site submissions do not reach storage',async()=>{
 configure();global.fetch=()=>{throw Error('Should not fetch');};
 for(const body of [{...valid,email:'not email'},{...valid,description:'short'},{...valid,website:'spam'},{...valid,projectType:'unknown'},'{bad json'])assert.equal((await request('POST',body)).code,400);
 assert.equal((await request('POST',valid,'/api/inquiries',{origin:'https://other.invalid'})).code,403);
});
test('atomic rate-limit and conflicting retry results never claim receipt',async()=>{
 configure();global.fetch=async()=>new Response('{"limited":true}');assert.equal((await request()).code,429);
 global.fetch=async()=>new Response('{"conflict":true}');assert.equal((await request()).code,409);
});
test('confirmed storage is required and raw IP is not sent to database',async()=>{
 configure();let payload;
 global.fetch=async(url,options)=>{
  if(url.includes('rpc/')){payload=JSON.parse(options.body);return new Response(JSON.stringify({id,notification_status:'pending'}));}
  assert.deepEqual(JSON.parse(options.body),{notification_status:'not_configured',notification_id:null});return new Response('');
 };
 const result=await request('POST',{...valid,status:'contacted'});assert.equal(result.code,201);assert.equal(payload.p_id,id);assert.equal(payload.p_rate_hash.length,64);assert.equal(payload.status,undefined);assert.ok(!JSON.stringify(payload).includes('192.0.2.1'));
});
test('email failure preserves confirmed storage and is recorded for owner retry',async()=>{
 configure(true);let failureRecorded=false;
 global.fetch=async(url,options)=>{
  if(url.includes('rpc/'))return new Response(JSON.stringify({id,notification_status:'pending'}));
  if(url.includes('resend.com'))return new Response('{"error":"unavailable"}',{status:503});
  failureRecorded=JSON.parse(options.body).notification_status==='failed';return new Response('');
 };assert.equal((await request()).code,201);assert.ok(failureRecorded);
});
test('email alerts contain no client data and provider acceptance is recorded',async()=>{
 configure(true);let accepted=false;
 global.fetch=async(url,options)=>{
  if(url.includes('rpc/'))return new Response(JSON.stringify({id,notification_status:'pending'}));
  if(url.includes('resend.com')){
   const mail=JSON.parse(options.body);assert.deepEqual(mail.to,['owner@example.invalid']);assert.ok(mail.text.includes('https://1sight.eu/admin/'));assert.ok(!JSON.stringify(mail).includes(valid.email));assert.ok(!JSON.stringify(mail).includes(valid.name));assert.equal(options.headers['Idempotency-Key'],'inquiry-'+id);return new Response('{"id":"email-id"}');
  }
  accepted=JSON.parse(options.body).notification_status==='sent';return new Response('');
 };assert.equal((await request()).code,201);assert.ok(accepted);
});
test('a previously notified retry does not send a second alert',async()=>{
 configure(true);let calls=0;global.fetch=async url=>{calls++;assert.ok(url.includes('rpc/'));return new Response(JSON.stringify({id,notification_status:'sent'}));};assert.equal((await request()).code,201);assert.equal(calls,1);
});
test('owner inbox is private and status edits cannot overwrite client content',async()=>{
 configure();global.fetch=async(url,options)=>{
  if(url.includes('/auth/'))return new Response('{"id":"owner"}');
  if(options.method==='PATCH'){assert.deepEqual(JSON.parse(options.body),{status:'contacted'});return new Response(JSON.stringify([{id,status:'contacted'}]));}
  assert.ok(!url.includes('notification_id'));return new Response('[]');
 };
 assert.equal((await request('GET',null,'/api/inquiries',{authorization:'Bearer owner'})).code,200);
 assert.equal((await request('PATCH',{id,status:'contacted',description:'overwrite'},'/api/inquiries',{authorization:'Bearer owner'})).code,200);
});
