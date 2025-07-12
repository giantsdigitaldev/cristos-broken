-- AUTOMATIC Test Data Setup for Team Management
-- This version automatically gets your user ID and creates everything
-- Just copy and paste this ENTIRE block and run it once

DO $$
DECLARE
    current_user_id UUID;
    new_project_id UUID;
BEGIN
    -- Get the current authenticated user's ID
    SELECT auth.uid() INTO current_user_id;
    
    -- If no authenticated user, get the first user from auth.users
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id FROM auth.users LIMIT 1;
    END IF;
    
    -- Generate a new project ID
    new_project_id := gen_random_uuid();
    
    -- Create the test project
    INSERT INTO projects (id, user_id, name, description, status, created_at, updated_at)
    VALUES (
        new_project_id,
        current_user_id,
        'Test Project for Team Management',
        'This is a test project to demonstrate team management functionality',
        'active',
        NOW(),
        NOW()
    );
    
    -- Add the user as project owner in team members
    INSERT INTO project_team_members (project_id, user_id, role, status, permissions, joined_at, created_at, updated_at)
    VALUES (
        new_project_id,
        current_user_id,
        'owner',
        'active',
        '{"read": true, "write": true, "delete": true}'::jsonb,
        NOW(),
        NOW(),
        NOW()
    );
    
    -- Create some test users for inviting
    INSERT INTO profiles (id, username, full_name, avatar_url, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), 'testuser1', 'Test User One', null, NOW(), NOW()),
        (gen_random_uuid(), 'testuser2', 'Test User Two', null, NOW(), NOW()),
        (gen_random_uuid(), 'testuser3', 'Test User Three', null, NOW(), NOW())
    ON CONFLICT (username) DO NOTHING;
    
    -- Output the results
    RAISE NOTICE 'SUCCESS! Created project with ID: %', new_project_id;
    RAISE NOTICE 'User ID: %', current_user_id;
    
END $$;

-- Now get your project ID to use in the app
SELECT 
    id as "📋 COPY THIS PROJECT ID",
    name as project_name,
    user_id as owner_id
FROM projects 
WHERE name = 'Test Project for Team Management'
ORDER BY created_at DESC 
LIMIT 1;

-- Verify team members were created
SELECT 
    'Team member created successfully!' as status,
    ptm.role,
    ptm.status,
    u.email as member_email
FROM project_team_members ptm
JOIN auth.users u ON ptm.user_id = u.id
WHERE ptm.project_id = (
    SELECT id FROM projects 
    WHERE name = 'Test Project for Team Management' 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Test the team function
SELECT 
    '🧪 Testing team function...' as test_status,
    *
FROM get_project_team_members(
    (SELECT id FROM projects WHERE name = 'Test Project for Team Management' ORDER BY created_at DESC LIMIT 1)
); 