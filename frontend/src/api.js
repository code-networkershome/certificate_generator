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

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || error.error || 'Request failed');
    }

    return response.json();
}

// Auth API - now wraps Supabase auth
export const authAPI = {
    signUp: async (email, password) => {
        return authService.signUp(email, password);
    },

    signIn: async (email, password) => {
        return authService.signIn(email, password);
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
                template_id: templateId,
                certificates,
                output_formats: outputFormats,
            }),
        });
    },

    bulkGenerateCSV: async (templateId, file, outputFormats = ['pdf']) => {
        const formData = new FormData();
        formData.append('template_id', templateId);
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
            throw new Error(error.detail || 'Upload failed');
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
                template_id: templateId,
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
                template_id: templateId,
                certificate_data: certificateData,
                element_positions: elementPositions,
                element_styles: elementStyles,
                output_formats: outputFormats
            }),
        });
    },
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

export { getToken, setToken, removeToken, API_URL };
