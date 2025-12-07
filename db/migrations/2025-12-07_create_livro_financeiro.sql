-- Create table livro_financeiro
CREATE TABLE IF NOT EXISTS livro_financeiro (
    id_livro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_agendamento UUID REFERENCES schedules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    data_vencimento DATE,
    valor NUMERIC(15,2),
    situacao INTEGER DEFAULT 1, -- 1=ativo/agendado, 2=confirmado, 3=desativado
    operacao TEXT, -- despesa, receita, aporte, retirada
    historico TEXT,
    especie TEXT,
    caixa_id UUID REFERENCES accounts(id),
    favorecido_id UUID REFERENCES clients(id),
    ano_mes_inicial VARCHAR(7), -- YYYY-MM
    data_confirmacao DATE,
    usuario_confirmou UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_livro_financeiro_user_id ON livro_financeiro(user_id);
CREATE INDEX idx_livro_financeiro_agendamento ON livro_financeiro(id_agendamento);
CREATE INDEX idx_livro_financeiro_vencimento ON livro_financeiro(data_vencimento);
CREATE INDEX idx_livro_financeiro_situacao ON livro_financeiro(situacao);

-- RLS Policies
ALTER TABLE livro_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own livro_financeiro"
    ON livro_financeiro
    FOR ALL
    USING (auth.uid() = user_id);
