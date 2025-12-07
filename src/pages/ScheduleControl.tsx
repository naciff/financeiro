import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Icon } from '../components/ui/Icon'
import { listFinancials, listAccounts, listCommitmentGroups, confirmProvision } from '../services/db'
import { formatMoneyBr } from '../utils/format'

type Filter = 'vencidos' | '7dias' | 'mesAtual' | 'proximoMes' | '2meses' | '6meses' | '12meses' | 'fimAno'

function toBr(iso: string) {
  if (!iso) return ''
  // Fix: Parse date without timezone conversion
  const dateStr = iso.split('T')[0] // Get YYYY-MM-DD
  if (!dateStr) return ''
  const [yyyy, mm, dd] = dateStr.split('-')
  if (!yyyy || !mm || !dd) return ''
  return `${dd} /${mm}/${yyyy} `
}

export default function ScheduleControl() {
  const store = useAppStore()
  const [remote, setRemote] = useState<any[]>([])
  const [modal, setModal] = useState<any | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('mesAtual')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [msg, setMsg] = useState('')

  // Filtros adicionais
  const [filterCaixa, setFilterCaixa] = useState('')
  const [filterGrupo, setFilterGrupo] = useState('')
  const [caixas, setCaixas] = useState<any[]>([])
  const [grupos, setGrupos] = useState<any[]>([])

  // Estados do Modal
  const [modalContaId, setModalContaId] = useState('')
  const [modalData, setModalData] = useState('')
  const [modalDataLancamento, setModalDataLancamento] = useState('')
  const [modalValor, setModalValor] = useState(0)
  const [modalHistorico, setModalHistorico] = useState('')
  const [modalNotaFiscal, setModalNotaFiscal] = useState('')
  const [modalDetalhes, setModalDetalhes] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Carregar caixas e grupos
  useEffect(() => {
    if (hasBackend) {
      listAccounts().then(r => { if (!r.error && r.data) setCaixas(r.data as any) })
      listCommitmentGroups().then(r => { if (!r.error && r.data) setGrupos(r.data as any) })
    }
  }, [])

  // Carregar dados do Livro Financeiro (apenas Ativos/Agendados)
  useMemo(() => {
    if (hasBackend) {
      listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
    }
  }, [])

  // Refresh automaticamente ao entrar/voltar para a tela
  useMemo(() => {
    function refresh() {
      if (hasBackend) {
        listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
      }
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])


  const rows = useMemo(() => {
    // Se estiver usando store local, não temos tabela livro_financeiro, então fallback ou vazio?
    // User pediu para usar a tabela nova. Vamos assumir backend apenas para essa feature ou adaptar.
    // Como a migration é backend only, store.schedules não vai funcionar aqui.
    // Vamos usar 'remote' apenas.
    const src = remote
    const now = new Date()
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Calcular data limite baseado no filtro
    function getFilterEndDate(): Date {
      switch (filter) {
        case 'vencidos': return now
        case '7dias': { const n = new Date(now); n.setDate(n.getDate() + 7); return n }
        case 'mesAtual': return endMonth
        case 'proximoMes': return new Date(now.getFullYear(), now.getMonth() + 2, 0)
        case '2meses': { const e = new Date(now); e.setMonth(e.getMonth() + 2); return e }
        case '6meses': { const e = new Date(now); e.setMonth(e.getMonth() + 6); return e }
        case '12meses': { const e = new Date(now); e.setMonth(e.getMonth() + 12); return e }
        case 'fimAno': return new Date(now.getFullYear(), 11, 31)
        default: return endMonth
      }
    }

    // Filtro de data
    function within(d: Date) {
      switch (filter) {
        case 'vencidos': return d <= now
        case '7dias': { const n = new Date(now); n.setDate(n.getDate() + 7); return d > now && d <= n }
        case 'mesAtual': return d <= endMonth
        case 'proximoMes': { const s = new Date(now.getFullYear(), now.getMonth() + 1, 1); const e = new Date(now.getFullYear(), now.getMonth() + 2, 0); return d >= s && d <= e }
        case '2meses': { const e = new Date(now); e.setMonth(e.getMonth() + 2); return d > now && d <= e }
        case '6meses': { const e = new Date(now); e.setMonth(e.getMonth() + 6); return d > now && d <= e }
        case '12meses': { const e = new Date(now); e.setMonth(e.getMonth() + 12); return d > now && d <= e }
        case 'fimAno': { const e = new Date(now.getFullYear(), 11, 31); return d > now && d <= e }
      }
    }

    const data = src.map((s: any) => {
      // Usar data_vencimento do livro financeiro
      const vencimentoIso = s.data_vencimento
      if (!vencimentoIso) return null; // Skip invalid rows

      const parts = vencimentoIso.split('T')[0].split('-')
      if (parts.length < 3) return null;

      const [y, m, d_str] = parts.map(Number)

      const today = new Date()
      const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
      const utcDue = Date.UTC(y, m - 1, d_str)
      const msPerDay = 1000 * 60 * 60 * 24
      const diffTime = utcToday - utcDue
      const diffDays = Math.floor(diffTime / msPerDay)

      const d = new Date(y, m - 1, d_str)

      // Valor vem direto do livro financeiro
      const valor = Number(s.valor)
      const isReceita = s.operacao === 'receita' || s.operacao === 'aporte'

      let statusMessage = ''
      if (diffDays > 0) {
        statusMessage = `Vencido há ${diffDays} dia(s)...`
      } else if (diffDays === 0) {
        statusMessage = 'Vencimento Hoje...'
      }

      // Mapeamento de campos
      // id_livro é a PK, usamos como id
      return {
        id: s.id,
        operacao: s.operacao,
        vencimento: vencimentoIso,
        vencimentoBr: toBr(vencimentoIso),
        caixa: s.caixa?.nome || '',
        caixaId: s.caixa_id || '',
        cliente: s.cliente?.nome || '',
        compromisso: s.agendamento?.compromisso?.nome || '',
        grupoCompromisso: s.agendamento?.grupo?.nome || '',
        grupoCompromissoId: s.agendamento?.grupo?.id || '',
        historico: s.historico || '',
        notaFiscal: '', // Não temos NF no livro financeiro ainda? Podemos puxar do agendamento se quiser, mas usually é na transação
        detalhes: '',
        especie: s.especie || '',
        receita: isReceita ? valor : 0,
        despesa: !isReceita ? valor : 0,
        parcela: s.parcela_atual || 1,
        totalParcelas: s.total_parcelas || 1,
        vencimentoDate: d,
        diasAtraso: diffDays,
        statusMessage: statusMessage,
        tipo: s.agendamento?.tipo, // Opcional, se precisarmos saber
        periodo: s.agendamento?.periodo
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null)
      .filter(r => within(new Date(r.vencimento)))
      .filter(r => !filterCaixa || r.caixaId === filterCaixa)
      .filter(r => !filterGrupo || r.grupoCompromissoId === filterGrupo)
      .filter(r => [r.cliente, r.historico, r.compromisso, String(r.receita), String(r.despesa)].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => a.vencimentoDate.getTime() - b.vencimentoDate.getTime())

    // Calcular totais
    const totalReceitas = data.reduce((sum, r) => sum + r.receita, 0)
    const totalDespesas = data.reduce((sum, r) => sum + r.despesa, 0)
    const totalRecords = data.length

    return {
      data: data,
      current: 1,
      totalPages: 1,
      totalReceitas,
      totalDespesas,
      totalRecords,
      allData: data
    }
  }, [remote, store.schedules, filter, search, page, filterCaixa, filterGrupo])

  const buttons: Array<{ id: Filter; label: string }> = [
    { id: 'vencidos', label: 'Vencidos/Dia Atual' },
    { id: '7dias', label: 'até 7 Dias' },
    { id: 'mesAtual', label: 'Mês Atual' },
    { id: 'proximoMes', label: 'Próximo Mês' },
    { id: '2meses', label: 'Até 2 Meses' },
    { id: '6meses', label: 'Até 6 Meses' },
    { id: '12meses', label: 'Até 12 Meses' },
    { id: 'fimAno', label: 'Até Final do Ano' },
  ]

  const selectionSum = useMemo(() => {
    let sum = 0
    selectedIds.forEach(id => {
      const item = rows.allData.find(r => r.id === id)
      if (item) {
        if (item.receita > 0) sum += item.receita
        if (item.despesa > 0) sum -= item.despesa
      }
    })
    return sum
  }, [selectedIds, rows])

  function handleSelect(e: React.MouseEvent, id: string) {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedIds(new Set([id]))
    }
  }

  function openModal(item: any) {
    setModal(item)
    setModalContaId(item.caixaId || '')
    setModalData(item.vencimentoDate.toISOString().split('T')[0])
    setModalDataLancamento(new Date().toISOString().split('T')[0])
    setModalValor(item.despesa || item.receita)
    setModalHistorico(item.historico)
    setModalNotaFiscal(item.notaFiscal || '')
    setModalDetalhes(item.detalhes || '')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Controle e Previsão</h1>



      {msg && <div className="text-sm text-green-700">{msg}</div>}

      <div role="group" aria-label="Filtros por período" className="flex flex-nowrap gap-2 overflow-x-auto items-center">
        {buttons.map(b => (
          <button key={b.id} className={`px - 3 py - 2 rounded border transition - colors duration - 300 text - xs md: text - sm whitespace - nowrap ${filter === b.id ? 'bg-fourtek-blue text-white' : 'bg-white hover:bg-gray-50'} `} onClick={() => { setFilter(b.id); setPage(1) }}>{b.label}</button>
        ))}
        {selectedIds.size > 1 && (
          <div className="ml-2 bg-green-100 border border-green-300 shadow-sm rounded px-3 py-1 text-center whitespace-nowrap flex flex-col justify-center h-full">
            <div className="text-[10px] font-bold text-green-800 uppercase border-b border-green-300 leading-tight mb-0.5">
              SOMA ITENS ({selectedIds.size})
            </div>
            <div className={`text - sm font - bold ${selectionSum >= 0 ? 'text-green-600' : 'text-red-600'} leading - tight`}>
              {selectionSum < 0 ? '-' : ''}R$ {formatMoneyBr(Math.abs(selectionSum))}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 bg-white border rounded px-3 py-2">
        <div className="flex items-center gap-2 border rounded px-3 py-2">
          <Icon name="search" className="w-4 h-4" />
          <input className="outline-none w-64" placeholder="Buscar cliente, histórico ou valor" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} />
        </div>
        {(filterCaixa || filterGrupo || search) && (
          <button className="text-sm bg-gray-100 hover:bg-gray-200 border rounded px-3 py-2 text-gray-700" onClick={() => { setFilterCaixa(''); setFilterGrupo(''); setSearch('') }}>
            Limpar filtros
          </button>
        )}

        <select
          className="border rounded px-3 py-2 text-sm"
          value={filterCaixa}
          onChange={e => { setFilterCaixa(e.target.value); setPage(1) }}
        >
          <option value="">Todas as Caixas</option>
          {caixas.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2 text-sm"
          value={filterGrupo}
          onChange={e => { setFilterGrupo(e.target.value); setPage(1) }}
        >
          <option value="">Todos os Grupos</option>
          {grupos.map(g => (
            <option key={g.id} value={g.id}>{g.nome}</option>
          ))}
        </select>


      </div>


      {
        filter === 'mesAtual' ? (
          <div className="space-y-4">
            {['Meses Anteriores', 'Próximos Lançamentos'].map(groupTitle => {
              const isPast = groupTitle === 'Meses Anteriores'
              const now = new Date()
              const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)

              const groupItems = rows.allData.filter(r => {
                const d = r.vencimentoDate
                d.setHours(0, 0, 0, 0)
                return isPast ? d < startMonth : d >= startMonth
              })

              if (groupItems.length === 0) return null

              const isExpanded = expanded[groupTitle] !== false // default true? or use state
              const totalRec = groupItems.reduce((sum, r) => sum + r.receita, 0)
              const totalDesp = groupItems.reduce((sum, r) => sum + r.despesa, 0)

              return (
                <div key={groupTitle} className="bg-white border rounded">
                  <div
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                    onClick={() => setExpanded(s => ({ ...s, [groupTitle]: !s[groupTitle] }))}
                  >
                    <div className="font-medium flex items-center gap-2">
                      <span className="text-lg font-bold">{isExpanded ? '-' : '+'}</span>
                      Situação : {groupTitle}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs table-fixed">
                        <thead>
                          <tr className="text-left bg-gray-50 border-b">
                            <th className="p-2 w-[10%]">Data Vencimento</th>
                            <th className="p-2 w-[15%]">Caixa de Lançamento</th>
                            <th className="p-2 w-[20%]">Cliente</th>
                            <th className="p-2 w-[20%]">Compromisso</th>
                            <th className="p-2 w-[15%]">Histórico</th>
                            <th className="p-2 text-right w-[8%]">Receita</th>
                            <th className="p-2 text-right w-[8%]">Despesa</th>
                            <th className="p-2 text-center w-[4%]">Parcela</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupItems.map(r => (
                            <tr
                              key={r.id}
                              className={`border - t hover: bg - gray - 50 cursor - pointer ${selectedIds.has(r.id) ? 'bg-blue-50 ring-2 ring-blue-400' : ''} `}
                              onClick={(e) => handleSelect(e, r.id)}
                              onDoubleClick={() => openModal(r)}
                            >
                              <td className="p-2 truncate">
                                <div>{r.vencimentoBr}</div>
                                {r.statusMessage && (
                                  <div className={`text - xs ${r.diasAtraso > 0 ? 'text-red-600' : 'text-orange-600'} font - medium`}>
                                    {r.statusMessage}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 truncate" title={r.caixa}>{r.caixa}</td>
                              <td className="p-2 truncate" title={r.cliente}>{r.cliente}</td>
                              <td className="p-2 truncate" title={r.compromisso}>{r.compromisso}</td>
                              <td className="p-2 truncate" title={r.historico}>{r.historico}</td>
                              <td className="p-2 text-right">{r.receita > 0 ? `R$ ${formatMoneyBr(r.receita)} ` : '-'}</td>
                              <td className="p-2 text-right">{r.despesa > 0 ? `R$ ${formatMoneyBr(r.despesa)} ` : '-'}</td>
                              <td className="p-2 text-center">{r.totalParcelas > 1 ? `${r.parcela}/${r.totalParcelas}` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-bold border-t-2">
                            <td className="p-2" colSpan={5}></td>
                            <td className="p-2 text-right text-green-700">R$ {formatMoneyBr(totalRec)}</td>
                            <td className="p-2 text-right text-red-700">R$ {formatMoneyBr(totalDesp)}</td>
                            <td className="p-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border rounded">
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-fixed">
                <thead>
                  <tr className="text-left">
                    <th className="p-2 w-[10%]">Data Vencimento</th>
                    <th className="p-2 w-[15%]">Caixa de Lançamento</th>
                    <th className="p-2 w-[20%]">Cliente</th>
                    <th className="p-2 w-[20%]">Compromisso</th>
                    <th className="p-2 w-[15%]">Histórico</th>
                    <th className="p-2 text-right w-[8%]">Receita</th>
                    <th className="p-2 text-right w-[8%]">Despesa</th>
                    <th className="p-2 text-center w-[4%]">Parcela</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.data.map(r => (
                    <tr
                      key={r.id}
                      className={`border - t hover: bg - gray - 50 cursor - pointer ${selectedIds.has(r.id) ? 'bg-blue-50 ring-2 ring-blue-400' : ''} `}
                      onClick={(e) => handleSelect(e, r.id)}
                      onDoubleClick={() => openModal(r)}
                    >
                      <td className="p-2 truncate">
                        <div>{r.vencimentoBr}</div>
                        {r.statusMessage && (
                          <div className={`text - xs ${r.diasAtraso > 0 ? 'text-red-600' : 'text-orange-600'} font - medium`}>
                            {r.statusMessage}
                          </div>
                        )}
                      </td>
                      <td className="p-2 truncate" title={r.caixa}>{r.caixa}</td>
                      <td className="p-2 truncate" title={r.cliente}>{r.cliente}</td>
                      <td className="p-2 truncate" title={r.compromisso}>{r.compromisso}</td>
                      <td className="p-2 truncate" title={r.historico}>{r.historico}</td>
                      <td className="p-2 text-right">{r.receita > 0 ? `R$ ${formatMoneyBr(r.receita)} ` : '-'}</td>
                      <td className="p-2 text-right">{r.despesa > 0 ? `R$ ${formatMoneyBr(r.despesa)} ` : '-'}</td>
                      <td className="p-2 text-center">{r.totalParcelas > 1 ? `${r.parcela}/${r.totalParcelas}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold border-t-2">
                    <td className="p-2" colSpan={5}>TOTAIS ({rows.totalRecords} registros)</td>
                    <td className="p-2 text-right text-green-700">R$ {formatMoneyBr(rows.totalReceitas)}</td>
                    <td className="p-2 text-right text-red-700">R$ {formatMoneyBr(rows.totalDespesas)}</td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      }

      {
        modal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} aria-hidden="true"></div>
            <div className="absolute left-1/2 top-10 -translate-x-1/2 bg-white border rounded w-[90%] max-w-2xl p-6 max-h-[90vh] overflow-y-auto text-xs">
              <div className="font-medium mb-4 text-lg border-b pb-2">Lançamento para o Livro Caixa</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Row 1: Operação | Cliente */}
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Operação</label>
                  <input className="w-full border rounded px-3 py-2 bg-gray-50 capitalize text-xs" value={modal.operacao} disabled />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Cliente</label>
                  <input className="w-full border rounded px-3 py-2 bg-gray-50 text-xs" value={modal.cliente} disabled />
                </div>

                {/* Row 2: Grupo Compromisso | Compromisso */}
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Grupo Compromisso</label>
                  <input className="w-full border rounded px-3 py-2 bg-gray-50 text-xs" value={modal.grupoCompromisso} disabled />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Compromisso</label>
                  <input className="w-full border rounded px-3 py-2 bg-gray-50 text-xs" value={modal.compromisso} disabled />
                </div>

                {/* Row 3: Histórico | Nota Fiscal */}
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Histórico</label>
                  <input className="w-full border rounded px-3 py-2 text-xs" value={modalHistorico} onChange={e => setModalHistorico(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Nota Fiscal</label>
                  <input className="w-full border rounded px-3 py-2 text-xs" value={modalNotaFiscal} onChange={e => setModalNotaFiscal(e.target.value)} />
                </div>

                {/* Row 4: Detalhe */}
                <div className="md:col-span-2">
                  <label className="text-xs block text-gray-600 font-medium">Detalhe</label>
                  <input className="w-full border rounded px-3 py-2 text-xs" value={modalDetalhes} onChange={e => setModalDetalhes(e.target.value)} />
                </div>

                {/* Row 5: Data Vencimento | Data Lançamento */}
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Data Vencimento</label>
                  <input type="date" className="w-full border rounded px-3 py-2 bg-gray-50 text-xs" value={modalData} disabled />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Data Lançamento</label>
                  <input type="date" className="w-full border rounded px-3 py-2 text-xs" value={modalDataLancamento} onChange={e => setModalDataLancamento(e.target.value)} />
                </div>

                {/* Row 6: Valor | Espécie | Caixa Lançamento */}
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Valor (R$)</label>
                  <input type="number" step="0.01" className="w-full border rounded px-3 py-2 font-semibold text-xs" value={modalValor} onChange={e => setModalValor(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs block text-gray-600 font-medium">Espécie</label>
                  <input className="w-full border rounded px-3 py-2 bg-gray-50 capitalize text-xs" value={modal.especie} disabled />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs block text-gray-600 font-medium">Caixa Lançamento</label>
                  <select className="w-full border rounded px-3 py-2 text-xs" value={modalContaId} onChange={e => setModalContaId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button className="rounded border px-4 py-2 hover:bg-gray-50" onClick={() => setModal(null)}>Cancelar</button>
                <button className="bg-black text-white rounded px-4 py-2 hover:bg-gray-800" onClick={() => {
                  if (!modalContaId) { alert('Selecione uma conta'); return }
                  setShowConfirmModal(true)
                }}>Confirmar Lançamento</button>
              </div>
            </div>
            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
              <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
                <div className="bg-white border rounded shadow-lg p-6 w-[300px] text-center">
                  <h3 className="font-semibold text-lg mb-4 text-gray-800">Confirmação</h3>
                  <p className="text-sm text-gray-600 mb-6">Deseja confirmar o lançamento deste item no Livro Caixa?</p>
                  <div className="flex justify-center gap-3">
                    <button
                      className="px-4 py-2 rounded border hover:bg-gray-50 text-sm"
                      onClick={() => setShowConfirmModal(false)}
                    >
                      Não
                    </button>
                    <button
                      className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 text-sm"
                      onClick={async () => {
                        if (hasBackend) {
                          try {
                            const { data, error } = await confirmProvision(modal.id, {
                              valor: modalValor,
                              data: modalDataLancamento,
                              cuentaId: modalContaId
                            })

                            if (error) {
                              alert('Erro de comunicação: ' + error.message)
                              return
                            }

                            // Check RPC application-level error
                            if (data && !data.success) {
                              alert('Erro ao confirmar: ' + data.message)
                              return
                            }

                            setMsg('Lançamento confirmado com sucesso!')
                            setShowConfirmModal(false)
                            setModal(null)
                            // Refresh list
                            listFinancials({ status: 1 }).then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                          } catch (e: any) {
                            alert('Erro: ' + e.message)
                          }
                        } else {
                          alert('Funcionalidade disponível apenas com Backend Supabase')
                        }
                      }}
                    >
                      Sim
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }
    </div >
  )
}
