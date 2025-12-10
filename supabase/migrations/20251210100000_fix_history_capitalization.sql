-- Update 'historico' record to Title Case (First letter of each word uppercase, others lowercase)
UPDATE transactions 
SET historico = initcap(historico);
