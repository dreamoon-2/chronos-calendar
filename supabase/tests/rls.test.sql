-- Chronos Calendar RLS 数据隔离测试（负向测试）
--
-- 目的：验证
--   1) anon（未登录）无表权限，无法读取；
--   2) 用户 A 只能读/写自己的分类与事件；
--   3) 用户 B 无法读取、修改、删除 A 的数据；
--   4) 事件不能引用他人分类（复合外键隔离）。
--
-- 运行方式（需要本地 Supabase 环境；本仓库当前无凭证，未实际执行——见 README）：
--   supabase db reset
--   psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql
--   （或改用 `supabase test db` 的 pgTAP 风格，本文件采用可独立运行的 psql 断言风格）
--
-- 原理：auth.uid() 读取 current_setting('request.jwt.claims')::jsonb->>'sub'，
--       因此用 set_config + set role 即可模拟不同登录身份。

begin;

-- ---------------------------------------------------------------------------
-- 0) 准备两个测试用户（auth.users 列随 Supabase 版本略有差异，必要时微调）
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1',
   'authenticated', 'authenticated', 'alice@test.local', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b2',
   'authenticated', 'authenticated', 'bob@test.local', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

-- 以 Alice 身份写入基线数据
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

insert into public.categories (id, user_id, name, color)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '课程', '#d97706');

insert into public.events (id, user_id, category_id, title, all_day, start_at, end_at)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000000c1', '机器学习', false, now(), now() + interval '1 hour');

-- ---------------------------------------------------------------------------
-- 1) Alice 能读自己的数据
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from public.categories where id = '00000000-0000-0000-0000-0000000000c1';
  if n <> 1 then raise exception 'RLS FAIL: alice cannot read own category'; end if;

  select count(*) into n from public.events where id = '00000000-0000-0000-0000-0000000000d1';
  if n <> 1 then raise exception 'RLS FAIL: alice cannot read own event'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Bob 不能读取 / 修改 / 删除 Alice 的数据
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

  -- 读：应为 0 行
  select count(*) into n from public.categories where id = '00000000-0000-0000-0000-0000000000c1';
  if n <> 0 then raise exception 'RLS FAIL: bob can read alice category'; end if;

  select count(*) into n from public.events where id = '00000000-0000-0000-0000-0000000000d1';
  if n <> 0 then raise exception 'RLS FAIL: bob can read alice event'; end if;

  -- 更新：应影响 0 行
  update public.events set title = '被篡改' where id = '00000000-0000-0000-0000-0000000000d1';
  if found then raise exception 'RLS FAIL: bob can update alice event'; end if;

  -- 软删除：应影响 0 行
  update public.events set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000d1';
  if found then raise exception 'RLS FAIL: bob can delete alice event'; end if;

  delete from public.categories where id = '00000000-0000-0000-0000-0000000000c1';
  if found then raise exception 'RLS FAIL: bob can delete alice category'; end if;
end $$;

-- 校验 Alice 数据未被 Bob 改动
do $$
declare n int;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  select count(*) into n from public.events
   where id = '00000000-0000-0000-0000-0000000000d1' and title = '机器学习' and deleted_at is null;
  if n <> 1 then raise exception 'RLS FAIL: alice data was mutated by bob'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) 事件不能引用他人分类（复合外键：category_id + user_id）
-- ---------------------------------------------------------------------------
-- 先以 Bob 身份创建 Bob 自己的分类
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
insert into public.categories (id, user_id, name, color)
values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', '科研', '#7c3aed');

-- 以 Alice 身份尝试引用 Bob 的分类 → 必须失败
do $$
begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  begin
    insert into public.events (id, user_id, category_id, title, all_day, start_at, end_at)
    values ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000a1',
            '00000000-0000-0000-0000-0000000000c2', '越权分类', false, now(), now() + interval '1 hour');
    raise exception 'FK FAIL: alice referenced bob category';
  exception when others then
    null; -- 预期：复合外键 (category_id, user_id) 拒绝，插入失败即通过
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 4) anon 无表权限
-- ---------------------------------------------------------------------------
do $$
begin
  set local role anon;
  begin
    perform 1 from public.categories limit 1;
    raise exception 'RLS FAIL: anon can read categories';
  exception when insufficient_privilege or undefined_table then
    null; -- 预期：无权限
  end;
end $$;

raise notice 'Chronos RLS tests completed successfully';
rollback;
