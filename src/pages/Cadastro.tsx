import { useEffect, useState } from 'react'
import { createCommitmentGroup, createCommitment, listCommitmentGroups } from '../services/db'

export default function Cadastro() {
  const [grupos, setGrupos] = useState<{id:string;nome:string;operacao?:string}[]>([])
  const [op, setOp] = useState<'receita'|'despesa'|'aporte'|'retirada'>('despesa')
  const [descricaoGrupo, setDescricaoGrupo] = useState('')
  const [erroGrupo, setErroGrupo] = useState('')
  const [grupoSel, setGrupoSel] = useState('')
  const [descricaoComp, setDescricaoComp] = useState('')
  const [erroComp, setErroComp] = useState('')

  useEffect(() => {
    listCommitmentGroups().then(r => { if (!r.error && r.data) setGrupos(r.data as any) })
  }, [])

  async function salvarGrupo(e: React.FormEvent) {
    e.preventDefault()
    setErroGrupo('')
    if (!descricaoGrupo) { setErroGrupo('Descrição obrigatória'); return }
    const r = await createCommitmentGroup({ operacao: op, nome: descricaoGrupo })
    if (r.error) setErroGrupo(r.error.message)
    else { setDescricaoGrupo(''); listCommitmentGroups().then(rr => { if (!rr.error && rr.data) setGrupos(rr.data as any) }) }
  }

  async function salvarComp(e: React.FormEvent) {
    e.preventDefault()
    setErroComp('')
    if (!grupoSel) { setErroComp('Selecione o grupo'); return }
    if (!descricaoComp) { setErroComp('Descrição obrigatória'); return }
    const r = await createCommitment({ grupo_id: grupoSel, nome: descricaoComp })
    if (r.error) setErroComp(r.error.message)
    else { setDescricaoComp('') }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Cadastro</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-3">Grupo de Compromisso</div>
          <form onSubmit={salvarGrupo} className="space-y-3">
            <div>
              <label className="text-sm">Tipo de operação</label>
              <select className="w-full border rounded px-3 py-2" value={op} onChange={e => setOp(e.target.value as any)}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
                <option value="aporte">Aporte</option>
                <option value="retirada">Retirada</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Descrição</label>
              <input className="w-full border rounded px-3 py-2" value={descricaoGrupo} onChange={e => setDescricaoGrupo(e.target.value)} />
            </div>
            {erroGrupo && <div className="text-xs text-red-600">{erroGrupo}</div>}
            <div className="flex justify-end">
              <button className="bg-black text-white rounded px-3 py-2">Salvar</button>
            </div>
          </form>
        </div>

        <div className="bg-white border rounded p-4">
          <div className="font-medium mb-3">Compromisso</div>
          <form onSubmit={salvarComp} className="space-y-3">
            <div>
              <label className="text-sm">Grupo de Compromisso</label>
              <select className="w-full border rounded px-3 py-2" value={grupoSel} onChange={e => setGrupoSel(e.target.value)}>
                <option value="">Selecione</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nome} {g.operacao ? `(${g.operacao})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm">Descrição do Plano de Conta</label>
              <input className="w-full border rounded px-3 py-2" value={descricaoComp} onChange={e => setDescricaoComp(e.target.value)} />
            </div>
            {erroComp && <div className="text-xs text-red-600">{erroComp}</div>}
            <div className="flex justify-end">
              <button className="bg-black text-white rounded px-3 py-2">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
