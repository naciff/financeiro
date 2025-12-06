-- Migration to fix fn_transfer function signature and cache issues
-- Created: 2025-12-06
-- Description: Drops and recreates the fn_transfer function to ensure correct signature and clear any schema cache inconsistencies.

-- Drop existing function to ensure clean state
DROP FUNCTION IF EXISTS public.fn_transfer(uuid, uuid, numeric, date, text);

-- Recreate the function with the exact signature expected by the application
CREATE OR REPLACE FUNCTION public.fn_transfer(source uuid, dest uuid, amount numeric, d date, descricao text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
declare tid uuid := gen_random_uuid();
begin
  insert into transactions(user_id, conta_id, operacao, historico, data_vencimento, data_lancamento, valor_saida, status, transfer_id, concluido_em)
  values (auth.uid(), source, 'transferencia', descricao, d, coalesce(d, (now() at time zone 'utc')::date), amount, 'pago', tid, now());
  
  insert into transactions(user_id, conta_id, operacao, historico, data_vencimento, data_lancamento, valor_entrada, status, transfer_id, concluido_em)
  values (auth.uid(), dest, 'transferencia', descricao, d, coalesce(d, (now() at time zone 'utc')::date), amount, 'recebido', tid, now());
  
  return tid;
end; $function$;
