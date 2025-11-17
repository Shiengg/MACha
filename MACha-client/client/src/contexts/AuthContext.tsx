'use client';

import React, { createContext, useContext, useState, useEffect } from "react";
import { getTokenFromCookie, getUserFromToken, isAuthenticated, clearAuthToken } from "@/lib/auth";

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
    login: () => void;
    logout: () => void;
    loading: boolean;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        const userData = getUserFromToken();
        if (userData) {
            setUser(userData as User);
        }
        setLoading(false);
    }, []);

    const login = () => {
        const userData = getUserFromToken();
        if (userData) {
            setUser(userData as User);
        }
    }

    const logout = () => {
        clearAuthToken();
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