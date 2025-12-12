import { useState, useEffect, useMemo } from 'react'
import { listTransactions, listAccounts, listCommitmentGroups, listCommitmentsByGroup } from '../services/db'
import { formatMoneyBr } from '../utils/format'
import { Icon } from '../components/ui/Icon'

export default function Reports() {
  // Data State
  const [txs, setTxs] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [commitments, setCommitments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filter State
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedCommitment, setSelectedCommitment] = useState('')

  // View State
  const [viewType, setViewType] = useState<'analytic' | 'synthetic'>('synthetic')
  const [reportData, setReportData] = useState<any[]>([])
  const [syntheticData, setSyntheticData] = useState<any[]>([])
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      loadCommitments(selectedGroup)
    } else {
      setCommitments([])
      setSelectedCommitment('')
    }
  }, [selectedGroup])

  async function loadInitialData() {
    setLoading(true)
    const [t, a, g] = await Promise.all([
      listTransactions(3000), // Fetch a larger batch for reports
      listAccounts(),
      listCommitmentGroups()
    ])
    setTxs(t.data || [])
    setAccounts(a.data || [])
    setGroups(g.data || [])
    setLoading(false)
  }

  async function loadCommitments(groupId: string) {
    const c = await listCommitmentsByGroup(groupId)
    setCommitments(c.data || [])
  }

  function handleGenerate() {
    // 1. Filter Transactions
    const filtered = txs.filter(t => {
      // Date Filter (Vencimento as requested)
      const dateToCheck = t.data_vencimento ? t.data_vencimento.split('T')[0] : t.data_lancamento.split('T')[0]
      if (dateToCheck < startDate || dateToCheck > endDate) return false

      // Account Filter
      if (selectedAccount && t.conta_id !== selectedAccount) return false

      // Group Filter
      // Note: Transaction has group info in joined object 'grupo' or 'grupo_compromisso_id'
      if (selectedGroup) {
        const tGroupId = t.grupo?.id || t.grupo_compromisso_id
        if (tGroupId !== selectedGroup) return false
      }

      // Commitment Filter
      if (selectedCommitment) {
        const tCommId = t.compromisso?.id || t.compromisso_id
        if (tCommId !== selectedCommitment) return false
      }

      return true
    })

    // 2. Process for Views
    setReportData(filtered)

    // Synthetic Processing
    const grouped = filtered.reduce((acc: any, t: any) => {
      const groupName = t.grupo?.nome || t.grupo_compromisso?.nome || 'Sem Grupo'
      if (!acc[groupName]) {
        acc[groupName] = { name: groupName, income: 0, expense: 0, total: 0 }
      }
      const valEntrada = Number(t.valor_entrada || 0)
      const valSaida = Number(t.valor_saida || 0)

      acc[groupName].income += valEntrada
      acc[groupName].expense += valSaida
      acc[groupName].total += (valEntrada - valSaida)
      return acc
    }, {})

    setSyntheticData(Object.values(grouped).sort((a: any, b: any) => a.name.localeCompare(b.name)))
    setGenerated(true)
  }

  const totalBalance = useMemo(() => {
    return reportData.reduce((acc, t) => acc + (Number(t.valor_entrada || 0) - Number(t.valor_saida || 0)), 0)
  }, [reportData])

  function handleExportCSV() {
    if (!generated) return

    let csvContent = "data:text/csv;charset=utf-8,"

    if (viewType === 'analytic') {
      csvContent += "Vencimento;Pagamento;Caixa;Cliente;Grupo;Compromisso;Valor Entrada;Valor Saida;Valor Liquido\n"
      reportData.forEach(t => {
        const valEntrada = Number(t.valor_entrada || 0).toFixed(2).replace('.', ',')
        const valSaida = Number(t.valor_saida || 0).toFixed(2).replace('.', ',')
        const valLiq = (Number(t.valor_entrada || 0) - Number(t.valor_saida || 0)).toFixed(2).replace('.', ',')
        const row = [
          toBr(t.data_vencimento),
          toBr(t.data_lancamento),
          t.caixa?.nome || accounts.find(a => a.id === t.conta_id)?.nome || '-',
          t.cliente?.nome || '-',
          t.grupo?.nome || '-',
          t.compromisso?.nome || '-',
          valEntrada,
          valSaida,
          valLiq
        ].join(';')
        csvContent += row + "\r\n"
      })
    } else {
      csvContent += "Grupo;Entradas;Saidas;Saldo\n"
      syntheticData.forEach(d => {
        const row = [
          d.name,
          d.income.toFixed(2).replace('.', ','),
          d.expense.toFixed(2).replace('.', ','),
          d.total.toFixed(2).replace('.', ',')
        ].join(';')
        csvContent += row + "\r\n"
      })
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `relatorio_${viewType}_${startDate}_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleExportPDF() {
    if (!generated) return
    // Dynamic import to avoid build errors if not installed yet
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF()

      doc.setFontSize(16)
      doc.text(`Relatório Financeiro - ${viewType === 'analytic' ? 'Analítico' : 'Sintético'}`, 14, 15)
      doc.setFontSize(10)
      doc.text(`Período: ${toBr(startDate)} a ${toBr(endDate)}`, 14, 22)

      if (viewType === 'analytic') {
        const rows = reportData.map(t => [
          toBr(t.data_vencimento),
          toBr(t.data_lancamento),
          t.caixa?.nome || accounts.find(a => a.id === t.conta_id)?.nome || '-',
          t.cliente?.nome || '-',
          t.grupo?.nome || '-',
          t.compromisso?.nome || '-',
          formatMoneyBr(Number(t.valor_entrada || 0) - Number(t.valor_saida || 0))
        ])

        autoTable(doc, {
          startY: 25,
          head: [['Vencto', 'Pagto', 'Caixa', 'Cliente', 'Grupo', 'Compromisso', 'Valor']],
          body: rows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 133, 244] }
        })
      } else {
        const rows = syntheticData.map(d => [
          d.name,
          formatMoneyBr(d.income),
          formatMoneyBr(d.expense),
          formatMoneyBr(d.total)
        ])

        autoTable(doc, {
          startY: 25,
          head: [['Grupo / Categoria', 'Entradas', 'Saídas', 'Saldo']],
          body: rows,
          headStyles: { fillColor: [66, 133, 244] }
        })
      }

      doc.save(`relatorio_${viewType}.pdf`)
    } catch (e) {
      alert('Erro ao gerar PDF. Verifique se as bibliotecas estão instaladas.')
      console.error(e)
    }
  }

  function toBr(iso: string) {
    if (!iso) return ''
    return iso.split('T')[0].split('-').reverse().join('/')
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Icon name="file-text" className="w-6 h-6" />
          Relatórios
        </h1>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Calendar */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Período (Vencimento)</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                max="9999-12-31"
                className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-gray-400">a</span>
              <input
                type="date"
                max="9999-12-31"
                className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Account */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Caixa / Banco</label>
            <select
              className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
            >
              <option value="">Todos</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Grupo de Compromisso</label>
            <select
              className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
            >
              <option value="">Todos</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
          </div>

          {/* Commitment */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Compromisso</label>
            <select
              className="w-full border dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={selectedCommitment}
              onChange={e => setSelectedCommitment(e.target.value)}
              disabled={!selectedGroup}
            >
              <option value="">Todos</option>
              {commitments.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700 mt-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="viewType"
                checked={viewType === 'synthetic'}
                onChange={() => setViewType('synthetic')}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sintético (Resumo)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="viewType"
                checked={viewType === 'analytic'}
                onChange={() => setViewType('analytic')}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Analítico (Detalhado)</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={!generated}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar CSV"
            >
              <Icon name="file-text" className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!generated}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar PDF"
            >
              <Icon name="file-text" className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Icon name="search" className="w-4 h-4" />
              {loading ? 'Carregando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Area */}
      {generated && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200">Resultados da Pesquisa</h2>
            <div className={`text-sm font-bold px-3 py-1 rounded ${totalBalance >= 0 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>
              Saldo do Período: {formatMoneyBr(totalBalance)}
            </div>
          </div>

          {viewType === 'analytic' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-900 dark:text-gray-100">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
                  <tr>
                    <th className="p-3">Vencimento</th>
                    <th className="p-3">Pagamento</th>
                    <th className="p-3">Caixa</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Compromisso</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.length === 0 ? (
                    <tr><td colSpan={7} className="p-4 text-center text-gray-500">Nenhum registro encontrado</td></tr>
                  ) : (
                    reportData.map(t => {
                      const val = Number(t.valor_entrada || 0) - Number(t.valor_saida || 0)
                      return (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-3">{toBr(t.data_vencimento)}</td>
                          <td className="p-3">{toBr(t.data_lancamento)}</td>
                          <td className="p-3 hover:text-gray-900 dark:hover:text-gray-100 text-gray-600 dark:text-gray-400">{t.conta_id === t.caixa?.id /* complex logic skipped, showing just ID if name missing in join */}
                            {/* Assuming we might not have full joins everywhere, but listTransactions does */}
                            {t.caixa?.nome || accounts.find(a => a.id === t.conta_id)?.nome || '-'}
                          </td>
                          <td className="p-3">{t.cliente?.nome || '-'}</td>
                          <td className="p-3">{t.grupo?.nome || '-'}</td>
                          <td className="p-3">{t.compromisso?.nome || '-'}</td>
                          <td className={`p-3 text-right font-medium ${val >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatMoneyBr(Math.abs(val))}
                            <span className="text-[10px] ml-1 text-gray-400">{val >= 0 ? 'C' : 'D'}</span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-900 dark:text-gray-100">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
                  <tr>
                    <th className="p-3">Grupo de Compromisso</th>
                    <th className="p-3 text-right text-green-700 dark:text-green-400">Entradas</th>
                    <th className="p-3 text-right text-red-700 dark:text-red-400">Saídas</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {syntheticData.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhum registro encontrado</td></tr>
                  ) : (
                    syntheticData.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-3 font-medium">{d.name}</td>
                        <td className="p-3 text-right text-green-600 dark:text-green-400">{formatMoneyBr(d.income)}</td>
                        <td className="p-3 text-right text-red-500 dark:text-red-400">{formatMoneyBr(d.expense)}</td>
                        <td className={`p-3 text-right font-bold ${d.total >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                          {formatMoneyBr(d.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
