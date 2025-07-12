-- Test Data Setup for Team Management
-- Run this in Supabase SQL Editor to create test data

-- First, let's create a test project with proper UUID
INSERT INTO projects (id, name, description, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Test Project for Team Management',
  'This is a test project to demonstrate team management functionality',
  'active',
  NOW(),
  NOW()
) 
ON CONFLICT (id) DO NOTHING;

-- Get the project ID we just created (run this separately to see the ID)
SELECT id, name, description FROM projects WHERE name = 'Test Project for Team Management';

-- Create some test users in profiles table (if they don't exist)
INSERT INTO profiles (id, username, full_name, avatar_url, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'testuser1', 'Test User One', null, NOW(), NOW()),
  (gen_random_uuid(), 'testuser2', 'Test User Two', null, NOW(), NOW()),
  (gen_random_uuid(), 'testuser3', 'Test User Three', null, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Show the test users we created
SELECT id, username, full_name FROM profiles WHERE username LIKE 'testuser%';

-- Now let's add the current user as owner of the test project
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- You can get your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Example of adding team members (replace the UUIDs with real ones from above queries)
/*
INSERT INTO project_team_members (project_id, user_id, role, status, permissions, joined_at, created_at, updated_at)
VALUES 
  ('YOUR_PROJECT_ID_HERE', 'YOUR_USER_ID_HERE', 'owner', 'active', 
   '{"read": true, "write": true, "delete": true}'::jsonb, NOW(), NOW(), NOW()),
  ('YOUR_PROJECT_ID_HERE', 'TEST_USER_1_ID_HERE', 'member', 'active', 
   '{"read": true, "write": true, "delete": false}'::jsonb, NOW(), NOW(), NOW());
*/

-- Helper query to get your current user ID
SELECT 'Your user ID is: ' || id as user_info FROM auth.users WHERE email = auth.email();

-- Helper query to get all your projects
SELECT id, name, description, status FROM projects ORDER BY created_at DESC LIMIT 10; 