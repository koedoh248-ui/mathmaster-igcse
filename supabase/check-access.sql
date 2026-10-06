-- Disposable fixtures exist only within this rolled-back transaction.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001','mm-check-1@example.invalid','{"name":"Access test one"}'),
 ('10000000-0000-0000-0000-000000000002','mm-check-2@example.invalid','{"name":"Access test two"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare result jsonb;
begin
 result:=public.mm_bootstrap();
 if jsonb_array_length(result->'users')<>1 then raise exception 'FAIL: learner can see other profiles'; end if;
 perform public.mm_save_profile('10000000-0000-0000-0000-000000000001','{"xp":15}','{"xp":0}');
 begin
  perform public.mm_save_profile('10000000-0000-0000-0000-000000000002','{"xp":15}','{"xp":0}');
  raise exception 'FAIL: cross-account update was accepted';
 exception when others then if SQLERRM like 'FAIL:%' then raise; end if; end;
 begin
  perform public.mm_save_content('{"questions":[],"lessons":[]}',0);
  raise exception 'FAIL: student could publish content';
 exception when others then if SQLERRM like 'FAIL:%' then raise; end if; end;
 begin
  perform public.mm_save_profile('10000000-0000-0000-0000-000000000001','{"xp":99}','{"xp":0}');
  raise exception 'FAIL: stale update was accepted';
 exception when others then if SQLERRM like 'FAIL:%' then raise; end if; end;
 if has_table_privilege('authenticated','public.mm_admins','INSERT') then raise exception 'FAIL: students can assign admins'; end if;
 if has_function_privilege('anon','public.mm_bootstrap()','EXECUTE') then raise exception 'FAIL: anonymous profile access'; end if;
end;
$$;
reset role;
rollback;
select 'PASS: own profile saves; other profiles, content publishing, stale writes and anonymous access blocked; test data rolled back' as result;
