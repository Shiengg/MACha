import { jwtDecode } from "jwt-decode";

export const getTokenFromCookie = () => {
    if (typeof document === "undefined") return null;

    const cookie = document.cookie;
    const token = cookie.split("; ").find(row => row.startsWith("jwt="))?.split("=")[1];
    return token || null;
}

export const getUserFromToken = () => {
    const token = getTokenFromCookie();
    if (!token) return null;

    try {
        const decodedToken = jwtDecode(token);

        if (isTokenExpired(decodedToken)) {
            return null;
        }

        return decodedToken;
    } catch (error) {
        console.error("Error decoding token:", error);
        return null;
    }
}

export const isTokenExpired = (token) => {
    try {
        const decoded = typeof token === 'string' ? jwtDecode(token) : token;
        
        if (!decoded || !decoded.exp) return true;
        
        const currentTime = Date.now() / 1000;
        return decoded.exp < currentTime;
    } catch (error) {
        return true;
    }
}

export const clearAuthToken = () => {
    if (typeof document === "undefined") return;

    document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none";
}

export const isAuthenticated = () => {
    const user = getUserFromToken();
    return user !== null;
}

export const hasRole = (roles) => {
    const user = getUserFromToken();
    if (!user) return false;

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
}

export const getCurrentUser = () => {
    return getUserFromToken();
}