-- Script para normalizar todos os nomes de clientes para MAIÚSCULO
-- Execute este script no SQL Editor do seu banco de dados (Supabase)

UPDATE public.clients
SET 
  nome = UPPER(nome),
  razao_social = UPPER(razao_social);
