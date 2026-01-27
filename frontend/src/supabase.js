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

    // ============================================
    // EMAIL OTP AUTHENTICATION
    // ============================================

    // Send OTP to email (magic link or code)
    async sendEmailOTP(email) {
        const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,  // Create user if doesn't exist
            }
        });
        if (error) throw error;
        return data;
    },

    // Verify email OTP code
    async verifyEmailOTP(email, token) {
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });
        if (error) throw error;
        return data;
    },

    // ============================================
    // PHONE OTP AUTHENTICATION
    // ============================================

    // Send OTP to phone number
    async sendPhoneOTP(phone) {
        const { data, error } = await supabase.auth.signInWithOtp({
            phone,
            options: {
                shouldCreateUser: true,  // Create user if doesn't exist
            }
        });
        if (error) throw error;
        return data;
    },

    // Verify phone OTP code
    async verifyPhoneOTP(phone, token) {
        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'sms'
        });
        if (error) throw error;
        return data;
    },

    // Sign out - always succeeds locally even if server session expired
    async signOut() {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        // Ignore errors - we want to clear local state regardless
        if (error) {
            console.warn('Signout warning:', error.message);
        }
    },

    // Get current session
    async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            // Silence aborted requests as they are expected during unmount/reload
            if (error.name !== 'AbortError' && !error.message?.includes('aborted')) {
                console.error('Supabase getSession error:', error);
            }
            return null;
        }
    },

    // Get current user
    async getUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            if (error.name !== 'AbortError' && !error.message?.includes('aborted')) {
                console.error('Supabase getUser error:', error);
            }
            return null;
        }
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

