import { useState, useEffect, useRef } from 'react';
import { authAPI, usersAPI } from '../api';

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const pendingFetch = useRef(null);
    const lastFetchTime = useRef(0);

    const clearSession = async (reason = 'Manual logout') => {
        console.log(`CERTGEN_AUTH: Clearing session. Reason: ${reason}`);
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('CERTGEN_AUTH: Failed to logout:', err);
        }
        setIsAuthenticated(false);
        setUser(null);
        lastFetchTime.current = 0; // Clear cache on logout
    };

    const fetchUserProfile = async (retryCount = 0) => {
        // Prevent overlapping fetches - deduplication layer 1
        if (pendingFetch.current && retryCount === 0) {
            console.log('CERTGEN_AUTH: Reusing existing profile fetch');
            return pendingFetch.current;
        }

        // prevent redundant fetches within a short window - deduplication layer 2
        const now = Date.now();
        if (now - lastFetchTime.current < 2000 && user && retryCount === 0) {
            console.log('CERTGEN_AUTH: Using recently cached profile');
            return user;
        }

        const fetchAction = async () => {
            try {
                console.log(`CERTGEN_AUTH: Fetching profile (attempt ${retryCount + 1})`);
                const profile = await usersAPI.getMe();
                console.log('CERTGEN_AUTH: Profile fetch success');
                setUser(profile);
                lastFetchTime.current = Date.now();
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
        const timeout = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 5000);

        const initializeAuth = async () => {
            try {
                // 1. Get initial session
                const session = await authAPI.getUser().catch(() => null);
                if (!isMounted) return;

                if (session) {
                    setIsAuthenticated(true);
                    await fetchUserProfile();
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch (err) {
                console.error('Auth initialization failed:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    clearTimeout(timeout);
                }
            }
        };

        // 2. Synchronous setup for state listener
        const { data: { subscription } } = authAPI.onAuthStateChange(async (event, session) => {
            console.log(`CERTGEN_AUTH: Auth event: ${event}`);

            if (!isMounted) return;

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && session)) {
                setIsAuthenticated(true);
                await fetchUserProfile();
            } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
                setIsAuthenticated(false);
                setUser(null);
            }

            if (isMounted) setLoading(false);
        });

        // 3. Kick off manual check ONLY if subscription didn't already handle it
        initializeAuth();

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
