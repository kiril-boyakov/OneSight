const { alertConfig, sendAlert } = require('./_notifications');
const isAdmin = require('./_admin');
const {createHmac}=require('node:crypto');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const reply=(code,data)=>res.status(code).json(data);
 const {SUPABASE_URL:url,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:secret,REVIEW_ADMIN_ID:admin,REVIEW_RATE_SALT:salt}=process.env;
 const configured=Boolean(url&&anon&&secret&&admin&&salt);
 const mail=alertConfig();
 const notifications=Boolean(mail);
 if(!configured)return reply(503,{error:'The inquiry form is not connected yet. Please contact us on WhatsApp.'});
 const db=async(path,options={})=>{
  const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Database unavailable');const text=await r.text();return text?JSON.parse(text):null;
 };
 async function notify(id,previous){
  if(previous==='sent')return 'sent';
  let state='not_configured',providerId=null;
  if(notifications){
   state='failed';
   try{
    providerId=await sendAlert(mail,{subject:'New 1sight project inquiry',text:`A new project inquiry is saved in your private 1sight dashboard.\n\nSign in: https://1sight.eu/admin/\nReference: ${id}\n\nClient details are available only in the dashboard.`,key:`inquiry-${id}`});
    if(providerId)state='sent';
   }catch{}
  }
  // A mail failure must never discard an inquiry that is already safely stored.
  try{await db(`inquiries?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({notification_status:state,notification_id:providerId})});}catch{}
  return state;
 }
 try{
  const query=new URL(req.url,'https://local.invalid').searchParams;
  if(req.method==='GET'&&query.get('ready')==='1'){
   await db('inquiries?select=id&limit=0');return reply(200,{ready:true});
  }
  if(!['GET','POST','PATCH'].includes(req.method)){res.setHeader('Allow','GET, POST, PATCH');return reply(405,{error:'Method not allowed.'});}
  const owner=req.method==='GET'||req.method==='PATCH'||query.get('notify')==='1';
  if(owner){
   const authorization=req.headers.authorization||'';if(!authorization.startsWith('Bearer '))return reply(401,{error:'Please sign in.'});
   const r=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization},signal:AbortSignal.timeout(8000)});
   if(!r.ok)return reply(401,{error:'Your session expired. Please sign in again.'});
   if(!isAdmin(await r.json(),admin))return reply(403,{error:'This account cannot manage inquiries.'});
  }
  if(req.method==='GET'){
   const status=query.get('status')||'new';if(!['new','contacted','archived'].includes(status))return reply(400,{error:'Invalid inquiry status.'});
   return reply(200,{inquiries:await db(`inquiries?select=id,name,email,business,project_type,description,timeline,status,notification_status,created_at&status=eq.${status}&order=created_at.desc&limit=100`),notificationsConfigured:notifications});
  }
  const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return reply(403,{error:'Please submit from the OneSight website.'});
  if(!String(req.headers['content-type']||'').includes('application/json'))return reply(415,{error:'JSON is required.'});
  if(Number(req.headers['content-length']||0)>24000)return reply(413,{error:'Your project description is too long.'});
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return reply(400,{error:'Please check the form and try again.'});}
  if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'Please check the form.'});
  if(owner){
   if(!UUID.test(body.id||''))return reply(400,{error:'Invalid inquiry reference.'});
   if(query.get('notify')==='1'){
    const rows=await db(`inquiries?id=eq.${body.id}&select=id,notification_status`);if(!rows.length)return reply(404,{error:'Inquiry not found.'});
    return reply(200,{notificationStatus:await notify(body.id,rows[0].notification_status)});
   }
   if(!['new','contacted','archived'].includes(body.status))return reply(400,{error:'Invalid inquiry status.'});
   if(body.previousStatus!==undefined&&!['new','contacted','archived'].includes(body.previousStatus))return reply(400,{error:'Invalid previous status.'});
   const rows=await db(`inquiries?id=eq.${body.id}${body.previousStatus?'&status=eq.'+body.previousStatus:''}&select=id,status`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:body.status})});
   return rows.length?reply(200,{inquiry:rows[0]}):reply(409,{error:'This inquiry changed or was removed. Refresh before trying again.'});
  }
  const clean=v=>typeof v==='string'?v.trim():'';
  const name=clean(body.name),email=clean(body.email).toLowerCase(),business=clean(body.business),description=clean(body.description),timeline=clean(body.timeline),projectType=clean(body.projectType);
  if(body.website)return reply(400,{error:'Unable to submit this inquiry.'});
  if(!UUID.test(body.id||'')||name.length<2||name.length>80||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||business.length>100||!['new','redesign','updates'].includes(projectType)||description.length<20||description.length>5000||timeline.length>160)return reply(400,{error:'Add your name, a valid email, and 20–5,000 characters describing your project.'});
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const hash=createHmac('sha256',salt).update('inquiry:'+ip).digest('hex');
  const saved=await db('rpc/submit_inquiry',{method:'POST',body:JSON.stringify({p_id:body.id,p_name:name,p_email:email,p_business:business,p_project_type:projectType,p_description:description,p_timeline:timeline,p_rate_hash:hash})});
  if(saved?.limited)return reply(429,{error:'Too many inquiries from this connection. Please try again in an hour, or contact us on WhatsApp.'});
  if(saved?.conflict)return reply(409,{error:'Your previous request may already have been received. Contact us on WhatsApp if you need to change it.'});
  if(!saved||saved.id!==body.id)throw Error('Storage not confirmed');
  await notify(saved.id,saved.notification_status);
  return reply(201,{message:'Thank you. Your project inquiry has been received. We’ll contact you using the email you provided.',id:saved.id});
 }catch{return reply(503,{error:'We could not confirm your inquiry was received. Please try again, or contact us on WhatsApp.'});}
};
