# Manual do Usuário - Sistema Financeiro

Este documento fornece um guia completo sobre a utilização do Sistema Financeiro, detalhando as regras de negócio, validações de campos e fluxos de operação para garantir a integridade dos dados e o uso eficiente da plataforma.

## 1. Cadastros Básicos

### 1.1. Contas (Caixa e Bancos)
O cadastro de contas é fundamental para indicar de onde sai ou para onde vai o dinheiro.

**Campos e Regras:**
- **Nome:** Obrigatório. Identificação da conta (ex: "Banco Itaú", "Caixa Pequeno").
- **Tipo:** Obrigatório. Opções:
    - *Banco*: Para contas correntes/poupança. Exige código do banco (3 dígitos), Agência (máx 4 dígitos) e Conta (máx 8 dígitos).
    - *Carteira*: Para dinheiro em espécie.
    - *Cartão*: Para cartões de crédito. Exige **Dia de Vencimento** (obrigatório).
    - *Aplicação*: Para investimentos.
- **Saldo Inicial:** Valor de partida da conta.
- **Situação:** *Ativo* ou *Inativo*. Contas inativas não aparecem nos seletores de lançamento.
- **Conta Principal:** Marcador para sugerir esta conta automaticamente em novos lançamentos.

### 1.2. Compromissos e Grupos
A classificação financeira é organizada em dois níveis hierárquicos:
1.  **Grupo de Compromisso:** Categoria macro (ex: "Despesas Fixas", "Receitas de Vendas").
2.  **Compromisso:** Subcategoria específica (ex: "Aluguel", "Venda de Produto A").

**Regras:**
- Ao criar um **Compromisso**, é obrigatório vinculá-lo a um **Grupo**.
- O campo **IR** (Imposto de Renda) no compromisso serve para marcar itens que devem ser considerados para fins fiscais futuros.
- A exclusão de um compromisso só é permitida se não houver lançamentos vinculados (para manter a integridade histórica).

---

## 2. Gestão de Agendamentos (Contas a Pagar/Receber)

A tela de **Agendamentos** (`/schedules`) é utilizada para programar receitas e despesas futuras.

### 2.1. Tipos de Agendamento
- **Fixo:** Para contas recorrentes (ex: Aluguel, Assinaturas). O sistema irá gerar automaticamente o próximo vencimento após a baixa do atual.
    - *Período/Recorrência:* Mensal, Semanal, Anual, etc.
- **Variável (Parcelado):** Para compras parceladas ou com fim determinado.
    - *Parcelas:* Obrigatório definir o número de parcelas. O sistema projeta os vencimentos futuros com base na data inicial.

### 2.2. Campos Obrigatórios e Validações
Para salvar um agendamento, todos os campos abaixo são obrigatórios:
- **Operação:** Despesa, Receita, Aporte ou Retirada.
- **Tipo:** Fixo ou Variável.
- **Data Inicial / Referência:** Mês/Ano de competência.
- **Vencimento (Próximo):** Data exata do vencimento.
- **Cliente/Favorecido:** Quem paga ou recebe.
- **Grupo e Compromisso:** Classificação financeira.
- **Histórico:** Descrição breve.
- **Valor:** Deve ser maior que zero.
- **Conta (Caixa):** Conta prevista para o movimento.

### 2.3. Fluxo de "Baixa" e Reativação
- Um agendamento **Fixo** nunca "acaba" sozinho; ele apenas avança a data de vencimento. Se você quiser parar de pagar, deve **Desativar/Excluir**.
- Um agendamento **Variável** é concluído automaticamente quando a data final (última parcela) é atingida.
- **Reativação:** Apenas agendamentos cancelados manualmente podem ser reativados. Itens concluídos por prazo natural devem ser recriados ou duplicados.

---

## 3. Controle e Previsão (Painel de Operações)

A tela de **Controle e Previsão** (`/schedule-control`) é o "centro de comando" onde os agendamentos se tornam lançamentos reais.

