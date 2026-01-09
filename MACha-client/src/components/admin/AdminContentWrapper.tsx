'use client';

import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { ReactNode } from 'react';

interface AdminContentWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function AdminContentWrapper({ children, className = '' }: AdminContentWrapperProps) {
  const { isSidebarOpen } = useAdminSidebar();
  
  return (
    <div className={`pt-16 transition-all duration-300 ${
      isSidebarOpen ? 'lg:ml-64 ml-0' : 'ml-0'
    } ${className}`}>
      {children}
    </div>
  );
}
