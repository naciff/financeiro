-- Create transaction_favorites table
create table if not exists public.transaction_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  operacao text,
  especie text,
  cliente_id uuid references public.clients(id) on delete set null,
  grupo_compromisso_id uuid references public.commitment_groups(id) on delete set null,
  compromisso_id uuid references public.commitments(id) on delete set null,
  historico text,
  detalhes text,
  conta_id uuid references public.accounts(id) on delete set null,
  valor numeric,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.transaction_favorites enable row level security;

-- Policies
create policy "Users can view favorites from their organization"
  on public.transaction_favorites for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = transaction_favorites.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert favorites for their organization"
  on public.transaction_favorites for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_id = transaction_favorites.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Users can delete favorites from their organization"
  on public.transaction_favorites for delete
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = transaction_favorites.organization_id
      and user_id = auth.uid()
    )
  );
