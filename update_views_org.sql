-- Update Views to support Organization Filtering (Fixed Schema v3)

-- 1. Update monthly_totals_view
-- Grouping by organization_id instead of user_id to provide Org-wide totals.
DROP VIEW IF EXISTS public.monthly_totals_view;

CREATE VIEW public.monthly_totals_view AS
SELECT 
    organization_id,
    date_trunc('month', coalesce(data_vencimento, data_lancamento)) as mes,
    -- 'Total a Pagar' in transactions context is just Total Saída (Realized)
    sum(case when operacao in ('despesa','retirada') then valor_saida else 0 end) as total_a_pagar,
    -- 'Total a Receber' is Total Entrada (Realized)
    sum(case when operacao in ('receita','aporte') then valor_entrada else 0 end) as total_a_receber,
    -- 'Total Pago' is same as Total Saída since all are realized
    sum(case when operacao in ('despesa','retirada') then valor_saida else 0 end) as total_pago,
    -- 'Total Recebido' is same as Total Entrada
    sum(case when operacao in ('receita','aporte') then valor_entrada else 0 end) as total_recebido
FROM public.transactions
GROUP BY organization_id, date_trunc('month', coalesce(data_vencimento, data_lancamento));


-- 2. Update account_balances_view
-- Adding organization_id to allow filtering by org.
-- Removed status check as all transactions are confirmed.
-- Changed valor_total to (valor_entrada - valor_saida) as valor_total generated column might be missing.
DROP VIEW IF EXISTS public.account_balances_view;

CREATE VIEW public.account_balances_view AS
SELECT 
    a.organization_id,
    a.id as account_id, 
    a.user_id,
    a.saldo_inicial + coalesce(sum(t.valor_entrada - t.valor_saida), 0) as saldo_atual
FROM public.accounts a
LEFT JOIN public.transactions t ON t.conta_id = a.id
GROUP BY a.organization_id, a.id;
