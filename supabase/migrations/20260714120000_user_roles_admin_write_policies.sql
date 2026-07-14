-- Admins must be able to provision/modify roles from the app UI.
-- Root cause of "user creation failed": public.user_roles had ONLY a
-- SELECT-own policy, so every inviteUser()/changeRole() write was
-- silently denied by RLS (the app never checked the error).
--
-- is_admin() is SECURITY DEFINER, so it reads user_roles without RLS
-- recursion. with_check(is_admin()) also prevents privilege escalation:
-- a non-admin cannot insert/update a row (verified: reservation user
-- INSERT is DENIED by RLS).

drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert on public.user_roles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update on public.user_roles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete on public.user_roles
  for delete to authenticated
  using (public.is_admin());
