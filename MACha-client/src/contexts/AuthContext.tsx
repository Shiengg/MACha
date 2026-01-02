'use client';

import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { GET_CURRENT_USER_ROUTE, LOGOUT_ROUTE } from "@/constants/api";
import Swal from 'sweetalert2';

interface User {
    _id?: string;
    email: string;
    username?: string;
    role?: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCurrentUser = async () => {
        try {
            const res = await apiClient.get(GET_CURRENT_USER_ROUTE, { withCredentials: true });
            if (res.data?.user) {
                const rawUser = res.data.user as any;
                const normalizedUser: User = {
                    // Ưu tiên id nếu backend đã map sẵn, fallback sang _id
                    id: rawUser.id || rawUser._id,
                    ...rawUser,
                };
                setUser(normalizedUser);
                return true;
            }
            return false;
        } catch (error: any) {
            if (error?.response?.status === 403 && (error?.response?.data?.message?.toLowerCase().includes('ban') || error?.response?.data?.message?.toLowerCase().includes('khóa'))) {
                // User is banned, clear user and show alert
                setUser(null);
                const banReason = error?.response?.data?.ban_reason || "Tài khoản bị khóa bởi quản trị viên";
                
                // Only show alert if not already on login page to avoid duplicate alerts
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    Swal.fire({
                        title: 'Tài khoản bị khóa!',
                        html: `<div>
                            <p class="mb-2">${error?.response?.data?.message || 'Tài khoản của bạn đã bị khóa (ban).'}</p>
                            <p class="text-sm text-gray-600 mt-2"><strong>Lý do:</strong> ${banReason}</p>
                        </div>`,
                        icon: 'error',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#dc2626'
                    }).then(() => {
                        // Redirect to login page after user closes alert
                        if (typeof window !== 'undefined') {
                            window.location.href = '/login';
                        }
                    });
                }
                return false;
            }
            
            if (error?.response?.status !== 401) {
                console.error("Failed to fetch user:", error);
            }
            setUser(null);
            return false;
        }
    };

    useEffect(() => {
        fetchCurrentUser().finally(() => setLoading(false));
    }, []);

    const login = async () => {
        await fetchCurrentUser();
    }

    const logout = async () => {
        try {
            await apiClient.post(LOGOUT_ROUTE, {}, { withCredentials: true });
            setUser(null);
        } catch (error) {
            console.error("Logout failed:", error);
            // Even if the API call fails, clear the user locally
            setUser(null);
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                login,
                logout,
                loading,
                setUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    )

}

// Custom hook để sử dụng AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
    }
    return context;
}