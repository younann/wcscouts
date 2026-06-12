-- Promote an existing user to admin.
-- 1) Create the user via Supabase dashboard (Authentication → Add user)
-- 2) Note the user's email
-- 3) Replace below and run

update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com');

select id, username, full_name, role from public.profiles where role = 'admin';
