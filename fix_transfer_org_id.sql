-- Fix fn_transfer to include organization_id in transactions
-- This resolves the "null value in column organization_id" error

CREATE OR REPLACE FUNCTION public.fn_transfer(source uuid, dest uuid, amount numeric, d date, descricao text)
RETURNS uuid AS $$
DECLARE 
  tid uuid := gen_random_uuid();
  org_id uuid;
BEGIN
  -- Fetch organization_id from the source account
  SELECT organization_id INTO org_id FROM public.accounts WHERE id = source;

  -- Insert outflow (saída)
  INSERT INTO transactions(user_id, conta_id, organization_id, operacao, historico, data_vencimento, data_lancamento, valor_saida, transfer_id, concluido_em)
  VALUES (auth.uid(), source, org_id, 'transferencia', descricao, d, COALESCE(d, (now() AT TIME ZONE 'utc')::date), amount, tid, now());
  
  -- Insert inflow (entrada)
  INSERT INTO transactions(user_id, conta_id, organization_id, operacao, historico, data_vencimento, data_lancamento, valor_entrada, transfer_id, concluido_em)
  VALUES (auth.uid(), dest, org_id, 'transferencia', descricao, d, COALESCE(d, (now() AT TIME ZONE 'utc')::date), amount, tid, now());
  
  RETURN tid;
END; $$ LANGUAGE plpgsql SECURITY INVOKER;
