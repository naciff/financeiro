
import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeStyle = 'default' | 'light' | 'dark' | 'flat';

export interface LayoutState {
    header: {
        visible: boolean;
        position: 'fixed' | 'sticky' | 'static';
    };
    nav: {
        open: boolean;
        position: 'top' | 'side';
        collapsed: boolean;
        showUserPanel: boolean;
    };
    footer: {
        visible: boolean;
        position: 'fixed' | 'static' | 'sticky';
    };
    theme: {
        style: ThemeStyle;
    };
}

interface LayoutContextType {
    settings: LayoutState;
    setSettings: React.Dispatch<React.SetStateAction<LayoutState>>;
}

const defaultSettings: LayoutState = {
    header: {
        visible: true,
        position: 'fixed',
    },
    nav: {
        open: true,
        position: 'side',
        collapsed: false,
        showUserPanel: true,
    },
    footer: {
        visible: true,
        position: 'static',
    },
    theme: {
        style: 'default',
    },
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<LayoutState>(defaultSettings);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('app-layout-settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge saved settings with defaultSettings to ensure new properties (like theme) exist
                setSettings({
                    ...defaultSettings,
                    ...parsed,
                    header: { ...defaultSettings.header, ...(parsed.header || {}) },
                    nav: { ...defaultSettings.nav, ...(parsed.nav || {}) },
                    footer: { ...defaultSettings.footer, ...(parsed.footer || {}) },
                    theme: { ...defaultSettings.theme, ...(parsed.theme || {}) }
                });
            } catch (e) {
                console.error("Failed to parse layout settings", e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('app-layout-settings', JSON.stringify(settings));
        }
    }, [settings, isInitialized]);

    // Apply theme to HTML element
    useEffect(() => {
        if (!isInitialized) return;

        const root = window.document.documentElement;
        const style = settings.theme.style;

        root.classList.remove("light", "dark", "theme-flat");

        if (style === 'default') {
            root.classList.add("light");
            root.setAttribute("data-theme", "light");
        } else if (style === 'flat') {
            root.classList.add("light", "theme-flat");
            root.setAttribute("data-theme", "light");
        } else {
            root.classList.add(style);
            root.setAttribute("data-theme", style);
        }
    }, [settings.theme.style, isInitialized]);

    return (
        <LayoutContext.Provider value={{ settings, setSettings }}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}
