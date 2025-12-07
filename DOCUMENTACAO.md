# Documentação do Sistema Financeiro

## Visão Geral
Este sistema é uma aplicação completa para controle financeiro pessoal e empresarial, permitindo o gerenciamento de contas, agendamentos, pagamentos, recebimentos e fluxo de caixa.

---

## Módulos do Sistema

### 1. Dashboard
**Visão Geral Financeira**
O Dashboard oferece um resumo imediato da saúde financeira.
- **Gráficos**:
    - **Evolução Mensal**: Visualização lado a lado de Receitas vs Despesas ao longo do tempo.
    - **Despesas por Grupo**: Gráfico de pizza detalhando onde o dinheiro está sendo gasto (ex: Transporte, Alimentação, Cartão).
- **Cards de Métricas**:
    - **Total Entrada (Fixa/Mês)**: Receitas recorrentes mensais.
    - **Total Despesas (Fixa/Mês)**: Gastos recorrentes mensais.
    - **Total de Despesas Lançadas**: Soma de todos os agendamentos de despesa do usuário.
    - **Previsão Divisão de Lucro**: Estimativa anual baseada em compromissos de lucro.
    - **Totais do Livro Caixa**:
        - **Total Recebido**: Soma de todas as transações efetivadas como entrada (excluindo transferências).
        - **Total Pago**: Soma de todas as transações efetivadas como saída (excluindo transferências).
        - **Saldo Atual**: Saldo real acumulado de todas as contas cadastradas.
        - **Previsão Saldo Mês Atual**: Saldo esperado considerando receitas e despesas futuras do mês.

### 2. Agenda (Schedules)
**Planejamento de Compromissos**
Aqui você cadastra e visualiza seus compromissos financeiros futuros.
- **Visualização**: Lista de agendamentos com data, descrição, valor e status.
- **Abas**:
    - **Pendentes**: Agendamentos futuros ou atrasados que ainda não foram processados.
    - **Concluídos**: Itens já pagos, recebidos ou cancelados (Situação = 2 ou 3).
- **Funcionalidades**:
    - **Exportar**: Botões para gerar relatórios em PDF ou Excel (CSV).
    - **Edição**: Alterar valores, datas ou detalhes de um agendamento.
    - **Exclusão**: Remover um agendamento.

### 3. Controle e Previsão (Schedule Control)
**Gerenciamento de Fluxo de Caixa**
Esta é a tela principal para transformar agendamentos em transações reais.
- **Filtros**:
    - **Mês de Referência**: Navegue entre os meses para ver o que vence em cada período.
    - **Status**: Filtre por Vencidos, Próximos 7 dias, Mês Atual, etc.
    - **Caixa**: Filtre os itens por conta específica (ex: Banco Itaú, Carteira).
    - **Grupo**: Filtre por grupo de compromisso (ex: Despesas Fixas, Cartão de Crédito).
- **Ações**:
    - **Confirmar/Lançar**: Ao clicar em "Confirmar" (ícone de check/dinheiro), o sistema abre um modal para efetivar o pagamento/recebimento.
    - **Modal de Confirmação**: Permite ajustar valores finais, datas de pagamento, adicionar juros/multas e selecionar a conta de onde o dinheiro saiu/entrou. Ao confirmar, o item vai para o **Livro Caixa**.
    - **Pular/Desativar**: Permite pular uma ocorrência ou desativar uma série de agendamentos.

### 4. Livro Caixa (Ledger)
**Registro de Transações Efetivadas**
O histórico oficial de todas as movimentações financeiras.
- **Filtros Avançados**:
    - **Tipo de Operação**: Menu dropdown para filtrar por:
        - Todas
        - Somente Receitas
        - Somente Despesas
        - Somente Aporte/Retirada/Transferência
        - Receitas e Aportes
        - Despesas e Retiradas
    - **Caixa**: Filtre por conta bancária específica.
    - **Período**: Filtre por mês ou intervalo de datas personalizado (Data de Pagamento ou Lançamento).
    - **Busca**: Campo de texto para procurar por cliente, histórico ou valor.
- **Funcionalidades**:
    - **+ Incluir**: Botão preto para adicionar uma transação manual que não veio da agenda (ex: gasto imprevisto).
    - **Menu de Contexto** (Botão Direito):
        - **Alterar**: Editar uma transação existente.
        - **Excluir**: Remover uma transação.
        - **Duplicar**: Criar uma cópia de uma transação para agilizar lançamentos repetitivos.
        - **Estornar**: Reverter uma transação, voltando-a para o status de "Agendamento" (se aplicável) ou removendo-a do saldo.
- **Rodapé de Totais**: Exibe o somatório das Receitas e Despesas dos itens filtrados na tela, permitindo conferência rápida.

### 5. Cadastros
**Gerenciamento de Dados Base**
- **Contas**: Gerencie seus bancos, carteiras e cartões. Defina saldos iniciais e cores para identificação.
- **Clientes**: Cadastro de pessoas ou empresas para vincular a recebimentos/pagamentos.
- **Grupos de Compromisso**: Categorias para organizar suas finanças (ex: Moradia, Transporte, Lazer).
- **Compromissos**: Itens recorrentes ou padrões vinculados aos grupos (ex: Aluguel, Gasolina, Netflix).

---

## Dicas de Uso
- **Calculadora**: Use o ícone de calculadora no topo (ou atalho de teclado) para حسابas rápidas sem sair do sistema.
- **Data Final**: Para agendamentos recorrentes, deixe a data final em branco se for indeterminado.
- **Parcelamento**: O sistema suporta lançamentos parcelados (ex: 1/12), calculando automaticamente as datas futuras.
