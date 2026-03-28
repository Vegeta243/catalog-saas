const https = require('https');
const fs = require('fs');
const env = fs.readFileSync('.env.local','utf8');
const supaUrl = env.split('\n').find(l=>l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=').slice(1).join('=').replace(/['"]/g,'').trim();
const anonKey = env.split('\n').find(l=>l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))?.split('=').slice(1).join('=').replace(/['"]/g,'').trim();
const host = new URL(supaUrl).hostname;
const lb = JSON.stringify({email:'elliottshilenge5@gmail.com',password:'2413A2413a'});
https.request({hostname:host,path:'/auth/v1/token?grant_type=password',method:'POST',headers:{'Content-Type':'application/json',apikey:anonKey,'Content-Length':Buffer.byteLength(lb)}},r=>{
  let d=''; r.on('data',c=>d+=c);
  r.on('end',()=>{
    const j=JSON.parse(d);
    const token=j.access_token;
    if(!token){console.log('LOGIN FAILED:',d.slice(0,200));return;}
    console.log('LOGIN OK, token length:',token.length);
    https.request({hostname:'www.ecompilotelite.com',path:'/api/automations',method:'GET',headers:{Authorization:'Bearer '+token}},r2=>{
      let d2='';r2.on('data',c=>d2+=c);
      r2.on('end',()=>{console.log('GET status:',r2.statusCode,'body:',d2.slice(0,400));});
    }).on('error',e=>console.log('ERR:',e.message)).end();
  });
}).on('error',e=>console.log('ERR:',e.message)).end(lb);
