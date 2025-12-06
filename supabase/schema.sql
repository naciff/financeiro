create type operation_type as enum ('despesa','receita','aporte','retirada','transferencia');
create type transaction_status as enum ('agendado','pendente','atrasado','pago','recebido','cancelado');
create type schedule_type as enum ('fixo','variavel');
create type payment_method as enum ('dinheiro','transferencia','deposito','boleto','cartao_credito','debito_automatico','cartao_debito','pix');
create type period_type as enum ('mensal','anual');

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('banco','carteira','caixa','pix','cartao','outros')),
  saldo_inicial numeric(14,2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

create table cost_centers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  descricao text,
  unique (user_id, nome)
);

create table cashboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  unique (user_id, nome)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  documento text,
  email text,
  telefone text
);

create table commitment_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  unique (user_id, nome)
);

create table commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grupo_id uuid references commitment_groups(id) on delete set null,
  nome text not null,
  unique (user_id, nome)
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operacao operation_type not null,
  tipo schedule_type not null,
  especie payment_method not null,
  ano_mes_inicial date not null,
  favorecido_id uuid references clients(id) on delete set null,
  grupo_compromisso_id uuid references commitment_groups(id) on delete set null,
  compromisso_id uuid references commitments(id) on delete set null,
  historico text,
  caixa_id uuid references cashboxes(id) on delete set null,
  detalhes jsonb,
  valor numeric(14,2) not null check (valor >= 0),
  proxima_vencimento date not null,
  periodo period_type not null,
  parcelas integer default 1 check (parcelas >= 1),
  ativo boolean not null default true,
  created_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_id uuid references schedules(id) on delete set null,
  conta_id uuid references accounts(id) on delete set null,
  cost_center_id uuid references cost_centers(id) on delete set null,
  cliente_id uuid references clients(id) on delete set null,
  operacao operation_type not null,
  especie payment_method,
  historico text,
  compromisso_id uuid references commitments(id) on delete set null,
  caixa_id uuid references cashboxes(id) on delete set null,
  data_vencimento date,
  data_lancamento date not null default (now() at time zone 'utc')::date,
  parcela integer,
  valor_entrada numeric(14,2) default 0 check (valor_entrada >= 0),
  valor_saida numeric(14,2) default 0 check (valor_saida >= 0),
  valor_total numeric(14,2) generated always as (valor_entrada - valor_saida) stored,
  status transaction_status not null default 'pendente',
  transfer_id uuid,
  concluido_em timestamptz,
  unique (user_id, transfer_id, operacao) where operacao = 'transferencia'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete cascade,
  agendada_para timestamptz not null,
  enviado boolean default false,
  enviado_em timestamptz
);

create index idx_tx_user_due on transactions(user_id, data_vencimento);
create index idx_tx_user_status on transactions(user_id, status);
create index idx_sched_user_next on schedules(user_id, proxima_vencimento);
create index idx_accounts_user on accounts(user_id);

create view account_balances_view as
select a.id as account_id, a.user_id,
       a.saldo_inicial
       + coalesce(sum(case when t.status in ('pago','recebido') then t.valor_total else 0 end),0) as saldo_atual
from accounts a
left join transactions t on t.conta_id = a.id
group by a.id;

create view monthly_totals_view as
select user_id,
       date_trunc('month', coalesce(data_vencimento, data_lancamento)) as mes,
       sum(case when operacao in ('despesa','retirada') then t.valor_saida else 0 end) as total_a_pagar,
       sum(case when operacao in ('receita','aporte') then t.valor_entrada else 0 end) as total_a_receber,
       sum(case when status in ('pago','recebido') and operacao in ('despesa','retirada') then t.valor_saida else 0 end) as total_pago,
       sum(case when status in ('pago','recebido') and operacao in ('receita','aporte') then t.valor_entrada else 0 end) as total_recebido
from transactions t
group by user_id, date_trunc('month', coalesce(data_vencimento, data_lancamento));

create or replace function set_overdue()
returns trigger as $$
begin
  if (new.status in ('pendente','agendado')) and new.data_vencimento is not null and new.data_vencimento < current_date then
    new.status := 'atrasado';
  end if;
  return new;
end; $$ language plpgsql;

create trigger tg_tx_overdue before insert or update on transactions
for each row execute procedure set_overdue();

