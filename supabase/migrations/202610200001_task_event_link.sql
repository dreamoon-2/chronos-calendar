-- Chronos Calendar 0.4.0: 日程与待办的关联
-- 由待办拖入时间表创建的日程会记录 task_id；把日程拖回待办时软删除日程并恢复待办。
-- 依赖 202610190001_tasks.sql 已创建 public.tasks。

alter table public.events
  add column if not exists task_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_task_same_user'
  ) then
    alter table public.events
      add constraint events_task_same_user
      foreign key (task_id, user_id)
      references public.tasks(id, user_id)
      on delete set null (task_id);
  end if;
end $$;

-- 同一待办最多只有一个未删除的日程；移回待办（软删除）后可以再次排入。
create unique index if not exists events_task_unique_active
  on public.events (task_id)
  where task_id is not null and deleted_at is null;
