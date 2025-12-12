-- Create table if it doesn't exist
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Enable RLS (idempotent)
alter table public.messages enable row level security;

-- Create policy for public read access if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'messages' 
    and policyname = 'Allow public read access'
  ) then
    create policy "Allow public read access"
      on public.messages
      for select
      using (true);
  end if;
end
$$;

-- Insert default messages if table is empty
do $$
begin
  if not exists (select 1 from public.messages) then
    insert into public.messages (content) values
      ('Se quer ter sucesso completo em sua vida, você tem que ser foda.'),
      ('O único lugar onde o sucesso vem antes do trabalho é no dicionário.'),
      ('Não espere por oportunidades, crie-as.'),
      ('O sucesso é a soma de pequenos esforços repetidos dia após dia.'),
      ('Acredite que você pode, assim você já está no meio do caminho.'),
      ('O fracasso é apenas a oportunidade de recomeçar de novo com mais inteligência.'),
      ('Não tenha medo de desistir do bom para perseguir o ótimo.'),
      ('A persistência é o caminho do êxito.'),
      ('Grandes coisas nunca vêm de zonas de conforto.');
  end if;
end
$$;
