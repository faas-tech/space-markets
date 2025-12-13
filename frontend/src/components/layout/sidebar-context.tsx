'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage immediately using lazy initialization
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebarCollapsed', String(collapsed));
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [collapsed]);

  const toggle = () => {
    setCollapsed(prev => {
      const newValue = !prev;
      // Immediately save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sidebarCollapsed', String(newValue));
        } catch (e) {
          // Ignore localStorage errors
        }
      }
      return newValue;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

