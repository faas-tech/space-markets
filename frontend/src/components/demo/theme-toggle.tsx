'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        // We check initial preference or stored value if needed, but defaulting to dark
        const stored = localStorage.getItem('theme-preference');
        if (stored === 'light') {
            setIsLight(true);
        }
    }, []);

    useEffect(() => {
        if (isLight) {
            document.documentElement.classList.add('light-mode');
            localStorage.setItem('theme-preference', 'light');
        } else {
            document.documentElement.classList.remove('light-mode');
            localStorage.setItem('theme-preference', 'dark');
        }
    }, [isLight]);

    return (
        <button
            onClick={() => setIsLight(!isLight)}
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 transition-colors border border-slate-700/50"
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
        </button>
    );
}
