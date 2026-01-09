'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OwnerSidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

const OwnerSidebarContext = createContext<OwnerSidebarContextType | undefined>(undefined);

export const useOwnerSidebar = () => {
  const context = useContext(OwnerSidebarContext);
  if (!context) {
    throw new Error('useOwnerSidebar must be used within OwnerSidebarProvider');
  }
  return context;
};

interface OwnerSidebarProviderProps {
  children: ReactNode;
}

export const OwnerSidebarProvider: React.FC<OwnerSidebarProviderProps> = ({ children }) => {
  // Default to closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return true;
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // On desktop, keep sidebar open if it was open
        if (!isSidebarOpen) {
          setIsSidebarOpen(true);
        }
      } else {
        // On mobile, close sidebar
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  return (
    <OwnerSidebarContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        closeSidebar,
        openSidebar,
      }}
    >
      {children}
    </OwnerSidebarContext.Provider>
  );
};

