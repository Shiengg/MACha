'use client';

import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { GET_CURRENT_USER_ROUTE, LOGOUT_ROUTE } from "@/constants/api";

interface User {
    id: string;
    email: string;
    username?: string;
    role?: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: () => Promise<void>;
    logout: () => void;
    loading: boolean;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCurrentUser = async () => {
        try {
            const res = await apiClient.get(GET_CURRENT_USER_ROUTE, { withCredentials: true });
            if (res.data?.user) {
                setUser(res.data.user as User);
            }
        } catch (error) {
            console.error("Failed to fetch user:", error);
            setUser(null);
        }
    };

    useEffect(() => {
        fetchCurrentUser().finally(() => setLoading(false));
    }, []);

    const login = async () => {
        await fetchCurrentUser();
    }

    const logout = () => {
        apiClient.post(LOGOUT_ROUTE, { withCredentials: true });
        setUser(null);
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