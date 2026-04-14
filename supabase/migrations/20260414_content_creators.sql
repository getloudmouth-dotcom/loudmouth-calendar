create table content_creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

alter table content_creators enable row level security;

create policy "Authenticated users can read creators"
  on content_creators for select to authenticated using (true);

create policy "Authenticated users can manage creators"
  on content_creators for all to authenticated using (true) with check (true);
