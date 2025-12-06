import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../store/AppStore'
import { hasBackend } from '../lib/runtime'
import { listSchedules, listAccounts, listCommitmentGroups, createTransaction, updateSchedule } from '../services/db'
import { formatMoneyBr } from '../utils/format'

type Filter = 'vencidos' | '7dias' | 'mesAtual' | 'proximoMes' | '2meses' | '6meses' | '12meses' | 'fimAno'

function toBr(iso: string) {
  if (!iso) return ''
  // Fix: Parse date without timezone conversion
  const dateStr = iso.split('T')[0] // Get YYYY-MM-DD
  if (!dateStr) return ''
  const [yyyy, mm, dd] = dateStr.split('-')
  if (!yyyy || !mm || !dd) return ''
  return `${dd}/${mm}/${yyyy}`
}

export default function ScheduleControl() {
  const store = useAppStore()
  const [remote, setRemote] = useState<any[]>([])
  const [modal, setModal] = useState<any | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
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

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Carregar caixas e grupos
  useEffect(() => {
    if (hasBackend) {
      listAccounts().then(r => { if (!r.error && r.data) setCaixas(r.data as any) })
      listCommitmentGroups().then(r => { if (!r.error && r.data) setGrupos(r.data as any) })
    }
  }, [])

  useMemo(() => {
    if (hasBackend) {
      listSchedules().then(r => { if (!r.error && r.data) setRemote(r.data as any) })
    }
  }, [])

  // Refresh automaticamente ao entrar/voltar para a tela
  useMemo(() => {
    function refresh() {
      if (hasBackend) {
        listSchedules().then(r => { if (!r.error && r.data) setRemote(r.data as any) })
      }
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])


  const rows = useMemo(() => {
    const src = hasBackend ? remote : store.schedules
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

    // Função para expandir agendamentos fixos em múltiplas ocorrências
    function expandFixedSchedules(schedules: any[]): any[] {
      const expanded: any[] = []
      const filterEndDate = getFilterEndDate()

      schedules.forEach((s: any) => {
        // Apenas expandir se for tipo 'fixo' e situacao !== 2 (não confirmado)
        if (s.tipo === 'fixo' && s.situacao !== 2) {
          const baseDate = new Date(s.proxima_vencimento)
          const incrementMonths = s.periodo === 'mensal' ? 1 : 12

          let occurrence = 0
          let currentDate = new Date(baseDate)

          // Gerar ocorrências até a data limite do filtro
          while (currentDate <= filterEndDate) {
            // Criar cópia do agendamento com data ajustada
            expanded.push({
              ...s,
              id: occurrence === 0 ? s.id : `${s.id}_${occurrence}`, // ID único para cada ocorrência
              proxima_vencimento: currentDate.toISOString().split('T')[0],
              _isExpanded: occurrence > 0, // Marca ocorrências expandidas
              _originalId: s.id, // Mantém referência ao ID original
              _occurrence: occurrence
            })

            // Próxima ocorrência
            occurrence++
            currentDate = new Date(baseDate)
            currentDate.setMonth(currentDate.getMonth() + (incrementMonths * occurrence))
          }
        } else {
          // Agendamentos não-fixos ou já confirmados: adicionar sem expansão
          expanded.push(s)
        }
      })

      return expanded
    }

    // Expandir agendamentos fixos ANTES de processar
    const expandedSource = expandFixedSchedules(src)

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
    const data = expandedSource.map((s: any) => {
      const d = new Date(s.proxima_vencimento)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(d)
      dueDate.setHours(0, 0, 0, 0)

      const qtd = s.parcelas || 1
      // Para itens variáveis, mostrar valor mensal (total / parcelas)
      // Para itens fixos, mostrar o valor total
      const valorParcela = s.tipo === 'fixo' ? Number(s.valor) : Number(s.valor) / qtd
      const isReceita = s.operacao === 'receita' || s.operacao === 'aporte'

      // Calcular dias de atraso
      const diffTime = today.getTime() - dueDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      let statusMessage = ''
      if (diffDays > 0) {
        statusMessage = `Vencido há ${diffDays} dia(s)...`
      } else if (diffDays === 0) {
        statusMessage = 'Vencimento Hoje...'
      }

      return {
        id: s.id,
        operacao: s.operacao,
        vencimento: s.proxima_vencimento, // mantém formato ISO para ordenação
        vencimentoBr: toBr(s.proxima_vencimento),
        caixa: s.caixa?.nome || s.nome_caixa || '', // buscar pelo relacionamento ou campo direto
        caixaId: s.caixa_id || '',
        cliente: s.cliente?.nome || s.nome_cliente || s.cliente || '', // múltiplas formas de buscar
        compromisso: s.compromisso?.nome || s.nome_compromisso || s.compromisso || '',
        grupoCompromisso: s.grupo_compromisso?.nome || '',
        grupoCompromissoId: s.grupo_compromisso_id || '',
        historico: s.historico || '',
        notaFiscal: s.nota_fiscal || '',
        detalhes: s.detalhes || '',
        especie: s.especie || '',
        receita: isReceita ? valorParcela : 0,
        despesa: !isReceita ? valorParcela : 0,
        parcela: qtd,
        vencimentoDate: d,
        diasAtraso: diffDays,
        statusMessage: statusMessage,
      }
    }).filter(r => within(new Date(r.vencimento)))
      .filter(r => !filterCaixa || r.caixaId === filterCaixa) // Filtro por Caixa
      .filter(r => !filterGrupo || r.grupoCompromissoId === filterGrupo) // Filtro por Grupo
      .filter(r => [r.cliente, r.historico, r.compromisso].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => a.vencimentoDate.getTime() - b.vencimentoDate.getTime()) // ordenar do mais antigo para o mais recente

    // Calcular totais
    const totalReceitas = data.reduce((sum, r) => sum + r.receita, 0)
    const totalDespesas = data.reduce((sum, r) => sum + r.despesa, 0)

    const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
    const current = Math.min(page, totalPages)
    const paginatedData = data.slice((current - 1) * pageSize, current * pageSize)

    return {
      data: paginatedData,
      current,
      totalPages,
      totalReceitas,
      totalDespesas,
      totalRecords: data.length,
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

  function openModal(item: any) {
    setModal(item)
    setModalContaId(item.caixaId || '')
    setModalData(item.vencimentoDate.toISOString().split('T')[0])
    setModalDataLancamento(new Date().toISOString().split('T')[0])
    setModalValor(item.despesa || item.receita)
    setModalHistorico(item.historico)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Controle e Previsão</h1>
      {msg && <div className="text-sm text-green-700">{msg}</div>}
      <div role="group" aria-label="Filtros por período" className="flex flex-nowrap gap-2 overflow-x-auto">
        {buttons.map(b => (
          <button key={b.id} className={`px-3 py-2 rounded border transition-colors duration-300 text-xs md:text-sm whitespace-nowrap ${filter === b.id ? 'bg-fourtek-blue text-white' : 'bg-white hover:bg-gray-50'}`} onClick={() => { setFilter(b.id); setPage(1) }}>{b.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 bg-white border rounded px-3 py-2">
        <input className="outline-none flex-1 min-w-[200px]" placeholder="Buscar cliente ou histórico" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />

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
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left bg-gray-50 border-b">
                            <th className="p-2">Data Vencimento</th>
                            <th className="p-2">Caixa de Lançamento</th>
                            <th className="p-2">Cliente</th>
                            <th className="p-2">Compromisso</th>
                            <th className="p-2">Histórico</th>
                            <th className="p-2 text-right">Receita</th>
                            <th className="p-2 text-right">Despesa</th>
                            <th className="p-2 text-center">Parcela</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupItems.map(r => (
                            <tr
                              key={r.id}
                              className={`border-t hover:bg-gray-50 cursor-pointer ${selectedId === r.id ? 'bg-blue-50 ring-2 ring-blue-400' : ''}`}
                              onClick={() => setSelectedId(r.id)}
                              onDoubleClick={() => openModal(r)}
                            >
                              <td className="p-2">
                                <div>{r.vencimentoBr}</div>
                                {r.statusMessage && (
                                  <div className={`text-xs ${r.diasAtraso > 0 ? 'text-red-600' : 'text-orange-600'} font-medium`}>
                                    {r.statusMessage}
                                  </div>
                                )}
                              </td>
                              <td className="p-2">{r.caixa}</td>
                              <td className="p-2">{r.cliente}</td>
                              <td className="p-2">{r.compromisso}</td>
                              <td className="p-2">{r.historico}</td>
                              <td className="p-2 text-right">{r.receita > 0 ? `R$ ${formatMoneyBr(r.receita)}` : '-'}</td>
                              <td className="p-2 text-right">{r.despesa > 0 ? `R$ ${formatMoneyBr(r.despesa)}` : '-'}</td>
                              <td className="p-2 text-center">{r.parcela}</td>
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
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Data Vencimento</th>
                    <th className="p-2">Caixa de Lançamento</th>
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Compromisso</th>
                    <th className="p-2">Histórico</th>
                    <th className="p-2 text-right">Receita</th>
                    <th className="p-2 text-right">Despesa</th>
                    <th className="p-2 text-center">Parcela</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.data.map(r => (
                    <tr
                      key={r.id}
                      className={`border-t hover:bg-gray-50 cursor-pointer ${selectedId === r.id ? 'bg-blue-50 ring-2 ring-blue-400' : ''}`}
                      onClick={() => setSelectedId(r.id)}
                      onDoubleClick={() => openModal(r)}
                    >
                      <td className="p-2">
                        <div>{r.vencimentoBr}</div>
                        {r.statusMessage && (
                          <div className={`text-xs ${r.diasAtraso > 0 ? 'text-red-600' : 'text-orange-600'} font-medium`}>
                            {r.statusMessage}
                          </div>
                        )}
                      </td>
                      <td className="p-2">{r.caixa}</td>
                      <td className="p-2">{r.cliente}</td>
                      <td className="p-2">{r.compromisso}</td>
                      <td className="p-2">{r.historico}</td>
                      <td className="p-2 text-right">{r.receita > 0 ? `R$ ${formatMoneyBr(r.receita)}` : '-'}</td>
                      <td className="p-2 text-right">{r.despesa > 0 ? `R$ ${formatMoneyBr(r.despesa)}` : '-'}</td>
                      <td className="p-2 text-center">{r.parcela}</td>
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
            <div className="flex items-center justify-end gap-2 p-2">
              <button className="px-3 py-1 rounded border" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={rows.current === 1}>Anterior</button>
              <span>Página {rows.current} de {rows.totalPages}</span>
              <button className="px-3 py-1 rounded border" onClick={() => setPage(p => Math.min(rows.totalPages, p + 1))} disabled={rows.current === rows.totalPages}>Próxima</button>
            </div>
          </div>
        )
      }

      {
        modal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} aria-hidden="true"></div>
            <div className="absolute left-1/2 top-10 -translate-x-1/2 bg-white border rounded w-[90%] max-w-2xl p-6 max-h-[90vh] overflow-y-auto text-xs">
              <div className="font-medium mb-4 text-lg border-b pb-2">Detalhes do Lançamento</div>

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
                  <input className="w-full border rounded px-3 py-2 bg-gray-50 text-xs" value={modal.notaFiscal} disabled />
                </div>

                {/* Row 4: Detalhe */}
                <div className="md:col-span-2">
                  <label className="text-xs block text-gray-600 font-medium">Detalhe</label>
                  <input className="w-full border rounded px-3 py-2 bg-gray-50 text-xs" value={modal.detalhes} disabled />
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
                <button className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700" onClick={() => {
                  if (hasBackend) {
                    updateSchedule(modal.id, {
                      historico: modalHistorico,
                      proxima_vencimento: modalData,
                      valor: modalValor,
                      caixa_id: modalContaId || null
                    }).then(() => {
                      setMsg('Alterações salvas com sucesso')
                      setTimeout(() => setMsg(''), 2500)
                      listSchedules().then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                      setModal(null)
                    })
                  } else {
                    store.updateSchedule(modal.id, {
                      historico: modalHistorico,
                      proxima_vencimento: modalData,
                      valor: modalValor,
                      caixa_id: modalContaId || undefined
                    })
                    setModal(null)
                  }
                }}>Salvar Alterações</button>
                <button className="bg-black text-white rounded px-4 py-2 hover:bg-gray-800" onClick={() => {
                  if (!modalContaId) { alert('Selecione uma conta'); return }

                  const oper = modal.operacao || 'despesa'
                  const isDespesa = oper === 'despesa' || oper === 'retirada'

                  const trx = isDespesa
                    ? { conta_id: modalContaId, operacao: oper as any, historico: modalHistorico, data_lancamento: modalDataLancamento, data_vencimento: modalData, valor_entrada: 0, valor_saida: modalValor, status: 'pago' as const, cliente: modal.cliente, compromisso: modal.compromisso }
                    : { conta_id: modalContaId, operacao: oper as any, historico: modalHistorico, data_lancamento: modalDataLancamento, data_vencimento: modalData, valor_entrada: modalValor, valor_saida: 0, status: 'recebido' as const, cliente: modal.cliente, compromisso: modal.compromisso }

                  if (hasBackend) {
                    (async () => {
                      await createTransaction(trx)
                      await (await import('../services/db')).updateSchedule(modal.id, { situacao: 2 })
                      listSchedules().then(r => { if (!r.error && r.data) setRemote(r.data as any) })
                    })()
                  } else {
                    store.createTransaction(trx as any)
                    store.updateSchedule(modal.id, { situacao: 2 })
                  }
                  setModal(null)
                  setMsg('Item confirmado com sucesso')
                  setTimeout(() => setMsg(''), 2500)
                }}>Confirmar Lançamento</button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}
