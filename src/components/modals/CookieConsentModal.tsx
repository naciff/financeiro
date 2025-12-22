import React, { useEffect, useState } from 'react';

export function CookieConsentModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            setIsOpen(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent', 'accepted');
        setIsOpen(false);
    };

    const handleReject = () => {
        localStorage.setItem('cookie_consent', 'rejected');
        setIsOpen(false);
    };

    const handleManage = () => {
        // For now, treat as accept or just close, as "Manage" logic is usually complex
        // Or we could set a specific 'custom' state if needed later.
        // User request didn't specify detailed management logic, just the button.
        alert("Funcionalidade de gerenciamento detalhado em breve.");
        // setIsOpen(false); // Valid to keep open or close
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 left-4 z-[9999] p-0 pointer-events-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border dark:border-gray-700 max-w-sm w-full p-6 text-center animate-in slide-in-from-bottom-5 duration-300">
                <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">Sua privacidade é importante</h2>
                <p className="text-gray-600 dark:text-gray-300 text-xs mb-6 leading-relaxed">
                    Utilizamos cookies para melhorar sua experiência.
                    Clique em 'Aceitar todos' para consentir de acordo com nossas políticas de <span className="font-bold">Cookies</span> e <span className="font-bold">Privacidade</span>.
                </p>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleAccept}
                        className="w-full py-2 bg-black dark:bg-white border-2 border-black dark:border-white text-white dark:text-black font-bold rounded hover:opacity-90 transition-opacity uppercase text-xs tracking-wide shadow-md"
                    >
                        Aceitar todos
                    </button>

                    <button
                        onClick={handleManage}
                        className="w-full py-2 bg-transparent border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors uppercase text-xs tracking-wide"
                    >
                        Gerenciar preferências
                    </button>

                    <button
                        onClick={handleReject}
                        className="w-full py-2 bg-transparent text-gray-400 dark:text-gray-500 font-semibold rounded hover:text-red-500 dark:hover:text-red-400 transition-colors text-xs tracking-wide"
                    >
                        Rejeitar todos
                    </button>
                </div>
            </div>
        </div>
    );
}
