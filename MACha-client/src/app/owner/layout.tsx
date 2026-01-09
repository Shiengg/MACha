import OwnerRoute from '@/components/guards/OwnerRoute';
import { OwnerSidebarProvider } from '@/contexts/OwnerSidebarContext';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OwnerRoute>
      <OwnerSidebarProvider>
        {children}
      </OwnerSidebarProvider>
    </OwnerRoute>
  );
}

