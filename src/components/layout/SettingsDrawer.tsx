import { useEffect, useState } from "react";
import { useLayout } from "../../context/LayoutContext";
import { SettingsContent } from "./SettingsContent";

export function SettingsDrawer() {
    const [open, setOpen] = useState(false);
    const { setSettings } = useLayout();

    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener("open-settings", handler);
        return () => window.removeEventListener("open-settings", handler);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/20" />
            <div
                className="relative w-80 h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurações</h2>
                    <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <SettingsContent />
                </div>

                {/* Footer buttons */}
                <div className="p-6 border-t border-black/5 dark:border-white/5 space-y-3">
                    <button
                        onClick={() => setSettings(prev => ({
                            ...prev,
                            header: { ...prev.header, visible: true, position: 'fixed' },
                            nav: { ...prev.nav, open: true, position: 'side', collapsed: false, showUserPanel: true },
                            footer: { ...prev.footer, visible: true, position: 'static' },
                            theme: { style: 'default' }
                        }))}
                        className="w-full py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
                    >
                        Redefinir Padrões
                    </button>
                </div>
            </div>
        </div>
    );
}
