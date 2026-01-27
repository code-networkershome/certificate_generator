import { useState, useEffect, useRef } from 'react';
import { authAPI, usersAPI } from '../api';

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const pendingFetch = useRef(null);

    const clearSession = async (reason = 'Manual logout') => {
        console.log(`CERTGEN_AUTH: Clearing session. Reason: ${reason}`);
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('CERTGEN_AUTH: Failed to logout:', err);
        }
        setIsAuthenticated(false);
        setUser(null);
    };

    const fetchUserProfile = async (retryCount = 0) => {
        // Prevent overlapping fetches
        if (pendingFetch.current && retryCount === 0) {
            console.log('CERTGEN_AUTH: Reusing existing profile fetch');
            return pendingFetch.current;
        }

        const fetchAction = async () => {
            try {
                console.log(`CERTGEN_AUTH: Fetching profile (attempt ${retryCount + 1})`);
                const profile = await usersAPI.getMe();
                console.log('CERTGEN_AUTH: Profile fetch success');
                setUser(profile);
                return profile;
            } catch (err) {
                const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');

                if (isAbort) {
                    console.log('CERTGEN_AUTH: Profile fetch aborted');
                    return null;
                }

                console.warn(`CERTGEN_AUTH: Profile fetch failed (attempt ${retryCount + 1}):`, err.message, 'Status:', err.status);

                // Definitive auth failures (401/403)
                const isAuthFailure = err.status === 401 || err.status === 403 ||
                    err.message?.toLowerCase().includes('jwt') ||
                    err.message?.toLowerCase().includes('invalid token') ||
                    err.message?.toLowerCase().includes('authorized');

                if (isAuthFailure) {
                    // One-time retry for 401 to account for token refresh timing
                    if (retryCount === 0 && err.status === 401) {
                        console.log('CERTGEN_AUTH: 401 detected, retrying profile fetch once...');
                        // Brief delay for token sync
                        await new Promise(r => setTimeout(r, 800));
                        return fetchUserProfile(1);
                    }

                    console.error('CERTGEN_AUTH: Definitive auth failure, clearing session');
                    await clearSession(`Auth Failure: ${err.message}`);
                }
                return null;
            } finally {
                if (retryCount === 0) pendingFetch.current = null;
            }
        };

        if (retryCount === 0) {
            pendingFetch.current = fetchAction();
        }
        return retryCount === 0 ? pendingFetch.current : fetchAction();
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
