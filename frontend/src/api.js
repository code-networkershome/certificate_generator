const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import { authService } from './supabase';

// Token management - now using Supabase
const getToken = async () => {
    try {
        return await authService.getAccessToken();
    } catch {
        return null;
    }
};

// Legacy token functions for compatibility (now async wrapper)
const setToken = () => { }; // Supabase handles token storage
const removeToken = () => { }; // Supabase handles token removal

// API request helper - now async to get Supabase token
async function request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = await getToken();

    if (!token && endpoint !== '/auth/status') {
        console.warn(`CERTGEN_API: Requesting ${endpoint} without token`);
    }

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            console.error(`CERTGEN_API: Response failed for ${endpoint}. Status: ${response.status}`);
            const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
            const error = new Error(errorData.detail || errorData.error || 'Request failed');
            error.status = response.status;
            throw error;
        }

        return response.json();
    } catch (err) {
        if (err.name !== 'AbortError' && !err.message?.includes('aborted')) {
            console.error(`CERTGEN_API: Fetch error for ${endpoint}:`, err.message);
        }
        throw err;
    }
}

// Auth API - now wraps Supabase auth
export const authAPI = {
    signUp: async (email, password) => {
        return authService.signUp(email, password);
    },

    signIn: async (email, password) => {
        return authService.signIn(email, password);
    },

    // Email OTP
    sendEmailOTP: async (email) => {
        return authService.sendEmailOTP(email);
    },

    verifyEmailOTP: async (email, token) => {
        return authService.verifyEmailOTP(email, token);
    },

    // Phone OTP
    sendPhoneOTP: async (phone) => {
        return authService.sendPhoneOTP(phone);
    },

    verifyPhoneOTP: async (phone, token) => {
        return authService.verifyPhoneOTP(phone, token);
    },

    logout: async () => {
        await authService.signOut();
    },

    isAuthenticated: async () => {
        const session = await authService.getSession();
        return !!session;
    },

    getUser: async () => {
        return authService.getUser();
    },

    resetPassword: async (email) => {
        return authService.resetPassword(email);
    },

    onAuthStateChange: (callback) => {
        return authService.onAuthStateChange(callback);
    },
};

// Templates API
export const templatesAPI = {
    list: async () => {
        return request('/templates/list');
    },
};

// Certificates API
export const certificatesAPI = {
    generate: async (templateId, certificateData, outputFormats = ['pdf']) => {
        // Clean certificate data - remove empty strings for optional fields
        const cleanedData = Object.fromEntries(
            Object.entries(certificateData).filter(([key, value]) => value !== '' && value !== null)
        );

        return request('/certificate/generate', {
            method: 'POST',
            body: JSON.stringify({
                template_id: String(templateId),
                certificate_data: cleanedData,
                output_formats: outputFormats,
            }),
        });
    },

    bulkGenerate: async (templateId, certificates, outputFormats = ['pdf']) => {
        return request('/certificate/bulk-generate', {
            method: 'POST',
            body: JSON.stringify({
                template_id: String(templateId),
                certificates,
                output_formats: outputFormats,
            }),
        });
    },

    bulkGenerateCSV: async (templateId, file, outputFormats = ['pdf']) => {
        const formData = new FormData();
        formData.append('template_id', String(templateId));
        formData.append('output_formats', outputFormats.join(','));
        formData.append('file', file);

        const token = await getToken();
        const response = await fetch(`${API_URL}/certificate/bulk-generate/csv`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || error.error || 'Upload failed');
        }

        return response.json();
    },

    getHistory: async () => {
        return request('/certificate/history');
    },

    preview: async (templateId, certificateData, elementPositions = [], elementStyles = []) => {
        return request('/certificate/preview', {
            method: 'POST',
            body: JSON.stringify({
                template_id: String(templateId),
                certificate_data: certificateData,
                element_positions: elementPositions,
                element_styles: elementStyles
            }),
        });
    },

    finalize: async (templateId, certificateData, elementPositions = [], elementStyles = [], outputFormats = ['pdf']) => {
        return request('/certificate/finalize', {
            method: 'POST',
            body: JSON.stringify({
                template_id: String(templateId),
                certificate_data: certificateData,
                element_positions: elementPositions,
                element_styles: elementStyles,
                output_formats: outputFormats
            }),
        });
    },
};

// Admin API
export const adminAPI = {
    getStats: async () => {
        return request('/admin/stats');
    },
    getCertificates: async (page = 1, limit = 20) => {
        return request(`/admin/certificates?page=${page}&limit=${limit}`);
    },
    getUsers: async (page = 1, limit = 20) => {
        return request(`/admin/users?page=${page}&limit=${limit}`);
    },
    revokeCertificate: async (id, reason) => {
        return request(`/admin/certificates/${id}/revoke`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    },
    toggleAdmin: async (userId) => {
        return request(`/admin/users/${userId}/toggle-admin`, {
            method: 'POST'
        });
    }
};

// Uploads API
export const uploadsAPI = {
    uploadImage: async (file) => {
        const url = `${API_URL}/upload/image`;
        const token = await getToken();

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || 'Upload failed');
        }

        return response.json();
    },
};

// Users API
export const usersAPI = {
    getMe: async () => {
        return request('/users/me');
    },
};

export { getToken, setToken, removeToken, API_URL };
