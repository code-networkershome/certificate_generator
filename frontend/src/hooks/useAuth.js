import { useState, useEffect } from 'react';
import { authAPI, usersAPI } from '../api';

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('Failed to logout:', err);
        }
        setIsAuthenticated(false);
        setUser(null);
    };

    const fetchUserProfile = async () => {
        try {
            const profile = await usersAPI.getMe();
            setUser(profile);
            return profile;
        } catch (err) {
            // Silence AbortError as it's expected during unmounts/navigation
            if (err.name !== 'AbortError' && !err.message?.includes('aborted')) {
                console.warn('Failed to fetch user profile:', err);
            }
            // Only clear session if it's a real authentication error, not an abort
            if (err.name !== 'AbortError' && !err.message?.includes('aborted')) {
                await clearSession();
            }
            return null;
        }
    };

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                const authenticated = await authAPI.isAuthenticated();
                if (!isMounted) return;

                setIsAuthenticated(authenticated);
                if (authenticated) {
                    const profile = await fetchUserProfile();
                    if (!profile && isMounted) setIsAuthenticated(false);
                }
            } catch (err) {
                if (err.name !== 'AbortError' && !err.message?.includes('aborted')) {
                    console.error('Auth check failed:', err);
                }
                if (isMounted) setIsAuthenticated(false);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        checkAuth();

        const { data: { subscription } } = authAPI.onAuthStateChange(async (event, session) => {
            try {
                if (!isMounted) return;
                const isAuth = !!session;
                setIsAuthenticated(isAuth);
                if (isAuth) {
                    const profile = await fetchUserProfile();
                    if (!profile && isMounted) setIsAuthenticated(false);
                } else {
                    setUser(null);
                }
            } catch (err) {
                if (err.name !== 'AbortError' && !err.message?.includes('aborted')) {
                    console.debug('Auth change error:', err);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    const login = async () => {
        setIsAuthenticated(true);
        const profile = await fetchUserProfile();
        return profile;
    };

    const logout = async () => {
        await clearSession();
    };

    return { isAuthenticated, user, loading, login, logout };
}
