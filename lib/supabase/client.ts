import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    'https://mhroujagzclmdlfpiqju.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocm91amFnemNsbWRsZnBpcWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzA3NzEsImV4cCI6MjA4NzcwNjc3MX0.UbS3JCpRs24JVbT-sjK_Xx1pkoZVVQSjC-qUZaAIOW8'
  );
}