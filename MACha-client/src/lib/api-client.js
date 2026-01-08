import axios from "axios";

// Normalize API URL to avoid double host or missing protocol issues
const normalizeApiUrl = (url) => {
    const fallback = "http://localhost:5000";
    if (!url) return fallback;

    // Remove trailing slash
    let normalized = url.replace(/\/$/, "");

    // Add protocol if missing
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
        normalized = normalized.includes("localhost")
            ? `http://${normalized}`
            : `https://${normalized}`;
    }

    return normalized;
};

const HOST = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

const apiClient = axios.create({
    baseURL: HOST,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    const cookie = document.cookie;

    const token = cookie.split("; ").find(row => row.startsWith("jwt="))?.split("=")[1];

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            if (error.response.status === 401) {
                // Nếu nhận 401, xóa cookie và redirect về login (nếu không phải đang ở trang auth)
                if (typeof window !== 'undefined') {
                    const currentPath = window.location.pathname;
                    const authPages = ['/login', '/register', '/forgot-password'];
                    
                    if (!authPages.includes(currentPath)) {
                        // Xóa cookie JWT
                        document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                        
                        // Redirect về login với returnUrl
                        const returnUrl = encodeURIComponent(currentPath);
                        window.location.href = `/login?returnUrl=${returnUrl}`;
                    }
                }
                
                if (process.env.NODE_ENV !== "production") {
                    console.warn("Warning: Unauthorized access!");
                }
            }
        }
        return Promise.reject(error);
    }
);


export default apiClient;