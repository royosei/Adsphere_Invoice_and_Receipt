-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  doc_type     text not null default 'invoice',        -- 'invoice' or 'receipt'
  doc_number   text,
  biz_name     text,
  biz_meta     text,
  client_name  text,
  client_addr  text,
  doc_date     date,
  due_date     date,
  currency     text default 'GH₵',
  pay_method   text,
  paid_date    date,
  discount_pct numeric default 0,
  tax_pct      numeric default 0,
  notes        text,
  items        jsonb not null default '[]',             -- [{desc, qty, price}, ...]
  created_at   timestamptz not null default now()
);

-- Row Level Security: locked by default in Supabase.
-- These policies require a logged-in (authenticated) user for every operation.
-- Anonymous visitors (no session) get no access at all.
-- Every logged-in admin can see and manage every document (shared access).
alter table documents enable row level security;

-- Drop old anon-based policies if they exist (from an earlier version of this schema)
drop policy if exists "anon can read documents" on documents;
drop policy if exists "anon can insert documents" on documents;
drop policy if exists "anon can delete documents" on documents;

create policy "authenticated can read documents"
  on documents for select
  to authenticated
  using (true);

create policy "authenticated can insert documents"
  on documents for insert
  to authenticated
  with check (true);

create policy "authenticated can update documents"
  on documents for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated can delete documents"
  on documents for delete
  to authenticated
  using (true);
