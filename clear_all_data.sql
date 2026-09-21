-- ==============================================================================
-- ProblemHub: Clear All Data (Production Reset Script)
-- ==============================================================================
-- This script completely resets your ProblemHub project for production launch:
-- - Deletes all user posts / problems
-- - Deletes all comments and replies
-- - Deletes all Problem and Solution reaction votes
-- - Deletes all bookmarks / saved posts
-- - Deletes all advertiser sponsor requests
-- - Deletes all registered test user accounts and authentication sessions
-- ==============================================================================
-- HOW TO RUN:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your ProblemHub project
-- 3. Click "SQL Editor" on the left navigation menu
-- 4. Click "New Query", paste this entire script, and click "Run"
-- ==============================================================================

-- 1. Clear all user reaction votes (Problem & Solution votes)
TRUNCATE TABLE public.problemhub_reactions CASCADE;

-- 2. Clear all comments and replies
TRUNCATE TABLE public.problemhub_comments CASCADE;

-- 3. Clear all user bookmarks / saved posts
TRUNCATE TABLE public.problemhub_saved CASCADE;

-- 4. Clear all user-submitted problems / posts
TRUNCATE TABLE public.problemhub_posts CASCADE;

-- 5. Clear all advertiser / sponsor product requests
TRUNCATE TABLE public.problemhub_product_requests CASCADE;

-- 6. (Optional) Clear sponsored products if you want a clean slate:
-- Uncomment the line below if you also want to remove default sponsored tools:
-- TRUNCATE TABLE public.problemhub_products CASCADE;

-- 7. Delete all registered test user accounts and sessions from Supabase Auth
DELETE FROM auth.users;

-- ==============================================================================
-- Data wipe complete! ProblemHub is now completely clean and ready for launch.
-- ==============================================================================
