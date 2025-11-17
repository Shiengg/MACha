import axios from "axios";

const HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
                if (process.env.NODE_ENV !== "production") {
                    console.warn("Warning: Unauthorized access!");
                }
            }
        }
        return Promise.reject(error);
    }
);


export default apiClient;