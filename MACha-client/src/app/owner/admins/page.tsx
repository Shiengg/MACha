'use client';

import { useState, useEffect } from 'react';
import OwnerSidebar from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import { ownerService, Admin } from '@/services/owner.service';
import Swal from 'sweetalert2';
import { Plus, Search, Edit, Trash2, UserPlus, Ban, Unlock, Eye, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { getAllUsers, User } from '@/services/admin/user.service';
import { useRouter } from 'next/navigation';

export default function OwnerAdmins() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editForm, setEditForm] = useState({ fullname: '', avatar: '', bio: '' });
  const [banReason, setBanReason] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Admin | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'banned'>('all');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAdmins();
    fetchUsers();
  }, [currentPage]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await ownerService.getAdmins({ page: currentPage, limit: itemsPerPage });
      setAdmins(data.admins);
      setTotalPages(data.pagination.pages);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to fetch admins',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data.filter(u => u.role === 'user'));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateAdmin = async () => {
    if (!selectedUserId) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please select a user',
      });
      return;
    }

    try {
      await ownerService.createAdmin(selectedUserId);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Admin created successfully',
      });
      setShowCreateModal(false);
      setSelectedUserId('');
      fetchAdmins();
      fetchUsers();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to create admin',
      });
    }
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      await ownerService.updateAdmin(selectedAdmin._id, editForm);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Admin updated successfully',
      });
      setShowEditModal(false);
      setSelectedAdmin(null);
      fetchAdmins();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to update admin',
      });
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will remove admin role from this user",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove it!'
    });

    if (result.isConfirmed) {
      try {
        await ownerService.deleteAdmin(adminId);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Admin removed successfully',
        });
        fetchAdmins();
        fetchUsers();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error?.response?.data?.message || 'Failed to delete admin',
        });
      }
    }
  };

  const handleBanAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      await ownerService.banAdmin(selectedAdmin._id, banReason);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Admin banned successfully',
      });
      setShowBanModal(false);
      setSelectedAdmin(null);
      setBanReason('');
      fetchAdmins();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to ban admin',
      });
    }
  };

  const handleUnbanAdmin = async (adminId: string) => {
    try {
      await ownerService.unbanAdmin(adminId);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Admin unbanned successfully',
      });
      fetchAdmins();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to unban admin',
      });
    }
  };

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      fullname: admin.fullname || '',
      avatar: admin.avatar || '',
      bio: '',
    });
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const openBanModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setBanReason('');
    setShowBanModal(true);
    setOpenMenuId(null);
  };

  const viewAdminDetails = (admin: Admin) => {
    router.push(`/owner/admin-activities?adminId=${admin._id}`);
    setOpenMenuId(null);
  };

  const handleSort = (field: keyof Admin) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Admin) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-purple-600" />
      : <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  const sortedAndFilteredAdmins = admins
    .filter((admin) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        admin.username?.toLowerCase().includes(query) ||
        admin.email?.toLowerCase().includes(query) ||
        admin.fullname?.toLowerCase().includes(query)
      );
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'verified' && admin.is_verified) ||
        (statusFilter === 'unverified' && !admin.is_verified) ||
        (statusFilter === 'banned' && admin.is_banned);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleExport = () => {
    const csvContent = [
      ['Username', 'Email', 'Fullname', 'Approvals', 'Rejections', 'Total Actions', 'Status', 'Created At'].join(','),
      ...sortedAndFilteredAdmins.map(admin => [
        admin.username || '',
        admin.email || '',
        admin.fullname || '',
        admin.stats?.approvals || 0,
        admin.stats?.rejections || 0,
        admin.stats?.total || 0,
        admin.is_banned ? 'Banned' : (admin.is_verified ? 'Verified' : 'Unverified'),
        new Date(admin.createdAt).toLocaleDateString('vi-VN')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admins-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar />
      <OwnerHeader />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý Admin</h1>
              <p className="text-gray-600">Quản lý danh sách admin trong hệ thống</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                Thêm Admin
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search admins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('username')}
                        >
                          <div className="flex items-center gap-2">
                            Admin
                            {getSortIcon('username')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center gap-2">
                            Email
                            {getSortIcon('email')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('is_verified')}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            {getSortIcon('is_verified')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center gap-2">
                            Created
                            {getSortIcon('createdAt')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedAndFilteredAdmins.map((admin) => (
                        <tr key={admin._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {admin.avatar ? (
                                <img className="h-10 w-10 rounded-full" src={admin.avatar} alt={admin.username} />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                  {admin.username?.[0]?.toUpperCase() || 'A'}
                                </div>
                              )}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{admin.fullname || admin.username}</div>
                                <div className="text-sm text-gray-500">@{admin.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{admin.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {admin.stats ? (
                                <>
                                  <div>Approvals: {admin.stats.approvals}</div>
                                  <div>Rejections: {admin.stats.rejections}</div>
                                  <div className="text-xs text-gray-500">Total: {admin.stats.total}</div>
                                </>
                              ) : (
                                <span className="text-gray-400">No data</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                admin.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {admin.is_verified ? 'Verified' : 'Unverified'}
                              </span>
                              {admin.is_banned && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  Banned
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(admin.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <div className="relative">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === admin._id ? null : admin._id)}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                                {openMenuId === admin._id && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                    <button
                                      onClick={() => viewAdminDetails(admin)}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => openEditModal(admin)}
                                      className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                                    >
                                      <Edit className="w-4 h-4" />
                                      Edit
                                    </button>
                                    {admin.is_banned ? (
                                      <button
                                        onClick={() => handleUnbanAdmin(admin._id)}
                                        className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                                      >
                                        <Unlock className="w-4 h-4" />
                                        Unban
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => openBanModal(admin)}
                                        className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                                      >
                                        <Ban className="w-4 h-4" />
                                        Ban
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteAdmin(admin._id)}
                                      className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Remove Admin
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-gray-200">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Thêm Admin</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">-- Select User --</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateAdmin}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedUserId('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Admin</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editForm.fullname}
                  onChange={(e) => setEditForm({ ...editForm, fullname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
                <input
                  type="text"
                  value={editForm.avatar}
                  onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateAdmin}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAdmin(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBanModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ban Admin</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ban Reason</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter ban reason..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBanAdmin}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Ban Admin
              </button>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedAdmin(null);
                  setBanReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
