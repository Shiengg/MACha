'use client';

import { useOwnerSidebar } from '@/contexts/OwnerSidebarContext';
import { ReactNode } from 'react';

interface OwnerContentWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function OwnerContentWrapper({ children, className = '' }: OwnerContentWrapperProps) {
  const { isSidebarOpen } = useOwnerSidebar();
  
  return (
    <div className={`pt-16 transition-all duration-300 ${
      isSidebarOpen ? 'lg:ml-64 ml-0' : 'ml-0'
    } ${className}`}>
      {children}
    </div>
  );
}