create or replace function validate_amounts()
returns trigger as $$
begin
  if new.operacao <> 'transferencia' and (new.valor_entrada > 0 and new.valor_saida > 0) then
    raise exception 'Somente um de valor_entrada ou valor_saida pode ser > 0';
  end if;
  if new.operacao = 'transferencia' and not (new.transfer_id is not null) then
    raise exception 'transfer_id obrigatório para transferências';
  end if;
  return new;
end; $$ language plpgsql;

create trigger tg_tx_validate before insert or update on transactions
for each row execute procedure validate_amounts();

alter table accounts enable row level security;
alter table cost_centers enable row level security;
alter table cashboxes enable row level security;
alter table clients enable row level security;
alter table commitment_groups enable row level security;
alter table commitments enable row level security;
alter table schedules enable row level security;
alter table transactions enable row level security;
alter table notifications enable row level security;

create policy p_accounts_owner on accounts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_cost_centers_owner on cost_centers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_cashboxes_owner on cashboxes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_clients_owner on clients for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_commitment_groups_owner on commitment_groups for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_commitments_owner on commitments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_schedules_owner on schedules for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_transactions_owner on transactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_notifications_owner on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function fn_transfer(source uuid, dest uuid, amount numeric, d date, descricao text)
returns uuid as $$
declare tid uuid := gen_random_uuid();
begin
  insert into transactions(user_id, conta_id, operacao, historico, data_vencimento, data_lancamento, valor_saida, status, transfer_id, concluido_em)
  values (auth.uid(), source, 'transferencia', descricao, d, coalesce(d, (now() at time zone 'utc')::date), amount, 'pago', tid, now());
  insert into transactions(user_id, conta_id, operacao, historico, data_vencimento, data_lancamento, valor_entrada, status, transfer_id, concluido_em)
  values (auth.uid(), dest, 'transferencia', descricao, d, coalesce(d, (now() at time zone 'utc')::date), amount, 'recebido', tid, now());
  return tid;
end; $$ language plpgsql security invoker;

create or replace function fn_pay(tx_id uuid, conta uuid, amount numeric, d date)
returns uuid as $$
begin
  update transactions set conta_id=conta, valor_saida=amount, status='pago', data_lancamento=coalesce(d, data_lancamento), concluido_em=now()
  where id=tx_id and user_id=auth.uid() and operacao in ('despesa','retirada');
  return tx_id;
end; $$ language plpgsql security invoker;

create or replace function fn_receive(tx_id uuid, conta uuid, amount numeric, d date)
returns uuid as $$
begin
  update transactions set conta_id=conta, valor_entrada=amount, status='recebido', data_lancamento=coalesce(d, data_lancamento), concluido_em=now()
  where id=tx_id and user_id=auth.uid() and operacao in ('receita','aporte');
  return tx_id;
end; $$ language plpgsql security invoker;

create or replace function fn_generate_schedule(sched_id uuid)
returns integer as $$
declare s schedules%rowtype; cnt integer;
begin
  select * into s from schedules where id=sched_id and user_id=auth.uid();
  if s.id is null then return 0; end if;
  with seq as (
    select generate_series(0, coalesce(s.parcelas,1)-1) as i
  ), ins as (
    insert into transactions(user_id, schedule_id, operacao, especie, historico, caixa_id, data_vencimento, valor_entrada, valor_saida, parcela, status)
    select auth.uid(), s.id, s.operacao, s.especie, s.historico, s.caixa_id,
           (case when s.periodo='mensal' then s.ano_mes_inicial + (i||' months')::interval else s.ano_mes_inicial + (i||' years')::interval end)::date,
           case when s.operacao in ('receita','aporte') then s.valor else 0 end,
           case when s.operacao in ('despesa','retirada') then s.valor else 0 end,
           i+1,
           'pendente'
    from seq
    returning 1
  )
  select count(*) into cnt from ins;
  update schedules set proxima_vencimento = (case when s.periodo='mensal' then s.ano_mes_inicial + (coalesce(s.parcelas,1))::text||' months'::interval else s.ano_mes_inicial + (coalesce(s.parcelas,1))::text||' years'::interval end)::date
  where id=s.id;
  return coalesce(cnt,0);
end; $$ language plpgsql security invoker;
