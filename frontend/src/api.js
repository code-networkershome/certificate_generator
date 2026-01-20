const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token management
const getToken = () => localStorage.getItem('access_token');
const setToken = (token) => localStorage.setItem('access_token', token);
const removeToken = () => localStorage.removeItem('access_token');

// API request helper
async function request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = getToken();

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

// Auth API
export const authAPI = {
    sendOTP: async (otpType, email, phone) => {
        return request('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({
                otp_type: otpType,
                ...(email && { email }),
                ...(phone && { phone }),
            }),
        });
    },

    verifyOTP: async (otpType, email, phone, otpCode) => {
        const response = await request('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({
                otp_type: otpType,
                ...(email && { email }),
                ...(phone && { phone }),
                otp_code: otpCode,
            }),
        });

        if (response.access_token) {
            setToken(response.access_token);
        }

        return response;
    },

    logout: () => {
        removeToken();
    },

    isAuthenticated: () => {
        return !!getToken();
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

        const token = getToken();
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
};

export { getToken, setToken, removeToken };
