create table if not exists public.client_defaults (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  grupo_compromisso_id uuid references public.commitment_groups(id) on delete set null,
  compromisso_id uuid references public.commitments(id) on delete set null,
  historico text,
  created_at timestamp with time zone default now(),
  unique(user_id, client_id)
);

-- Enable RLS
alter table public.client_defaults enable row level security;

-- Policies
create policy "Users can view their own client defaults"
  on public.client_defaults for select
  using (auth.uid() = user_id);

create policy "Users can insert their own client defaults"
  on public.client_defaults for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own client defaults"
  on public.client_defaults for update
  using (auth.uid() = user_id);

create policy "Users can delete their own client defaults"
  on public.client_defaults for delete
  using (auth.uid() = user_id);
