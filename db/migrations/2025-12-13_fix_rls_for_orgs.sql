-- Enable RLS and permissions for Organization Members

-- Standard RLS Function to check membership
CREATE OR REPLACE FUNCTION public.is_member_of(owner_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE owner_id = owner_uuid 
      AND member_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Accounts
DROP POLICY IF EXISTS "Permitir SELECT para usuário autenticado" ON accounts;
CREATE POLICY "Permitir SELECT para membros e proprietários" ON accounts 
FOR SELECT USING (auth.uid() = user_id OR is_member_of(user_id));

-- 2. Transactions
DROP POLICY IF EXISTS "Permitir SELECT para usuário autenticado" ON transactions;
CREATE POLICY "Permitir SELECT para membros e proprietários" ON transactions 
FOR SELECT USING (auth.uid() = user_id OR is_member_of(user_id));

-- 3. Schedules
DROP POLICY IF EXISTS "Permitir SELECT para usuário autenticado" ON schedules;
CREATE POLICY "Permitir SELECT para membros e proprietários" ON schedules 
FOR SELECT USING (auth.uid() = user_id OR is_member_of(user_id));

-- 4. Financials
DROP POLICY IF EXISTS "Permitir SELECT para usuário autenticado" ON financials;
CREATE POLICY "Permitir SELECT para membros e proprietários" ON financials 
FOR SELECT USING (auth.uid() = user_id OR is_member_of(user_id));

-- 5. Clients
DROP POLICY IF EXISTS "Permitir SELECT para usuário autenticado" ON clients;
CREATE POLICY "Permitir SELECT para membros e proprietários" ON clients 
FOR SELECT USING (auth.uid() = user_id OR is_member_of(user_id));

-- 6. Commitment Groups
DROP POLICY IF EXISTS "Permitir SELECT para usuário autenticado" ON commitment_groups;
CREATE POLICY "Permitir SELECT para membros e proprietários" ON commitment_groups 
FOR SELECT USING (auth.uid() = user_id OR is_member_of(user_id));

-- 7. Commitments
DROP POLICY IF EXISTS "Permitir SELECT para usuário autenticado" ON commitments;
CREATE POLICY "Permitir SELECT para membros e proprietários" ON commitments 
FOR SELECT USING (auth.uid() = user_id OR is_member_of(user_id));

-- 8. Cashboxes
DROP POLICY IF EXISTS "Permitir SELECT para usuário autenticado" ON cashboxes;
CREATE POLICY "Permitir SELECT para membros e proprietários" ON cashboxes 
FOR SELECT USING (auth.uid() = user_id OR is_member_of(user_id));
