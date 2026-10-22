-- Chronos Calendar 0.4.0: 待办清单
-- 待办可拖入时间表生成日程；放下后由前端标记为完成。
-- 结构与 events/categories 保持同一套 RLS、审计字段与 Realtime 约定。

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title varchar(120) not null,
  notes text not null default '',
  done boolean not null default false,
  estimated_minutes integer not null default 60,
  category_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_nonblank check (length(btrim(title)) > 0),
  constraint tasks_notes_length check (length(notes) <= 5000),
  constraint tasks_estimated_minutes_range check (estimated_minutes between 15 and 480),
  constraint tasks_category_same_user
    foreign key (category_id, user_id)
    references public.categories(id, user_id)
    on delete set null (category_id),
  constraint tasks_id_user_unique unique (id, user_id)
);

create index if not exists tasks_user_done_created_idx
  on public.tasks (user_id, done, created_at desc);

-- 只维护 updated_at；id、user_id 与 created_at 不允许客户端改写。
create or replace function public.chronos_touch_task()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tasks_before_update on public.tasks;
create trigger tasks_before_update
before update on public.tasks
for each row execute function public.chronos_touch_task();

revoke all on table public.tasks from public, anon, authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

alter table public.tasks enable row level security;

drop policy if exists tasks_read_own on public.tasks;
create policy tasks_read_own on public.tasks
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own on public.tasks
for delete to authenticated
using ((select auth.uid()) = user_id);

-- 订阅改为在 useEventsRealtime 中同时监听 tasks；加入 publication 后 Realtime 才会推送。
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    execute 'alter publication supabase_realtime add table public.tasks';
  end if;
end $$;
