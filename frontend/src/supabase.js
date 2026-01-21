import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Auth will not work.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

// Auth helper functions
export const authService = {
    // Sign up with email and password
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    // Sign in with email and password
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Get current session
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    // Get current user
    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    // Get access token for API calls
    async getAccessToken() {
        const session = await this.getSession();
        return session?.access_token || null;
    },

    // Listen to auth state changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    },

    // Reset password
    async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }
};

export default supabase;
