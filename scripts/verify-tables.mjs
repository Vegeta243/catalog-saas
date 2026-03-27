import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mhroujagzclmdlfpiqju.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocm91amFnemNsbWRsZnBpcWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEzMDc3MSwiZXhwIjoyMDg3NzA2NzcxfQ.40R_n_gu0HH4m3cO7vcm2kjPJ_F50Fu9kUf7RDCv1x8',
  { auth: { persistSession: false } }
)

// Check existing tables
const { data, error } = await supabase.from('automation_rules').select('id').limit(1)
console.log('automation_rules:', error ? 'ERROR: ' + error.message : 'EXISTS, rows available')

const { data: d2, error: e2 } = await supabase.from('calendar_events').select('id').limit(1)
console.log('calendar_events:', e2 ? 'ERROR: ' + e2.message : 'EXISTS, rows available')
