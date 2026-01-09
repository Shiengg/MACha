import AdminRoute from '@/components/guards/AdminRoute';
import { AdminSidebarProvider } from '@/contexts/AdminSidebarContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminSidebarProvider>
      <AdminRoute>{children}</AdminRoute>
    </AdminSidebarProvider>
  );
}

