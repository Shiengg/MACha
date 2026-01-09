'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminSidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export const useAdminSidebar = () => {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error('useAdminSidebar must be used within AdminSidebarProvider');
  }
  return context;
};

interface AdminSidebarProviderProps {
  children: ReactNode;
}

export const AdminSidebarProvider: React.FC<AdminSidebarProviderProps> = ({ children }) => {
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
    <AdminSidebarContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        closeSidebar,
        openSidebar,
      }}
    >
      {children}
    </AdminSidebarContext.Provider>
  );
};
