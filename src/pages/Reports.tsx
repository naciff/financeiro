import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '../store/AppStore'
import { listTransactions, listAccounts, listCommitmentGroups, listCommitmentsByGroup, listCostCenters, listMyOrganizations } from '../services/db'
import { formatMoneyBr } from '../utils/format'
import { Icon } from '../components/ui/Icon'
import { FloatingLabelSelect } from '../components/ui/FloatingLabelSelect'
import { FloatingLabelInput } from '../components/ui/FloatingLabelInput'

export default function Reports() {
  const store = useAppStore()
  // Data State
  const [txs, setTxs] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [commitments, setCommitments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filter State
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedCostCenter, setSelectedCostCenter] = useState('')
  const [selectedCommitment, setSelectedCommitment] = useState('')
  const [reportConfig, setReportConfig] = useState<any>(null)

  // View State
  const [viewType, setViewType] = useState<'analytic' | 'synthetic'>('synthetic')
  const [reportData, setReportData] = useState<any[]>([])
  const [syntheticData, setSyntheticData] = useState<any[]>([])
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [store.activeOrganization])

  useEffect(() => {
    if (selectedGroup) {
      loadCommitments(selectedGroup)
    } else {
      setCommitments([])
      setSelectedCommitment('')
    }
  }, [selectedGroup])

  async function loadInitialData() {
    if (!store.activeOrganization) return
    setLoading(true)
    const orgId = store.activeOrganization
    const [t, a, g, cc] = await Promise.all([
      listTransactions(3000, orgId), // Fetch a larger batch for reports
      listAccounts(orgId),
      listCommitmentGroups(orgId),
      listCostCenters(orgId)
    ])

    // Fetch Organization Config separately
    const orgs = await listMyOrganizations()
    if (orgs.data) {
      const currentOrg = orgs.data.find((o: any) => o.id === orgId)
      if (currentOrg && currentOrg.report_config) {
        setReportConfig(currentOrg.report_config)
      }
    }

    setTxs(t.data || [])
    setAccounts(a.data || [])
    setGroups(g.data || [])
    setCostCenters((cc as any).data || []) // costCenters might be the 4th result
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

      // Cost Center Filter
      if (selectedCostCenter) {
        // Typically transaction has cost_center_id or joined object
        const tCCId = t.cost_center_id || t.cost_center?.id
        if (tCCId !== selectedCostCenter) return false
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

      // --- HEADERS CONFIGURATION ---
      const hasCustomHeader = !!reportConfig
      let startY = 25

      if (hasCustomHeader) {
        const {
          logo_main, logo_secondary, company_name, cnpj,
          address, site, email, phone, report_title_prefix
        } = reportConfig

        let currentY = 10

        // 1. Main Logo (Left)
        if (logo_main) {
          try {
            // Determine image format from extension roughly
            const ext = logo_main.split('.').pop().toLowerCase()
            const format = (ext === 'png') ? 'PNG' : 'JPEG'
            doc.addImage(logo_main, format, 10, 5, 30, 15) // x, y, w, h
          } catch (err) {
            console.error('Error loading main logo', err)
          }
        }

        // 2. Secondary Logo (Right)
        if (logo_secondary) {
          try {
            const ext = logo_secondary.split('.').pop().toLowerCase()
            const format = (ext === 'png') ? 'PNG' : 'JPEG'
            doc.addImage(logo_secondary, format, 170, 5, 30, 15)
          } catch (err) {
            console.error('Error loading secondary logo', err)
          }
        }

        // 3. Company Info (Center/Left - offset by logo)
        // X Position: 45 if logo exists, else 14
        const textX = logo_main ? 45 : 14

        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text(company_name || 'Minha Empresa', textX, 10)

        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        if (cnpj) doc.text(`CNPJ: ${cnpj}`, textX, 15)

        doc.setFontSize(8)
        if (address) doc.text(address, textX, 19)

        // Contact Line
        let contactLine = ''
        if (site) contactLine += `Site: ${site}  `
        if (email) contactLine += `E-mail: ${email}  `
        if (phone) contactLine += `Celular: ${phone}`
        if (contactLine) doc.text(contactLine, textX, 23)

        // 4. Report Title
        // Draw a line separator
        doc.setLineWidth(0.5)
        doc.line(10, 26, 200, 26) // Horizontal line

        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        const titlePrefix = report_title_prefix || 'Relatório Financeiro'
        const titleSuffix = viewType === 'analytic' ? 'Analítico' : 'Sintético'
        doc.text(`${titlePrefix} - ${titleSuffix}`.toUpperCase(), 105, 32, { align: 'center' })


        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(`Período: ${toBr(startDate)} a ${toBr(endDate)}`, 105, 37, { align: 'center' })

        startY = 45
      } else {
        // Default Header
        doc.setFontSize(16)
        doc.text(`Relatório Financeiro - ${viewType === 'analytic' ? 'Analítico' : 'Sintético'}`, 14, 15)
        doc.setFontSize(10)
        doc.text(`Período: ${toBr(startDate)} a ${toBr(endDate)}`, 14, 22)
      }

      // Capture footer text before closure
      const footerText = reportConfig?.footer_text || ''

      // Define page content function for AutoTable hooks or post-processing
      const drawFooter = (doc: any) => {
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          const pageWidth = doc.internal.pageSize.width
          const pageHeight = doc.internal.pageSize.height

          // Footer Line
          doc.setLineWidth(0.5)
          doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15)

          doc.setFontSize(8)
          doc.setFont("helvetica", "italic")

          // Left Text
          if (footerText) {
            doc.text(footerText, 10, pageHeight - 10)
          }

          // Right Text (Page Number)
          doc.text(`Página ${i} de ${pageCount}`, pageWidth - 10, pageHeight - 10, { align: 'right' })
        }
      }

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
          startY: startY,
          head: [['Vencto', 'Pagto', 'Caixa', 'Cliente', 'Grupo', 'Compromisso', 'Valor']],
          body: rows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 133, 244] },
          margin: { top: startY }
        })
      } else {
        const rows = syntheticData.map(d => [
          d.name,
          formatMoneyBr(d.income),
          formatMoneyBr(d.expense),
          formatMoneyBr(d.total)
        ])

        autoTable(doc, {
          startY: startY,
          head: [['Grupo / Categoria', 'Entradas', 'Saídas', 'Saldo']],
          body: rows,
          headStyles: { fillColor: [66, 133, 244] },
          margin: { top: startY }
        })
      }

      // Draw footer on all pages
      drawFooter(doc)

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
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
          {/* Calendar */}
          <div className="flex gap-2">
            <FloatingLabelInput
              type="date"
              label="De"
              max="9999-12-31"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              bgColor="bg-white dark:bg-gray-800"
            />
            <FloatingLabelInput
              type="date"
              label="Até"
              max="9999-12-31"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              bgColor="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Account */}
          <div>
            <FloatingLabelSelect
              label="Caixa / Banco"
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              bgColor="bg-white dark:bg-gray-800"
            >
              <option value="" className="dark:bg-gray-800">Todos</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id} className="dark:bg-gray-800">{a.nome}</option>
              ))}
            </FloatingLabelSelect>
          </div>

          {/* Group */}
          <div>
            <FloatingLabelSelect
              label="Grupo de Compromisso"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              bgColor="bg-white dark:bg-gray-800"
            >
              <option value="" className="dark:bg-gray-800">Todos</option>
              {groups.map(g => (
                <option key={g.id} value={g.id} className="dark:bg-gray-800">{g.nome}</option>
              ))}
            </FloatingLabelSelect>
          </div>

          {/* Commitment */}
          <div>
            <FloatingLabelSelect
              label="Compromisso"
              value={selectedCommitment}
              onChange={e => setSelectedCommitment(e.target.value)}
              bgColor="bg-white dark:bg-gray-800"
              disabled={!selectedGroup}
            >
              <option value="" className="dark:bg-gray-800">Todos</option>
              {commitments.map(c => (
                <option key={c.id} value={c.id} className="dark:bg-gray-800">{c.nome}</option>
              ))}
            </FloatingLabelSelect>
          </div>

          {/* Cost Center */}
          <div>
            <FloatingLabelSelect
              label="Centro de Custo"
              value={selectedCostCenter}
              onChange={e => setSelectedCostCenter(e.target.value)}
              bgColor="bg-white dark:bg-gray-800"
            >
              <option value="" className="dark:bg-gray-800">Todos</option>
              {costCenters.map(cc => (
                <option key={cc.id} value={cc.id} className="dark:bg-gray-800">{cc.descricao}</option>
              ))}
            </FloatingLabelSelect>
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

          <div className="flex gap-2 items-center">
            <button
              onClick={handleExportCSV}
              disabled={!generated}
              className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar CSV"
            >
              <Icon name="excel" className="w-6 h-6 text-green-600" />
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!generated}
              className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar PDF"
            >
              <Icon name="pdf" className="w-6 h-6 text-red-500" />
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 h-[38px]"
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
