-- Create or replace function to safely delete a user and all related data
-- This function should be called with SECURITY DEFINER to ensure it runs with proper permissions
create or replace function delete_user(uid uuid)
returns void
language sql
security definer
as $$
  -- Delete user preferences first (foreign key constraint)
  delete from user_preferences where user_id = uid;
  
  -- Delete user profile
  delete from user_profiles where id = uid;
  
  -- Delete from auth.users (this will cascade to other auth-related tables)
  delete from auth.users where id = uid;
$$;

-- Grant execute permission to authenticated users on their own data
grant execute on function delete_user(uuid) to authenticated;
