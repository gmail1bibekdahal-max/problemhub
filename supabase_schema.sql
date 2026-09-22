-- ==============================================================================
-- ProblemHub Complete Supabase Database Schema & Seed Data
-- ==============================================================================
-- Run this entire script in your Supabase Dashboard:
-- 1. Go to your Supabase Project: https://supabase.com/dashboard
-- 2. Click "SQL Editor" on the left menu
-- 3. Click "New Query", paste this entire script, and click "Run"
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "pgcrypto";

-- 2. Create problemhub_posts Table
create table if not exists public.problemhub_posts (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  author_name text not null,
  author_initials text,
  author_accent text default 'avatar-blue',
  title text not null,
  category text not null default 'Marketing',
  description text not null,
  frequency text default 'Weekly',
  time_wasted text default '4–5 hours',
  current_solution text default 'Excel + manual exports',
  impact text default 'High',
  impact_detail text default '(budget allocation)',
  looking_for text[] default array['advice', 'existing tools', 'build a solution'],
  comments_count integer default 0,
  people_count integer default 1,
  problem_votes integer default 0,
  solution_votes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration helpers for existing databases:
alter table public.problemhub_posts add column if not exists problem_votes integer default 0;
alter table public.problemhub_posts add column if not exists solution_votes integer default 0;

-- 3. Create problemhub_comments Table (Supports nested replies)
create table if not exists public.problemhub_comments (
  id text primary key default gen_random_uuid()::text,
  problem_id text not null references public.problemhub_posts(id) on delete cascade,
  parent_id text,
  user_id text not null,
  author_name text not null,
  author_initials text,
  author_accent text default 'avatar-emerald',
  text text not null,
  likes_count integer default 0,
  is_op boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create problemhub_products Table (Dynamic Sponsored Products)
create table if not exists public.problemhub_products (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  description text not null,
  class_name text not null default 'product-blue',
  mark text not null default '★',
  url text default '#',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create problemhub_saved Table (User Bookmarks)
create table if not exists public.problemhub_saved (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  problem_id text not null references public.problemhub_posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, problem_id)
);

-- 6. Create problemhub_product_requests Table (Product sponsor submissions: website & email)
create table if not exists public.problemhub_product_requests (
  id text primary key default gen_random_uuid()::text,
  website text not null,
  email text not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create problemhub_reactions Table (Dynamic Problem & Solution votes / reactions)
create table if not exists public.problemhub_reactions (
  id text primary key default gen_random_uuid()::text,
  problem_id text not null references public.problemhub_posts(id) on delete cascade,
  user_id text not null,
  reaction_type text not null check (reaction_type in ('problem', 'solution')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(problem_id, user_id)
);

-- ==============================================================================
-- 8. Enable Row Level Security (RLS) & Policies
-- ==============================================================================

alter table public.problemhub_posts enable row level security;
alter table public.problemhub_comments enable row level security;
alter table public.problemhub_products enable row level security;
alter table public.problemhub_saved enable row level security;
alter table public.problemhub_product_requests enable row level security;
alter table public.problemhub_reactions enable row level security;

-- Posts Policies (Public read-only, Authenticated write)
drop policy if exists "Public can view posts" on public.problemhub_posts;
create policy "Public can view posts" on public.problemhub_posts for select using (true);

drop policy if exists "Anyone can insert posts" on public.problemhub_posts;
drop policy if exists "Authenticated users can insert posts" on public.problemhub_posts;
create policy "Authenticated users can insert posts" on public.problemhub_posts for insert with check (auth.uid() is not null and user_id = auth.uid()::text);

drop policy if exists "Anyone can update posts" on public.problemhub_posts;
drop policy if exists "Authenticated users can update posts" on public.problemhub_posts;
create policy "Authenticated users can update posts" on public.problemhub_posts for update using (auth.uid() is not null);

-- Comments Policies (Public read-only, Authenticated write)
drop policy if exists "Public can view comments" on public.problemhub_comments;
create policy "Public can view comments" on public.problemhub_comments for select using (true);

drop policy if exists "Anyone can insert comments" on public.problemhub_comments;
drop policy if exists "Authenticated users can insert comments" on public.problemhub_comments;
create policy "Authenticated users can insert comments" on public.problemhub_comments for insert with check (auth.uid() is not null and user_id = auth.uid()::text);

drop policy if exists "Anyone can update comments" on public.problemhub_comments;
drop policy if exists "Authenticated users can update comments" on public.problemhub_comments;
create policy "Authenticated users can update comments" on public.problemhub_comments for update using (auth.uid() is not null);

-- Products Policies
drop policy if exists "Public can view products" on public.problemhub_products;
create policy "Public can view products" on public.problemhub_products for select using (true);

drop policy if exists "Anyone can insert products" on public.problemhub_products;
drop policy if exists "Authenticated users can insert products" on public.problemhub_products;
create policy "Authenticated users can insert products" on public.problemhub_products for insert with check (auth.uid() is not null);

-- Saved Posts Policies (User-isolated bookmarks)
drop policy if exists "Public can view saved" on public.problemhub_saved;
drop policy if exists "Users can view their own saved" on public.problemhub_saved;
create policy "Users can view their own saved" on public.problemhub_saved for select using (auth.uid() is not null and user_id = auth.uid()::text);

drop policy if exists "Anyone can insert saved" on public.problemhub_saved;
drop policy if exists "Authenticated users can insert saved" on public.problemhub_saved;
create policy "Authenticated users can insert saved" on public.problemhub_saved for insert with check (auth.uid() is not null and user_id = auth.uid()::text);

drop policy if exists "Anyone can delete saved" on public.problemhub_saved;
drop policy if exists "Users can delete their own saved" on public.problemhub_saved;
create policy "Users can delete their own saved" on public.problemhub_saved for delete using (auth.uid() is not null and user_id = auth.uid()::text);

-- Product Requests Policies
drop policy if exists "Public can view product requests" on public.problemhub_product_requests;
drop policy if exists "Authenticated users can view product requests" on public.problemhub_product_requests;
create policy "Authenticated users can view product requests" on public.problemhub_product_requests for select using (auth.uid() is not null);

drop policy if exists "Anyone can insert product requests" on public.problemhub_product_requests;
drop policy if exists "Authenticated users can insert product requests" on public.problemhub_product_requests;
create policy "Authenticated users can insert product requests" on public.problemhub_product_requests for insert with check (auth.uid() is not null);

-- Reactions Policies (Problem & Solution Votes)
drop policy if exists "Public can view reactions" on public.problemhub_reactions;
create policy "Public can view reactions" on public.problemhub_reactions for select using (true);

drop policy if exists "Anyone can insert reactions" on public.problemhub_reactions;
drop policy if exists "Authenticated users can insert reactions" on public.problemhub_reactions;
create policy "Authenticated users can insert reactions" on public.problemhub_reactions for insert with check (auth.uid() is not null and user_id = auth.uid()::text);

drop policy if exists "Anyone can update reactions" on public.problemhub_reactions;
drop policy if exists "Authenticated users can update reactions" on public.problemhub_reactions;
create policy "Authenticated users can update reactions" on public.problemhub_reactions for update using (auth.uid() is not null and user_id = auth.uid()::text);

drop policy if exists "Anyone can delete reactions" on public.problemhub_reactions;
drop policy if exists "Authenticated users can delete reactions" on public.problemhub_reactions;
create policy "Authenticated users can delete reactions" on public.problemhub_reactions for delete using (auth.uid() is not null and user_id = auth.uid()::text);

-- ==============================================================================
-- Schema Complete & Ready
-- ==============================================================================
-- All tables and policies are prepared for 100% dynamic usage.
-- Posts, comments, bookmarks, sponsored products, and advertiser requests
-- will be populated dynamically directly by users via the web application.


