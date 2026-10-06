-- MathMaster shared backend. Run once in the Supabase SQL editor.
-- No service-role key is used by the website.
begin;
create table public.mm_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique,
 profile jsonb not null default '{}'::jsonb,
 revision bigint not null default 0,
 managed_revision bigint not null default 0
);
create table public.mm_admins (
 singleton boolean primary key default true check(singleton),
 user_id uuid not null unique references auth.users(id) on delete cascade
);
create table public.mm_content (
 singleton boolean primary key default true check(singleton),
 content jsonb not null default '{"questions":[],"lessons":[]}',
 revision bigint not null default 0
);
insert into public.mm_content(singleton) values(true);
create table public.mm_messages (
 id uuid primary key,
 learner_id uuid not null references public.mm_profiles(id) on delete cascade,
 sender_id uuid not null references public.mm_profiles(id) on delete cascade,
 body text not null check(length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
alter table public.mm_profiles enable row level security;
alter table public.mm_admins enable row level security;
alter table public.mm_content enable row level security;
alter table public.mm_messages enable row level security;
revoke all on public.mm_profiles, public.mm_admins, public.mm_content, public.mm_messages from anon, authenticated;

create function public.mm_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.mm_admins where user_id = auth.uid());
$$;
revoke all on function public.mm_is_admin() from public;
grant execute on function public.mm_is_admin() to authenticated;

create function public.mm_create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.mm_profiles(id,email,profile) values(new.id,lower(new.email),jsonb_build_object(
 'name',left(coalesce(new.raw_user_meta_data->>'name','Learner'),100),'email',lower(new.email),
 'board','Cambridge IGCSE','target','A','examDate','','confidence','Average','goals',jsonb_build_array('Improve my grade'),
 'completedLessons','[]'::jsonb,'questionsCompleted',0,'xp',0,'streak',0,'lastActive',null,
 'attempts','[]'::jsonb,'mistakes','[]'::jsonb,'exams','[]'::jsonb,'topicScores','{}'::jsonb,
 'dailyChallenges','[]'::jsonb,'studyPlan',null,'xpLedger','[]'::jsonb,'achievements','[]'::jsonb,'hideLeaderboard',false,'level',1) ||
 case when jsonb_typeof(new.raw_user_meta_data->'profile')='object' then new.raw_user_meta_data->'profile' else '{}'::jsonb end || jsonb_build_object('email',lower(new.email)));
 return new;
end; $$;
revoke all on function public.mm_create_profile() from public;
create trigger mm_profile_created after insert on auth.users for each row execute function public.mm_create_profile();

create function public.mm_bootstrap() returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; admin boolean := public.mm_is_admin();
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select jsonb_build_object('users',coalesce((select jsonb_agg(jsonb_build_object(
 'id',p.id,'email',p.email,'role',case when exists(select 1 from public.mm_admins a where a.user_id=p.id) then 'admin' else 'student' end,
 'profile',p.profile,'revision',p.revision,'managedProfileRevision',p.managed_revision)) from public.mm_profiles p
 where p.id=auth.uid() or admin),'[]'::jsonb),
 'currentEmail',(select email from public.mm_profiles where id=auth.uid()),
 'content',c.content,'contentRevision',c.revision,
 'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'learnerEmail',p.email,'senderEmail',s.email,
 'senderRole',case when exists(select 1 from public.mm_admins a where a.user_id=m.sender_id) then 'admin' else 'student' end,
 'body',m.body,'date',m.created_at) order by m.created_at) from public.mm_messages m
 join public.mm_profiles p on p.id=m.learner_id join public.mm_profiles s on s.id=m.sender_id
 where m.learner_id=auth.uid() or admin),'[]'::jsonb)) into result from public.mm_content c;
 return result;
end; $$;

-- Compare the base value of each changed field to avoid overwriting another device.
create function public.mm_save_profile(p_id uuid,p_patch jsonb,p_base jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.mm_profiles; k text; admin boolean := public.mm_is_admin(); managed boolean := false;
begin
 if auth.uid() is null or (auth.uid()<>p_id and not admin) then raise exception 'Access denied'; end if;
 if jsonb_typeof(p_patch)<>'object' or jsonb_typeof(p_base)<>'object' or octet_length(p_patch::text)>5000000 then raise exception 'Invalid profile'; end if;
 select * into strict saved from public.mm_profiles where id=p_id for update;
 for k in select jsonb_object_keys(p_patch) loop
  if k='email' or length(k)>100 then raise exception 'Protected profile field'; end if;
  if saved.profile->k is distinct from p_base->k then raise exception 'Progress changed on another device. Your pending changes are kept locally. Reload after resolving the conflict.'; end if;
  if k in ('name','board','target','examDate','goals','confidence','paperLevel') and admin and p_id<>auth.uid() then managed := true; end if;
 end loop;
 update public.mm_profiles set profile=profile||p_patch,revision=revision+1,
 managed_revision=managed_revision+case when managed then 1 else 0 end where id=p_id returning * into saved;
 return jsonb_build_object('revision',saved.revision,'managedProfileRevision',saved.managed_revision);
end; $$;
create function public.mm_save_content(p_content jsonb,p_revision bigint) returns bigint language plpgsql security definer set search_path = '' as $$
declare result bigint;
begin
 if not public.mm_is_admin() then raise exception 'Administrator access required'; end if;
 if jsonb_typeof(p_content->'questions')<>'array' or jsonb_typeof(p_content->'lessons')<>'array' or octet_length(p_content::text)>5000000 then raise exception 'Invalid content'; end if;
 update public.mm_content set content=p_content,revision=revision+1 where revision=p_revision returning revision into result;
 if result is null then raise exception 'Content changed in another session. Pending changes are kept locally.'; end if;
 return result;
end; $$;
create function public.mm_send_message(p_id uuid,p_learner uuid,p_body text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or (p_learner<>auth.uid() and not public.mm_is_admin()) then raise exception 'Access denied'; end if;
 insert into public.mm_messages(id,learner_id,sender_id,body) values(p_id,p_learner,auth.uid(),trim(p_body)) on conflict(id) do nothing;
end; $$;
revoke all on function public.mm_bootstrap(), public.mm_save_profile(uuid,jsonb,jsonb), public.mm_save_content(jsonb,bigint), public.mm_send_message(uuid,uuid,text) from public;
grant execute on function public.mm_bootstrap(), public.mm_save_profile(uuid,jsonb,jsonb), public.mm_save_content(jsonb,bigint), public.mm_send_message(uuid,uuid,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('mathmaster-work','mathmaster-work',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy mm_work_read on storage.objects for select to authenticated using(bucket_id='mathmaster-work' and ((storage.foldername(name))[1]=auth.uid()::text or public.mm_is_admin()));
create policy mm_work_insert on storage.objects for insert to authenticated with check(bucket_id='mathmaster-work' and (storage.foldername(name))[1]=auth.uid()::text);
create policy mm_work_delete on storage.objects for delete to authenticated using(bucket_id='mathmaster-work' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
