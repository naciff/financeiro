
import React from 'react'

export function Help() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central de Ajuda</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FAQ Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Perguntas Frequentes</h2>
                    <div className="space-y-4">
                        <details className="group">
                            <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                                <span>Como alterar minha senha?</span>
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-gray-600 dark:text-gray-400 mt-3 group-open:animate-fadeIn">
                                Você pode alterar sua senha saindo do sistema e clicando em "Esqueci minha senha" na tela de login.
                            </p>
                        </details>
                        <div className="border-t border-gray-100 dark:border-gray-700"></div>
                        <details className="group">
                            <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                                <span>Como criar um novo lançamento?</span>
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-gray-600 dark:text-gray-400 mt-3 group-open:animate-fadeIn">
                                Clique no botão "+" na barra superior ou acesse a página "Livro Caixa" e use a interface de adição rápida.
                            </p>
                        </details>
                        <div className="border-t border-gray-100 dark:border-gray-700"></div>
                        <details className="group">
                            <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                                <span>Como exportar relatórios?</span>
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-gray-600 dark:text-gray-400 mt-3 group-open:animate-fadeIn">
                                Acesse a página "Relatórios", configure os filtros desejados e clique nos botões de exportação (PDF ou Excel) no topo da tabela.
                            </p>
                        </details>
                    </div>
                </div>

                {/* Contact Support */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Suporte</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Precisa de ajuda adicional? Entre em contato com nosso time de suporte.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <span className="material-icons-outlined text-primary">email</span>
                            <span>suporte@contamestre.com.br</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <span className="material-icons-outlined text-primary">phone</span>
                            <span>(11) 99999-9999</span>
                        </div>
                    </div>

                    <button className="mt-8 w-full bg-primary text-white py-2 rounded-lg hover:bg-primary-dark transition-colors">
                        Abrir Chamado
                    </button>
                </div>
            </div>
        </div>
    )
}
