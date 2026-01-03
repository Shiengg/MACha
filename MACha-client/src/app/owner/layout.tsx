import OwnerRoute from '@/components/guards/OwnerRoute';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OwnerRoute>{children}</OwnerRoute>;
}

