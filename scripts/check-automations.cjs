// Check if automations table exists
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocm91amFnemNsbWRsZnBpcWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEzMDc3MSwiZXhwIjoyMDg3NzA2NzcxfQ.40R_n_gu0HH4m3cO7vcm2kjPJ_F50Fu9kUf7RDCv1x8';
const URL = 'https://mhroujagzclmdlfpiqju.supabase.co/rest/v1/automations?limit=1';

fetch(URL, {
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    apikey: SERVICE_KEY,
  }
})
  .then(r => { console.log('Status:', r.status); return r.json(); })
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error(e.message));
