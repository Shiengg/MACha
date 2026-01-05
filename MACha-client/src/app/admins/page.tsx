'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import { getPublicAdmins, type PublicAdmin } from '@/services/user.service';
import { Shield, CheckCircle2, User } from 'lucide-react';
import Image from 'next/image';

function AdminsContent() {
  const router = useRouter();
  const [admins, setAdmins] = useState<PublicAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  useEffect(() => {
    fetchAdmins();
  }, [currentPage]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const result = await getPublicAdmins(currentPage, limit);
      setAdmins(result.admins);
      setTotalPages(result.pagination.pages);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminClick = (adminId: string) => {
    router.push(`/profile/${adminId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-[300px] bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
              Đội ngũ Admin
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow">
              Gặp gỡ đội ngũ quản trị viên đang làm việc để duy trì một cộng đồng lành mạnh và minh bạch
            </p>
          </div>
        </div>
      </div>

      {/* Admins Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Chưa có admin nào
            </h3>
            <p className="text-gray-600">
              Hiện tại chưa có admin nào trong hệ thống
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-gray-600">
              Tổng cộng <span className="font-bold text-gray-800">{admins.length}</span> admin
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {admins.map((admin) => (
                <div
                  key={admin._id}
                  onClick={() => handleAdminClick(admin._id)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-200 group"
                >
                  <div className="p-6">
                    {/* Avatar */}
                    <div className="flex justify-center mb-4">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 group-hover:scale-110 transition-transform">
                        {admin.avatar ? (
                          <Image
                            src={admin.avatar}
                            alt={admin.username}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                            {(admin.fullname || admin.username)?.charAt(0).toUpperCase() || 'A'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name & Username */}
                    <div className="text-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {admin.fullname || admin.username}
                      </h3>
                      <p className="text-sm text-gray-500">@{admin.username}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        <span>Admin</span>
                      </div>
                      {admin.is_verified && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Đã xác minh</span>
                        </div>
                      )}
                    </div>

                    {/* View Profile Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdminClick(admin._id);
                      }}
                      className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span>Xem hồ sơ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <div className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminsPage() {
  return (
    <ProtectedRoute>
      <AdminsContent />
    </ProtectedRoute>
  );
}

