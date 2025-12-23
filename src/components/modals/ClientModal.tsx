import { useState, useEffect } from 'react'
import { createClient } from '../../services/db'
import { useAppStore } from '../../store/AppStore'
import { hasBackend } from '../../lib/runtime'
import { digits, maskCpfCnpj } from '../../utils/format'
import { Icon } from '../ui/Icon'
import { FloatingLabelInput } from '../ui/FloatingLabelInput'

type Props = {
    isOpen: boolean
    onClose: () => void
    onSuccess: (client: { id: string, nome: string }) => void
}

export function ClientModal({ isOpen, onClose, onSuccess }: Props) {
    const store = useAppStore()
    const [tipoPessoa, setTipoPessoa] = useState<'pf' | 'pj'>('pj')
    const [cpfCnpj, setCpfCnpj] = useState('')
    const [novoClienteNome, setNovoClienteNome] = useState('')
    const [razaoSocial, setRazaoSocial] = useState('')
    const [enderecoEmpresa, setEnderecoEmpresa] = useState('')
    const [atividadePrincipal, setAtividadePrincipal] = useState('')
    const [novoClienteEmail, setNovoClienteEmail] = useState('')
    const [novoClienteTelefone, setNovoClienteTelefone] = useState('')
    const [docStatus, setDocStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [docError, setDocError] = useState('')

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTipoPessoa('pj')
            setCpfCnpj('')
            setNovoClienteNome('')
            setRazaoSocial('')
            setEnderecoEmpresa('')
            setAtividadePrincipal('')
            setNovoClienteEmail('')
            setNovoClienteTelefone('')
            setDocStatus('idle')
            setDocError('')
        }
    }, [isOpen])

    function validarCNPJ(v: string) {
        const d = digits(v)
        if (d.length !== 14 || /^([0-9])\1+$/.test(d)) return false
        const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        let s = 0; for (let i = 0; i < 12; i++) s += parseInt(d[i]) * w1[i]; let r = s % 11; const dv1 = r < 2 ? 0 : 11 - r
        s = 0; for (let i = 0; i < 13; i++) s += parseInt(d[i]) * w2[i]; r = s % 11; const dv2 = r < 2 ? 0 : 11 - r
        return dv1 === parseInt(d[12]) && dv2 === parseInt(d[13])
    }

    useEffect(() => {
        if (tipoPessoa === 'pj') {
            const d = digits(cpfCnpj)
            if (d.length === 14) {
                if (!validarCNPJ(cpfCnpj)) {
                    setDocError('CNPJ inválido')
                } else {
                    setDocError('')
                    consultarReceita(cpfCnpj)
                }
            } else {
                setDocError('')
            }
        } else {
            setDocError('')
        }
    }, [cpfCnpj, tipoPessoa])

    async function consultarReceita(cnpj: string) {
        try {
            setDocStatus('loading')
            const d = digits(cnpj)
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`)
            if (!res.ok) throw new Error('Erro na consulta')

            const j = await res.json()

            setRazaoSocial((j.razao_social || j.nome_fantasia || '').toUpperCase())

            const addressParts = [
                j.logradouro,
                j.numero,
                j.bairro,
                j.municipio,
                j.uf
            ].filter(Boolean)
            setEnderecoEmpresa(addressParts.join(', '))

            setAtividadePrincipal(j.cnae_fiscal_descricao || '')

            // Always update if we got data
            setNovoClienteNome((j.nome_fantasia || j.razao_social || '').toUpperCase())
            if (j.email) setNovoClienteEmail(j.email)
            if (j.ddd_telefone_1) setNovoClienteTelefone(j.ddd_telefone_1)

            setDocStatus('success')
        } catch (e) {
            console.error('Erro BrasilAPI:', e)
            setDocStatus('error')
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (cpfCnpj && docError) return
        if (tipoPessoa === 'pf' && !novoClienteNome) return
        if (tipoPessoa === 'pj' && !razaoSocial && !novoClienteNome) return

        const finalName = tipoPessoa === 'pj' ? (razaoSocial || novoClienteNome) : novoClienteNome

        try {
            if (hasBackend) {
                if (!store.activeOrganization) {
                    alert('Nenhuma empresa selecionada') // Or handle gracefully
                    return
                }
                const r = await createClient({
                    nome: finalName,
                    documento: cpfCnpj || undefined,
                    email: novoClienteEmail || undefined,
                    telefone: novoClienteTelefone || undefined,
                    razao_social: razaoSocial || undefined,
                    endereco: enderecoEmpresa || undefined,
                    atividade_principal: atividadePrincipal || undefined,
                    organization_id: store.activeOrganization
                })
                if (!r.error && r.data?.id) {
                    onSuccess({ id: r.data.id, nome: finalName })
                    onClose()
                }
            } else {
                const id = store.createClient({
                    nome: finalName,
                    documento: cpfCnpj || undefined,
                    email: novoClienteEmail || undefined,
                    telefone: novoClienteTelefone || undefined,
                    razao_social: razaoSocial || undefined,
                    endereco: enderecoEmpresa || undefined,
                    atividade_principal: atividadePrincipal || undefined
                })
                onSuccess({ id, nome: finalName })
                onClose()
            }
        } catch (error) {
            console.error(error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 text-left backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true"></div>
            <div className="relative bg-white dark:bg-gray-800 border dark:border-gray-700 rounded w-[90%] max-w-lg max-h-[80vh] overflow-auto p-4 text-gray-900 dark:text-gray-100 shadow-xl">
                <div className="flex items-center justify-between mb-3 border-b dark:border-gray-700 pb-2">
                    <div className="font-medium text-lg">Novo Cliente</div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6"> {/* Increased space-y for floating labels */}
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setTipoPessoa('pf')}>
                            <input id="modal_tp_pf" type="radio" name="modal_tp" checked={tipoPessoa === 'pf'} onChange={() => setTipoPessoa('pf')} className="cursor-pointer" />
                            <label htmlFor="modal_tp_pf" className="text-sm cursor-pointer font-medium">Pessoa Física</label>
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setTipoPessoa('pj')}>
                            <input id="modal_tp_pj" type="radio" name="modal_tp" checked={tipoPessoa === 'pj'} onChange={() => setTipoPessoa('pj')} className="cursor-pointer" />
                            <label htmlFor="modal_tp_pj" className="text-sm cursor-pointer font-medium">Pessoa Jurídica</label>
                        </div>
                    </div>

                    <div>
                        <FloatingLabelInput
                            label={tipoPessoa === 'pj' ? 'CNPJ' : 'CPF'}
                            id="cpfCnpj"
                            value={cpfCnpj}
                            onChange={e => setCpfCnpj(maskCpfCnpj(e.target.value))}
                            aria-invalid={!!docError}
                            className={docError ? "border-red-500 focus:border-red-500" : ""}
                        />
                        {docStatus === 'loading' && <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Consultando BrasilAPI...</div>}
                        {docStatus === 'success' && <div className="text-xs text-green-700 dark:text-green-400 mt-1">Documento válido</div>}
                        {docStatus === 'error' && <div className="text-xs text-red-600 dark:text-red-400 mt-1">Erro na consulta ou documento não encontrado</div>}
                        {docError && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{docError}</div>}
                    </div>

                    {tipoPessoa === 'pf' && (
                        <div>
                            <FloatingLabelInput
                                label="Nome *"
                                id="nome"
                                value={novoClienteNome}
                                onChange={e => setNovoClienteNome(e.target.value.toUpperCase())}
                            />
                        </div>
                    )}

                    {tipoPessoa === 'pj' && (
                        <div>
                            <FloatingLabelInput
                                label="Razão Social *"
                                id="razaoSocial"
                                value={razaoSocial}
                                onChange={e => setRazaoSocial(e.target.value.toUpperCase())}
                            />
                        </div>
                    )}

                    <div>
                        <FloatingLabelInput
                            label="Endereço"
                            id="endereco"
                            value={enderecoEmpresa}
                            onChange={e => setEnderecoEmpresa(e.target.value)}
                        />
                    </div>

                    {tipoPessoa === 'pj' && (
                        <div>
                            <FloatingLabelInput
                                label="Atividade Principal"
                                id="atividade"
                                value={atividadePrincipal}
                                onChange={e => setAtividadePrincipal(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <FloatingLabelInput
                                label="Email"
                                id="email"
                                value={novoClienteEmail}
                                onChange={e => setNovoClienteEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <FloatingLabelInput
                                label="Telefone"
                                id="telefone"
                                value={novoClienteTelefone}
                                onChange={e => setNovoClienteTelefone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-2 border-t dark:border-gray-700">
                        <button type="button" className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded px-4 py-2 text-sm font-medium transition-colors" onClick={onClose}>Cancelar</button>
                        <button className="bg-black dark:bg-gray-900 hover:bg-gray-800 dark:hover:bg-gray-950 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors shadow-sm" type="submit" disabled={!!docError}>Salvar Cliente</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
