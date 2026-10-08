-- Chronos Calendar MVP schema (Supabase PostgreSQL)
-- Intended to be applied exactly once via Supabase migration tooling.
-- Timed events use timestamptz; all-day events use exclusive-end DATE ranges.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name varchar(40) not null,
  color varchar(7) not null default '#7367D8',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_nonblank check (length(btrim(name)) > 0),
  constraint categories_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint categories_user_name_unique unique (user_id, name),
  constraint categories_id_user_unique unique (id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid,
  title varchar(120) not null,
  description text not null default '',
  all_day boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  start_date date,
  end_date date,
  deleted_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_category_same_user
    foreign key (category_id, user_id)
    references public.categories(id, user_id)
    on delete set null (category_id),
  constraint events_title_nonblank check (length(btrim(title)) > 0),
  constraint events_description_length check (length(description) <= 10000),
  constraint events_version_positive check (version >= 1),
  constraint events_valid_time_shape check (
    (
      all_day = false and start_at is not null and end_at is not null
      and end_at > start_at and start_date is null and end_date is null
    )
    or
    (
      all_day = true and start_at is null and end_at is null
      and start_date is not null and end_date is not null and end_date > start_date
    )
  )
);

create index if not exists categories_user_sort_idx
  on public.categories (user_id, sort_order, name);
create index if not exists events_timed_range_idx
  on public.events (user_id, start_at, end_at)
  where deleted_at is null and all_day = false;
create index if not exists events_all_day_range_idx
  on public.events (user_id, start_date, end_date)
  where deleted_at is null and all_day = true;

-- Updated timestamp for categories; preserve ownership and primary key.
create or replace function public.chronos_touch_category()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

-- Version increment is server-side, not trusted from the client.
create or replace function public.chronos_touch_event()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger categories_before_update
before update on public.categories
for each row execute function public.chronos_touch_category();

create trigger events_before_update
before update on public.events
for each row execute function public.chronos_touch_event();

-- On an exposed public schema, apply RLS and explicit grants together.
revoke all on table public.categories from public, anon, authenticated;
revoke all on table public.events from public, anon, authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update on table public.events to authenticated;

alter table public.categories enable row level security;
alter table public.events enable row level security;

create policy categories_read_own on public.categories
for select to authenticated
using ((select auth.uid()) = user_id);

create policy categories_insert_own on public.categories
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy categories_update_own on public.categories
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy categories_delete_own on public.categories
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy events_read_own on public.events
for select to authenticated
using ((select auth.uid()) = user_id);

create policy events_insert_own on public.events
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy events_update_own on public.events
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- No DELETE policy or DELETE grant for public.events; implement deletion as
-- UPDATE events SET deleted_at = now() WHERE id = ? AND version = ?.
-- Keep the subscription on ALL event rows (not only undeleted), so soft
-- deletes still emit UPDATE and notify connected devices.

alter publication supabase_realtime add table public.categories, public.events;
