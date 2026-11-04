(() => {
 const form=document.getElementById('project-form');
 if(!form)return;
 const fields=document.getElementById('inquiry-fields'),status=document.getElementById('form-status'),note=document.getElementById('inquiry-availability');
 let requestId=null;
 function checkAvailability(){
 fetch('/api/inquiries?ready=1').then(async response=>{
  const result=await response.json();if(!response.ok||!result.ready)throw Error();
  fields.disabled=false;note.textContent='Your inquiry is sent privately to OneSight. We’ll use your details to discuss your project.';status.textContent='';
 }).catch(()=>{note.textContent='The inquiry form is temporarily unavailable. Please use WhatsApp below to discuss your project.';});
 }
 if(typeof IntersectionObserver==='function'){
  const availability=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){availability.disconnect();checkAvailability();}},{rootMargin:'600px 0px'});
  availability.observe(form);
 }else checkAvailability();
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity()||fields.disabled)return;
  const data=new FormData(form);
  requestId ||= crypto.randomUUID();
  fields.disabled=true;status.textContent='Sending your inquiry…';
  try{
   const response=await fetch('/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:requestId,name:data.get('name'),email:data.get('email'),business:data.get('business'),projectType:data.get('type'),description:data.get('description'),timeline:data.get('timeline'),website:data.get('website')})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to send your inquiry. Please try again.');
   form.reset();requestId=null;status.textContent=result.message;
  }catch(error){status.textContent=error.message||'We could not confirm receipt. Please try again or contact us on WhatsApp.';}
  finally{fields.disabled=false;}
 });
})();
