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
    console.log('LOGIN OK');

    // GET test
    https.request({hostname:'www.ecompilotelite.com',path:'/api/automations',method:'GET',headers:{Authorization:'Bearer '+token}},r2=>{
      let d2='';r2.on('data',c=>d2+=c);
      r2.on('end',()=>{console.log('GET',r2.statusCode,d2.slice(0,300));});
    }).on('error',e=>console.log('GET ERR:',e.message)).end();

    // POST create
    const pb = JSON.stringify({name:'Auto Test '+Date.now(),type:'seo',config:{limit:5}});
    const pr = https.request({hostname:'www.ecompilotelite.com',path:'/api/automations',method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(pb)}},r3=>{
      let d3='';r3.on('data',c=>d3+=c);
      r3.on('end',()=>{
        console.log('POST',r3.statusCode,d3.slice(0,400));
        const created = JSON.parse(d3);
        if(created.automation?.id){
          // DELETE the test automation
          const db = JSON.stringify({id:created.automation.id});
          const dr = https.request({hostname:'www.ecompilotelite.com',path:'/api/automations',method:'DELETE',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(db)}},r4=>{
            let d4='';r4.on('data',c=>d4+=c);r4.on('end',()=>console.log('DELETE',r4.statusCode,d4));
          });
          dr.on('error',e=>console.log('DEL ERR:',e.message));dr.end(db);
        }
      });
    });
    pr.on('error',e=>console.log('POST ERR:',e.message));pr.end(pb);
  });
}).on('error',e=>console.log('ERR:',e.message)).end(lb);

