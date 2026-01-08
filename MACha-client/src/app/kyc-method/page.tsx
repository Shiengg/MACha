'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import KYCMethodSelector from '@/components/kyc/KYCMethodSelector';
import Swal from 'sweetalert2';

function KYCMethodContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (!user) {
      setCheckingStatus(true);
      return;
    }

    setCheckingStatus(false);

    if (user.kyc_status === 'verified') {
      Swal.fire({
        icon: 'info',
        title: 'Đã xác thực',
        text: 'Tài khoản của bạn đã được xác thực',
      }).then(() => {
        router.push('/');
      });
    } else if (user.kyc_status === 'pending') {
      Swal.fire({
        icon: 'info',
        title: 'Đang chờ duyệt',
        text: 'KYC của bạn đang được xem xét. Vui lòng chờ thông báo.',
      }).then(() => {
        router.push('/');
      });
    }
  }, [user, router]);

  const handleSelectMethod = (method: 'traditional' | 'vnpt') => {
    if (method === 'vnpt') {
      router.push('/kyc-vnpt');
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra trạng thái KYC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <KYCMethodSelector onSelectMethod={handleSelectMethod} />
    </div>
  );
}

export default function KYCMethodPage() {
  return (
    <ProtectedRoute>
      <KYCMethodContent />
    </ProtectedRoute>
  );
}

