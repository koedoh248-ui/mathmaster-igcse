-- Run only after the owner has created and confirmed their WEBSITE account.
-- The Supabase dashboard/GitHub login is a separate account.
do $$
declare owner_id uuid;
begin
 select id into strict owner_id from auth.users
 where lower(email)='koedoh248@gmail.com' and email_confirmed_at is not null;
 if exists(select 1 from public.mm_admins where user_id<>owner_id) then
  raise exception 'A different main administrator already exists';
 end if;
 insert into public.mm_admins(singleton,user_id) values(true,owner_id)
 on conflict(singleton) do nothing;
end;
$$;
