alter table public.experiments enable row level security;
alter table public.variants enable row level security;
alter table public.visits enable row level security;

create policy "experiments_select_own"
on public.experiments
for select
to authenticated
using (auth.uid() = user_id);

create policy "experiments_insert_own"
on public.experiments
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "experiments_update_own"
on public.experiments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "experiments_delete_own"
on public.experiments
for delete
to authenticated
using (auth.uid() = user_id);

create policy "variants_select_when_owner"
on public.variants
for select
to authenticated
using (
  exists (
    select 1
    from public.experiments
    where public.experiments.id = public.variants.experiment_id
      and public.experiments.user_id = auth.uid()
  )
);

create policy "visits_insert_anyone"
on public.visits
for insert
to anon, authenticated
with check (true);

create policy "visits_select_when_owner"
on public.visits
for select
to authenticated
using (
  exists (
    select 1
    from public.experiments
    where public.experiments.id = public.visits.experiment_id
      and public.experiments.user_id = auth.uid()
  )
);
