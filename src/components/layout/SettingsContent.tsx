
import React from 'react';
import { useLayout } from "../../context/LayoutContext";

export function SettingsContent() {
    const { settings, setSettings } = useLayout();

    const updateHeader = (updates: Partial<typeof settings.header>) => setSettings(prev => ({ ...prev, header: { ...prev.header, ...updates } }));
    const updateNav = (updates: Partial<typeof settings.nav>) => setSettings(prev => ({ ...prev, nav: { ...prev.nav, ...updates } }));
    const updateFooter = (updates: Partial<typeof settings.footer>) => setSettings(prev => ({ ...prev, footer: { ...prev.footer, ...updates } }));
    const updateTheme = (updates: Partial<typeof settings.theme>) => setSettings(prev => ({ ...prev, theme: { ...prev.theme, ...updates } }));

    return (
        <div className="space-y-10">
            {/* ESTILO DO TEMA */}
            <section>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Estilo do Tema</h3>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'default', label: 'Padrão' },
                        { id: 'light', label: 'Luz' },
                        { id: 'dark', label: 'Escuro' },
                        { id: 'flat', label: 'Plano' }
                    ].map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => updateTheme({ style: mode.id as any })}
                            className={`py-3 text-[10px] font-bold uppercase rounded-xl border transition-all ${settings.theme.style === mode.id ? 'bg-teal-50 border-teal-200 text-teal-600 shadow-sm' : 'bg-white dark:bg-gray-800 border-black/5 dark:border-white/5 text-gray-400 hover:bg-gray-50'}`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* BARRA DE FERRAMENTAS */}
            <section>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Barra de Ferramentas</h3>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Visível</span>
                        <div onClick={() => updateHeader({ visible: !settings.header.visible })} className={`w-11 h-6 rounded-full transition-colors relative ${settings.header.visible ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.header.visible ? 'left-6' : 'left-1'}`} />
                        </div>
                    </label>

                    <div className="pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-3 block">Posição</span>
                        <div className="grid grid-cols-3 gap-2">
                            {['sticky', 'fixed', 'static'].map((pos) => (
                                <button
                                    key={pos}
                                    onClick={() => updateHeader({ position: pos as any })}
                                    className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${settings.header.position === pos ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-white dark:bg-gray-800 border-black/5 dark:border-white/5 text-gray-400'}`}
                                >
                                    {pos === 'sticky' ? 'Fixo' : pos === 'fixed' ? 'Sempre' : 'Base'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* NAVEGAÇÃO */}
            <section>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Navegação</h3>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Abrir</span>
                        <div onClick={() => updateNav({ open: !settings.nav.open })} className={`w-11 h-6 rounded-full transition-colors relative ${settings.nav.open ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.nav.open ? 'left-6' : 'left-1'}`} />
                        </div>
                    </label>

                    <div className="pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-3 block">Posição</span>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => updateNav({ position: 'top' })} className={`py-3 flex flex-col items-center gap-1 rounded-xl border transition-all ${settings.nav.position === 'top' ? 'bg-teal-50 border-teal-200 text-teal-600 shadow-sm' : 'bg-white dark:bg-gray-800 border-black/5 dark:border-white/5 text-gray-400 hover:bg-gray-50'}`}>
                                <div className="w-8 h-0.5 bg-current opacity-30 rounded-full" />
                                <span className="text-[10px] font-bold uppercase">Topo</span>
                            </button>
                            <button onClick={() => updateNav({ position: 'side' })} className={`py-3 flex items-center gap-2 justify-center rounded-xl border transition-all ${settings.nav.position === 'side' ? 'bg-teal-50 border-teal-200 text-teal-600 shadow-sm' : 'bg-white dark:bg-gray-800 border-black/5 dark:border-white/5 text-gray-400 hover:bg-gray-50'}`}>
                                <div className="w-0.5 h-6 bg-current opacity-30 rounded-full" />
                                <span className="text-[10px] font-bold uppercase">Lado</span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 space-y-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block">Opções</span>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div onClick={() => updateNav({ collapsed: !settings.nav.collapsed })} className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${settings.nav.collapsed ? 'bg-teal-500 border-teal-500 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-teal-400'}`}>
                                {settings.nav.collapsed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Recolher Menu</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div onClick={() => updateNav({ showUserPanel: !settings.nav.showUserPanel })} className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${settings.nav.showUserPanel ? 'bg-teal-500 border-teal-500 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-teal-400'}`}>
                                {settings.nav.showUserPanel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Exibir Painel do Usuário</span>
                        </label>
                    </div>
                </div>
            </section>

            {/* RODAPÉ */}
            <section>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Rodapé</h3>
                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Visível</span>
                        <div onClick={() => updateFooter({ visible: !settings.footer.visible })} className={`w-11 h-6 rounded-full transition-colors relative ${settings.footer.visible ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.footer.visible ? 'left-6' : 'left-1'}`} />
                        </div>
                    </label>

                    <div className="pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-3 block">Posição</span>
                        <div className="grid grid-cols-2 gap-2">
                            {['sticky', 'static'].map((pos) => (
                                <button
                                    key={pos}
                                    onClick={() => updateFooter({ position: pos as any })}
                                    className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${settings.footer.position === pos ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-white dark:bg-gray-800 border-black/5 dark:border-white/5 text-gray-400'}`}
                                >
                                    {pos === 'sticky' ? 'Fixo' : 'Base'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
