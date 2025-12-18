import React, { useEffect, useState } from 'react'
import { getAdminStats, execSqlAdmin } from '../services/db'
import { Icon } from '../components/ui/Icon'

export default function DbManager() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const [query, setQuery] = useState('')
    const [execResult, setExecResult] = useState<string | null>(null)
    const [execError, setExecError] = useState<string | null>(null)
    const [executing, setExecuting] = useState(false)

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        setLoading(true)
        const res = await getAdminStats()
        if (res.data && res.data.length > 0) {
            setStats(res.data[0])
        }
        setLoading(false)
    }

    async function handleRunSql() {
        if (!query.trim()) return
        if (!confirm('ATENÇÃO: Executar SQL arbitrários pode causar PERDA DE DADOS IRREVERSÍVEL. Tem certeza?')) return

        setExecuting(true)
        setExecResult(null)
        setExecError(null)

        const res = await execSqlAdmin(query)
        console.log('SQL Result', res)

        if (res.error) {
            setExecError(res.error.message || JSON.stringify(res.error))
        } else {
            setExecResult(res.data) // Should be "Success" or error message from catch
            // If the function returns text, rpc usually puts it in data
        }
        setExecuting(false)
        loadStats() // Refresh stats after op
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Icon name="database" className="w-6 h-6 text-purple-600" />
                    Gerenciador de Banco de Dados
                </h2>
                <button onClick={loadStats} className="text-sm text-blue-600 hover:underline">Atualizar</button>
            </div>

            {loading && !stats && <div className="text-gray-500">Carregando estatísticas...</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard label="Usuários" value={stats.total_users} icon="user" color="blue" />
                    <StatCard label="Organizações" value={stats.total_organizations} icon="briefcase" color="purple" />
                    <StatCard label="Transações" value={stats.total_transactions} icon="transfer" color="green" />
                    <StatCard label="Contas" value={stats.total_accounts} icon="wallet" color="orange" />
                    <StatCard label="Tamanho DB" value={stats.db_size} icon="database" color="gray" />
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded p-6 shadow-sm">
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100 border-b pb-2">Executor SQL (Admin)</h3>
                <p className="text-sm text-red-600 mb-4 bg-red-50 p-2 rounded border border-red-200">
                    ⚠ CUIDADO: Esta ferramenta executa comandos diretamente no banco com privilégios de super-usuário.
                </p>

                <textarea
                    className="w-full h-40 font-mono text-sm border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 mb-3 focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Ex: DELETE FROM items WHERE id = '...'; OR UPDATE configs SET ..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />

                <div className="flex items-center justify-between">
                    <button
                        onClick={handleRunSql}
                        disabled={executing || !query.trim()}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {executing ? 'Executando...' : 'Executar SQL'}
                        <Icon name="play" className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setQuery('')}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        Limpar
                    </button>
                </div>

                {execResult && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-green-900 font-mono text-sm whitespace-pre-wrap">
                        <strong>Resultado:</strong> {execResult}
                    </div>
                )}

                {execError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-900 font-mono text-sm whitespace-pre-wrap">
                        <strong>Erro:</strong> {execError}
                    </div>
                )}
            </div>
        </div>
    )
}

function StatCard({ label, value, icon, color }: any) {
    const colors: any = {
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        green: 'bg-green-100 text-green-600',
        orange: 'bg-orange-100 text-orange-600',
        gray: 'bg-gray-100 text-gray-600',
    }
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded border dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${colors[color]}`}>
                <Icon name={icon} className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</div>
        </div>
    )
}
