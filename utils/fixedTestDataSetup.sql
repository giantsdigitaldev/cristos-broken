-- FIXED Test Data Setup for Team Management
-- Run these commands ONE BY ONE in Supabase SQL Editor

-- STEP 1: Get your current user ID first
SELECT id as your_user_id, email FROM auth.users WHERE email = auth.email();

-- STEP 2: Create a test project with YOUR user ID as owner
-- Replace 'YOUR_USER_ID_HERE' with the ID from Step 1
INSERT INTO projects (id, user_id, name, description, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID_HERE',  -- Replace this with your actual user ID from Step 1
  'Test Project for Team Management',
  'This is a test project to demonstrate team management functionality',
  'active',
  NOW(),
  NOW()
);

-- STEP 3: Get the project ID we just created
SELECT id as project_id, name, user_id FROM projects WHERE name = 'Test Project for Team Management';

-- STEP 4: Add yourself as the project owner in team members
-- Replace both placeholders with the actual IDs from previous steps
INSERT INTO project_team_members (project_id, user_id, role, status, permissions, joined_at, created_at, updated_at)
VALUES (
  'PROJECT_ID_FROM_STEP_3',  -- Replace with project ID from Step 3
  'YOUR_USER_ID_FROM_STEP_1',  -- Replace with your user ID from Step 1
  'owner',
  'active',
  '{"read": true, "write": true, "delete": true}'::jsonb,
  NOW(),
  NOW(),
  NOW()
);

-- STEP 5: Create some test users for inviting (optional)
INSERT INTO profiles (id, username, full_name, avatar_url, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'testuser1', 'Test User One', null, NOW(), NOW()),
  (gen_random_uuid(), 'testuser2', 'Test User Two', null, NOW(), NOW()),
  (gen_random_uuid(), 'testuser3', 'Test User Three', null, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- STEP 6: Verify everything worked
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.user_id as project_owner,
  u.email as owner_email
FROM projects p
JOIN auth.users u ON p.user_id = u.id
WHERE p.name = 'Test Project for Team Management';

-- STEP 7: Check team members
SELECT 
  ptm.*,
  u.email as member_email
FROM project_team_members ptm
JOIN auth.users u ON ptm.user_id = u.id
WHERE ptm.project_id = (SELECT id FROM projects WHERE name = 'Test Project for Team Management');

-- STEP 8: Test the team function
SELECT * FROM get_project_team_members(
  (SELECT id FROM projects WHERE name = 'Test Project for Team Management')
); 