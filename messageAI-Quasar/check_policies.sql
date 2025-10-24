SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'chats', 'chat_members', 'gyms')
ORDER BY tablename, policyname;
