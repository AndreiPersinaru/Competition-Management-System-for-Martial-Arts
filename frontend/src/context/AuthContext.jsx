import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

const isTokenValid = (token) => {
    if (!token) {
        return false;
    }
    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        return decoded.exp > currentTime;
    } catch (error) {
        console.error("Eroare la decodarea token-ului:", error);
        return false;
    }
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const refreshToken = useCallback(async () => {
        const currentRefreshToken = localStorage.getItem("refresh_token");
        if (!currentRefreshToken) {
            logout();
            return false;
        }

        try {
            const response = await axios.post(
                "http://127.0.0.1:8000/api/login/refresh/",
                {
                    refresh: currentRefreshToken,
                },
                { headers: { "Content-Type": "application/json" } }
            );

            const newAccessToken = response.data.access; 
            const newRefreshToken = response.data.refresh;
            if (newRefreshToken && isTokenValid(newRefreshToken)) {
                localStorage.setItem("refresh_token", newRefreshToken);
                
                if (newAccessToken && isTokenValid(newAccessToken)) {
                    localStorage.setItem("access_token", newAccessToken);
                    setIsAuthenticated(true);
                    return true;
                } else {
                    logout();
                    return false;
                }
            } else {
                logout();
                return false;
            }
        } catch (error) {
            logout();
            return false;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const refreshToken = localStorage.getItem("refresh_token");
            const accessToken = localStorage.getItem("access_token");
            
            if (refreshToken && accessToken) {
                await axios.post("http://127.0.0.1:8000/api/logout/", 
                    { refresh_token: refreshToken },
                    { headers: { 'Authorization': `Bearer ${accessToken}` } }
                );
            }
        } catch (error) {
            console.error("Eroare la logout pe server:", error);
        } finally {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            const accessToken = localStorage.getItem("access_token");
            const refreshTokenExists = !!localStorage.getItem("refresh_token");

            if (isTokenValid(accessToken)) {
                setIsAuthenticated(true);
            } else if (refreshTokenExists) {
                await refreshToken();
            } else {
                setIsAuthenticated(false);
            }
            setIsLoading(false);
        };

        initializeAuth();

        const handleStorageChange = () => {
            const currentToken = localStorage.getItem("access_token");
            const isValid = isTokenValid(currentToken);
            if (!isValid && isAuthenticated) {
                logout();
            } else if (isValid && !isAuthenticated) {
                setIsAuthenticated(true);
            } else if (!currentToken && !localStorage.getItem("refresh_token")) {
                 setIsAuthenticated(false);
            }
        };

        window.addEventListener("storage", handleStorageChange);

        return () => window.removeEventListener("storage", handleStorageChange);
    }, [refreshToken]);

    const login = (accessToken, refreshTokenValue) => {
        setIsLoading(true);
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshTokenValue);
        if (isTokenValid(accessToken)) {
            setIsAuthenticated(true);
        } else {
            logout();
        }
        setIsLoading(false);
    };

    const contextValue = {
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAndRefreshToken: async () => {
            const accessToken = localStorage.getItem("access_token");
            if (!isTokenValid(accessToken)) {
                return await refreshToken();
            }
            return true;
        }
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};