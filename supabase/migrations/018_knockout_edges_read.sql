-- Let signed-in users read the bracket structure so the /bracket page can draw
-- the tree. The edges are not sensitive (they're the public tournament shape);
-- writes stay admin-only via the existing knockout_edges_admin policy.

drop policy if exists knockout_edges_select_all on public.knockout_edges;
create policy knockout_edges_select_all on public.knockout_edges
  for select using (auth.uid() is not null);