### 3.1. Funcionalidade
- **Visualização:** Mostra o que está para vencer (Vencidos, Hoje, Próximos 7 dias, Mês atual).
- **Status:**
    - *Vencido:* Data de vencimento anterior a hoje (destaque em vermelho).
    - *Vencimento Hoje:* Destaque em azul.
- **Ação de Baixa (Confirmar Pagamento):**
    - Ao clicar no botão de "Confirmar" (ou Check), o sistema:
        1. Cria um lançamento definitivo no **Livro Caixa**.
        2. Atualiza a data do agendamento para o próximo período (se for Fixo) ou marca como pago a parcela atual (se for Variável).
    - **Atenção:** A baixa é irreversível por esta tela. Para corrigir, é necessário ir ao Livro Caixa e "Estornar" o lançamento.

### 3.2. Baixa em Lote
- É possível selecionar múltiplos itens e realizar a baixa de uma só vez.
- O sistema solicitará a **Data de Pagamento** e a **Conta** para todos os itens selecionados.

---

## 4. Livro Caixa (Movimentação Realizada)

O **Livro Caixa** (`/ledger`) contém o histórico imutável das transações financeiras.

### 4.1. Lançamento Manual
Embora o ideal seja vir automatizado do Agendamento, você pode lançar manualmente (ex: gasto não previsto).
- **Campos Obrigatórios:** Conta, Operação, Histórico, Valor, Data Vencimento, Data Pagamento, Cliente e Classificação (Grupo/Compromisso).

### 4.2. Estorno e Exclusão
- **Exclusão Direta:** Permitida apenas para lançamentos manuais que **não** vieram de um agendamento.
- **Estorno:** Para itens vindos de agendamento, você deve usar a função **Estornar**.
    - Isso remove o lançamento financeiro e coloca o agendamento de volta na situação "Pendente" (Aberto), permitindo que você o edite ou pague novamente com os dados corretos.

### 4.3. Anexos e Favoritos
- **Comprovantes:** É possível visualizar comprovantes digitalizados vinculados às transações.
- **Favoritos:** Transações frequentes podem ser salvas como "Favorito" para lançamento rápido futuro (funcionalidade acessível via menu de contexto/botão direito).

---

## 5. Relatórios

O módulo de **Relatórios** (`/reports`) permite extrair dados para análise.

### 5.1. Tipos de Visão
- **Sintético (Resumo):** Agrupa os valores por Grupo de Compromisso. Ideal para ver "quanto gastei com RH" ou "quanto recebi de Vendas".
- **Analítico (Detalhado):** Lista item a item (linha a linha), com datas, clientes e históricos.

### 5.2. Exportação
- **PDF:** Gera documento formal com cabeçalho (Logo, Dados da Empresa) configurável nas Configurações do Sistema.
- **CSV (Excel):** Exporta os dados brutos para manipulação em planilhas eletrônicas.

---

## 6. Dashboard e Anotações

### 6.1. Dashboard (Visão Geral)
A tela inicial fornece os **Totais** consolidados:
- **Saldo Atual:** Soma de todas as contas ativas.
- **Receitas vs Despesas (Mês):** Performance financeira do mês corrente.
- **Previsão:** Totais a receber e pagar cadastrados nos Agendamentos.

### 6.2. Anotações (Bloco de Notas)
O sistema conta com um módulo de **Anotações** (`/notes`) que funciona como um caderno digital.
- Permite formatação de texto (Negrito, Itálico, Cores) para registrar lembretes, pautas de reunião ou observações importantes sobre o financeiro.
- As notas são salvas automaticamente e persistem no sistema.

---

## Regras Gerais de Validação
1. **Campos de Valor:** Aceitam apenas números positivos. O sistema trata internamente se é Entrada (+) ou Saída (-) baseado na "Operação".
2. **Datas:**
    - O sistema valida datas inválidas (ex: 31/02).
    - A pesquisa por período considera a **Data de Vencimento** ou **Pagamento**, conforme filtro selecionado no Livro Caixa.
3. **Integridade:** Não é possível excluir uma conta ou cliente que já possua movimentações financeiras vinculadas. O sistema bloqueará a ação para proteger o histórico.
