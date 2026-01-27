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

        // Fail-safe: Ensure loading always closes after 5 seconds even if something hangs
        const timeout = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 5000);

        const checkAuth = async () => {
            try {
                const authenticated = await authAPI.isAuthenticated();
                if (!isMounted) return;

                setIsAuthenticated(authenticated);
                if (authenticated) {
                    const profile = await fetchUserProfile();
                    // If profile fetch fails, we already logout in fetchUserProfile
                    if (!profile && isMounted) setIsAuthenticated(false);
                }
            } catch (err) {
                if (err.name !== 'AbortError' && !err.message?.includes('aborted')) {
                    console.error('Auth check failed:', err);
                }
                if (isMounted) setIsAuthenticated(false);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    clearTimeout(timeout);
                }
            }
        };
        checkAuth();

        const { data: { subscription } } = authAPI.onAuthStateChange(async (event, session) => {
            try {
                if (!isMounted) return;

                // For INITIAL_SESSION, if there's no session, we must close loading
                if (event === 'INITIAL_SESSION' && !session) {
                    setLoading(false);
                    clearTimeout(timeout);
                }

                const isAuth = !!session;
                setIsAuthenticated(isAuth);

                if (isAuth) {
                    const profile = await fetchUserProfile();
                    if (!profile && isMounted) setIsAuthenticated(false);
                    if (isMounted) {
                        setLoading(false);
                        clearTimeout(timeout);
                    }
                } else {
                    setUser(null);
                    if (isMounted) {
                        setLoading(false);
                        clearTimeout(timeout);
                    }
                }
            } catch (err) {
                if (err.name !== 'AbortError' && !err.message?.includes('aborted')) {
                    console.debug('Auth change error:', err);
                }
                if (isMounted) setLoading(false);
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
