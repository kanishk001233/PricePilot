-- SQL migration to ensure users table has the role column
-- Run this in your Supabase SQL Editor:

-- 1. Add the role column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Viewer';

-- 2. Ensure existing users have a default role assigned if it's currently NULL
UPDATE users SET role = 'Viewer' WHERE role IS NULL;

-- 3. (Optional) Example: Update a specific user to be an Admin
-- UPDATE users SET role = 'Admin' WHERE email = 'admin@example.com';
