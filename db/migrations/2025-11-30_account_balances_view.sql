-- Recreate account balances view to support balances listing
DROP VIEW IF EXISTS account_balances_view;
CREATE VIEW account_balances_view AS
SELECT
  a.id AS account_id,
  COALESCE(a.saldo_inicial, 0) + COALESCE(
    (
      SELECT SUM(t.valor_entrada - t.valor_saida)
      FROM transactions t
      WHERE t.conta_id = a.id AND (t.status = 'pago' OR t.status = 'recebido')
    ),
    0
  ) AS saldo_atual
FROM accounts a;

