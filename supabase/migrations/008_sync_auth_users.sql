-- Auto-insert into public.users when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, plan, actions_used, actions_limit, subscription_status, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    0,
    30,
    'inactive',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users into public.users
INSERT INTO public.users (id, email, plan, actions_used, actions_limit, subscription_status, created_at)
SELECT
  au.id,
  au.email,
  'free',
  0,
  30,
  'inactive',
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;
