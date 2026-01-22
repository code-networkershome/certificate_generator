import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { authAPI, templatesAPI, certificatesAPI, uploadsAPI, API_URL } from './api';
import CertificateEditor from './components/CertificateEditor';

// ============================================
// AUTH CONTEXT
// ============================================
function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check initial auth state
        const checkAuth = async () => {
            try {
                const authenticated = await authAPI.isAuthenticated();
                setIsAuthenticated(authenticated);
            } catch {
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();

        // Listen for auth state changes
        const { data: { subscription } } = authAPI.onAuthStateChange((event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => subscription?.unsubscribe();
    }, []);

    const login = () => setIsAuthenticated(true);
    const logout = async () => {
        await authAPI.logout();
        setIsAuthenticated(false);
    };

    return { isAuthenticated, loading, login, logout };
}

// ============================================
// PROTECTED ROUTE
// ============================================
function ProtectedRoute({ children, isAuthenticated }) {
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

// ============================================
// HEADER COMPONENT
// ============================================
function Header({ isAuthenticated, onLogout, onHistoryClick }) {
    return (
        <header className="header">
            <div className="container header-content">
                <a href="/" className="logo">
                    <div className="logo-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M9 15l2 2 4-4" />
                        </svg>
                    </div>
                    <span>CertGen</span>
                </a>

                {isAuthenticated && (
                    <nav className="nav">
                        <a href="/generate" className="nav-link">Generate</a>
                        <a href="/bulk" className="nav-link">Bulk</a>
                        {onHistoryClick && (
                            <button onClick={onHistoryClick} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>History</button>
                        )}
                        <button onClick={onLogout} className="btn btn-outline btn-sm">Logout</button>
                    </nav>
                )}
            </div>
        </header>
    );
}

// ============================================
// LOGIN PAGE
// ============================================
function LoginPage({ onLogin }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (isSignUp) {
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                const result = await authAPI.signUp(email, password);
                if (result.user && !result.session) {
                    setMessage('Please check your email to confirm your account.');
                } else {
                    onLogin();
                    navigate('/generate');
                }
            } else {
                await authAPI.signIn(email, password);
                onLogin();
                navigate('/generate');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card auth-card card-glass">
                <div className="auth-header">
                    <h1 className="auth-title">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
                    <p className="auth-subtitle">
                        {isSignUp ? 'Sign up to start generating certificates' : 'Sign in to continue'}
                    </p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {isSignUp && (
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? <span className="spinner" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div className="text-center mt-lg">
                    <button
                        type="button"
                        className="btn-link"
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// GENERATE PAGE
// ============================================
function GeneratePage() {
    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [inputMode, setInputMode] = useState('form'); // 'form' or 'json'
    const [jsonInput, setJsonInput] = useState(`{
  "student_name": "John Doe",
  "course_name": "AWS Cloud Practitioner",
  "issue_date": "${new Date().toISOString().split('T')[0]}",
  "certificate_id": "",
  "issuing_authority": "NetworkersHome",
  "signature_name": "Director",
  "signature_image_url": "",
  "logo_url": "",
  "certificate_title": "Certificate of Completion",
  "certificate_subtitle": "Professional Development",
  "description_text": "has successfully completed all requirements for",
  "custom_body": "for outstanding performance and dedication"
}`);
    const [jsonError, setJsonError] = useState('');
    const [formData, setFormData] = useState({
        student_name: '',
        course_name: '',
        issue_date: new Date().toISOString().split('T')[0],
        issuing_authority: '',
        signature_name: '',
        signature_image_url: '',
        logo_url: '',
        certificate_title: '',
        certificate_subtitle: '',
        description_text: '',
        custom_body: ''
    });
    const [outputFormats, setOutputFormats] = useState(['pdf']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedTemplateName, setSelectedTemplateName] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [uploading, setUploading] = useState({ logo: false, signature: false });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await templatesAPI.list();
            setTemplates(response.templates);
        } catch (err) {
            // If no templates from DB, use placeholder
            setTemplates([
                { id: 'default', name: 'Professional Blue', description: 'Classic professional certificate' },
                { id: 'modern', name: 'Modern Gradient', description: 'Contemporary design with gradients' },
                { id: 'elegant', name: 'Elegant Gold', description: 'Premium gold-accented design' }
            ]);
        }
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const response = await certificatesAPI.getHistory();
            setHistory(response.certificates || []);
        } catch (err) {
            console.error('Failed to load history:', err);
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormatToggle = (format) => {
        setOutputFormats(prev =>
            prev.includes(format)
                ? prev.filter(f => f !== format)
                : [...prev, format]
        );
    };

    const handleFileUpload = async (e, fieldName, uploadType) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [uploadType]: true }));
        setError('');

        try {
            const result = await uploadsAPI.uploadImage(file);
            // Set the full URL - handle both absolute (Supabase) and relative (local) URLs
            const fullUrl = result.url.startsWith('http') ? result.url : `${API_URL}${result.url}`;
            setFormData(prev => ({ ...prev, [fieldName]: fullUrl }));
        } catch (err) {
            setError(`Failed to upload ${uploadType}: ${err.message}`);
        } finally {
            setUploading(prev => ({ ...prev, [uploadType]: false }));
        }
    };

    const handlePreviewEdit = async (e) => {
        e.preventDefault();
        setError('');
        setJsonError('');

        let dataToSubmit = formData;

        // If in JSON mode, parse the JSON input
        if (inputMode === 'json') {
            try {
                const parsed = JSON.parse(jsonInput);

                // Validate required fields (certificate_id is auto-generated)
                const requiredFields = ['student_name', 'course_name', 'issue_date', 'issuing_authority'];
                const missingFields = requiredFields.filter(field => !parsed[field]);

                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                dataToSubmit = parsed;
                setFormData(parsed);
            } catch (parseError) {
                setJsonError(parseError.message);
                return;
            }
        }

        // Find template name
        const template = templates.find(t => t.id === selectedTemplate);
        setSelectedTemplateName(template?.name || 'Certificate');

        // Open editor
        setShowEditor(true);
    };

    const handleEditorDataChange = (newData) => {
        setFormData(newData);
    };

    const handleEditorFinalize = async (data, positions, styles) => {
        setLoading(true);
        setError('');

        try {
            const response = await certificatesAPI.finalize(
                selectedTemplate,
                data,
                positions,
                styles,
                outputFormats
            );
            setResult(response);
            setShowEditor(false);
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditorBack = () => {
        setShowEditor(false);
    };

    // Original direct generate (still available via form submit)
    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setJsonError('');

        let dataToSubmit = formData;

        // If in JSON mode, parse the JSON input
        if (inputMode === 'json') {
            try {
                const parsed = JSON.parse(jsonInput);

                // Validate required fields (certificate_id is auto-generated)
                const requiredFields = ['student_name', 'course_name', 'issue_date', 'issuing_authority'];
                const missingFields = requiredFields.filter(field => !parsed[field]);

                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }

                dataToSubmit = parsed;
            } catch (parseError) {
                setJsonError(parseError.message);
                setLoading(false);
                return;
            }
        }

        try {
            const response = await certificatesAPI.generate(
                selectedTemplate,
                dataToSubmit,
                outputFormats
            );
            setResult(response);
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const generateCertificateId = () => {
        const prefix = 'NH';
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
        setFormData(prev => ({ ...prev, certificate_id: `${prefix}-${year}-${random}` }));
    };

    const handleHistoryClick = () => {
        loadHistory();
        setShowHistory(true);
    };

    return (
        <div className="page">
            <Header
                isAuthenticated={true}
                onLogout={async () => { await authAPI.logout(); window.location.href = '/login'; }}
                onHistoryClick={handleHistoryClick}
            />

            <main className="main-content">
                <div className="container">
                    {/* Certificate Editor - Shown when editing */}
                    {showEditor ? (
                        <CertificateEditor
                            templateId={selectedTemplate}
                            templateName={selectedTemplateName}
                            certificateData={formData}
                            onDataChange={handleEditorDataChange}
                            onFinalize={handleEditorFinalize}
                            onBack={handleEditorBack}
                        />
                    ) : (
                        <>
                            {/* Steps Indicator */}
                            <div className="steps">
                                <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                                    <span className="step-number">1</span>
                                    <span className="step-label">Select Template</span>
                                </div>
                                <div className="step-connector" />
                                <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                                    <span className="step-number">2</span>
                                    <span className="step-label">Enter Details</span>
                                </div>
                                <div className="step-connector" />
                                <div className={`step ${step >= 3 ? 'active' : ''}`}>
                                    <span className="step-number">3</span>
                                    <span className="step-label">Download</span>
                                </div>
                            </div>

                            {error && <div className="alert alert-error">{error}</div>}

                            {/* Step 1: Template Selection */}
                            {step === 1 && (
                                <div>
                                    <h2 className="text-center mb-xl">Choose a Template</h2>
                                    <div className="template-section">
                                        <div className="template-grid">
                                            {templates.map(template => (
                                                <div
                                                    key={template.id}
                                                    className={`card template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                                                    onClick={() => setSelectedTemplate(template.id)}
                                                >
                                                    <div className="template-preview">
                                                        {template.thumbnail_url ? (
                                                            <img
                                                                src={template.thumbnail_url.startsWith('http') ? template.thumbnail_url : `${API_URL}${template.thumbnail_url}`}
                                                                alt={template.name}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <span>Preview</span>
                                                        )}
                                                    </div>
                                                    <h3 className="template-name">{template.name}</h3>
                                                    <p className="template-description">{template.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-center mt-xl">
                                        <button
                                            className="btn btn-primary btn-lg"
                                            onClick={() => setStep(2)}
                                            disabled={!selectedTemplate}
                                        >
                                            Next: Enter Details
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Certificate Details */}
                            {step === 2 && (
                                <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                                    <h2 className="mb-md">Certificate Details</h2>

                                    {/* Input Mode Tabs */}
                                    <div className="auth-tabs mb-xl">
                                        <button
                                            type="button"
                                            className={`auth-tab ${inputMode === 'form' ? 'active' : ''}`}
                                            onClick={() => setInputMode('form')}
                                        >
                                            📝 Form
                                        </button>
                                        <button
                                            type="button"
                                            className={`auth-tab ${inputMode === 'json' ? 'active' : ''}`}
                                            onClick={() => setInputMode('json')}
                                        >
                                            { } JSON
                                        </button>
                                    </div>

                                    <form onSubmit={handleGenerate}>
                                        {inputMode === 'form' ? (
                                            /* Form Input Mode */
                                            <div className="certificate-form">
                                                <div className="form-group">
                                                    <label className="form-label">Student Name *</label>
                                                    <input
                                                        type="text"
                                                        name="student_name"
                                                        className="form-input"
                                                        placeholder="John Doe"
                                                        value={formData.student_name}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Course Name *</label>
                                                    <input
                                                        type="text"
                                                        name="course_name"
                                                        className="form-input"
                                                        placeholder="AWS Cloud Practitioner"
                                                        value={formData.course_name}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Issue Date *</label>
                                                    <input
                                                        type="date"
                                                        name="issue_date"
                                                        className="form-input"
                                                        value={formData.issue_date}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Certificate ID *</label>
                                                    <div className="flex gap-sm">
                                                        <input
                                                            type="text"
                                                            name="certificate_id"
                                                            className="form-input"
                                                            placeholder="NH-2026-00123"
                                                            value={formData.certificate_id}
                                                            onChange={handleInputChange}
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            onClick={generateCertificateId}
                                                        >
                                                            Generate
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="form-group full-width">
                                                    <label className="form-label">Issuing Authority *</label>
                                                    <input
                                                        type="text"
                                                        name="issuing_authority"
                                                        className="form-input"
                                                        placeholder="NetworkersHome"
                                                        value={formData.issuing_authority}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Certificate Title</label>
                                                    <input
                                                        type="text"
                                                        name="certificate_title"
                                                        className="form-input"
                                                        placeholder="Certificate of Completion"
                                                        value={formData.certificate_title}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Certificate Subtitle</label>
                                                    <input
                                                        type="text"
                                                        name="certificate_subtitle"
                                                        className="form-input"
                                                        placeholder="Professional Development"
                                                        value={formData.certificate_subtitle}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>

                                                <div className="form-group full-width">
                                                    <label className="form-label">Description Text</label>
                                                    <textarea
                                                        name="description_text"
                                                        className="form-input"
                                                        placeholder="has successfully completed all requirements for"
                                                        value={formData.description_text}
                                                        onChange={handleInputChange}
                                                        rows={2}
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Signature Name</label>
                                                    <input
                                                        type="text"
                                                        name="signature_name"
                                                        className="form-input"
                                                        placeholder="Director"
                                                        value={formData.signature_name}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Signature Image</label>
                                                    <div className="upload-group">
                                                        <input
                                                            type="url"
                                                            name="signature_image_url"
                                                            className="form-input"
                                                            placeholder="https://example.com/signature.png"
                                                            value={formData.signature_image_url}
                                                            onChange={handleInputChange}
                                                        />
                                                        <span className="upload-divider">or</span>
                                                        <label className="btn btn-secondary btn-upload">
                                                            {uploading.signature ? '⏳ Uploading...' : '📁 Upload'}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleFileUpload(e, 'signature_image_url', 'signature')}
                                                                style={{ display: 'none' }}
                                                                disabled={uploading.signature}
                                                            />
                                                        </label>
                                                    </div>
                                                    {formData.signature_image_url && (
                                                        <img
                                                            src={formData.signature_image_url}
                                                            alt="Signature preview"
                                                            className="image-preview"
                                                        />
                                                    )}
                                                </div>

                                                <div className="form-group full-width">
                                                    <label className="form-label">Logo Image</label>
                                                    <div className="upload-group">
                                                        <input
                                                            type="url"
                                                            name="logo_url"
                                                            className="form-input"
                                                            placeholder="https://example.com/logo.png"
                                                            value={formData.logo_url}
                                                            onChange={handleInputChange}
                                                        />
                                                        <span className="upload-divider">or</span>
                                                        <label className="btn btn-secondary btn-upload">
                                                            {uploading.logo ? '⏳ Uploading...' : '📁 Upload'}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleFileUpload(e, 'logo_url', 'logo')}
                                                                style={{ display: 'none' }}
                                                                disabled={uploading.logo}
                                                            />
                                                        </label>
                                                    </div>
                                                    {formData.logo_url && (
                                                        <img
                                                            src={formData.logo_url}
                                                            alt="Logo preview"
                                                            className="image-preview"
                                                        />
                                                    )}
                                                </div>

                                                <div className="form-group full-width">
                                                    <label className="form-label">Custom Description (Optional)</label>
                                                    <textarea
                                                        name="custom_body"
                                                        className="form-input"
                                                        placeholder="Add custom text to appear on the certificate (e.g., 'for exceptional leadership and dedication')"
                                                        value={formData.custom_body}
                                                        onChange={handleInputChange}
                                                        rows={2}
                                                        style={{ resize: 'vertical' }}
                                                    />
                                                </div>

                                                <div className="form-group full-width">
                                                    <label className="form-label">Output Formats</label>
                                                    <div className="flex gap-md">
                                                        {['pdf', 'png', 'jpg'].map(format => (
                                                            <label key={format} className="flex items-center gap-sm" style={{ cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={outputFormats.includes(format)}
                                                                    onChange={() => handleFormatToggle(format)}
                                                                />
                                                                {format.toUpperCase()}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* JSON Input Mode */
                                            <div>
                                                <div className="form-group">
                                                    <label className="form-label">Paste JSON Data</label>
                                                    <textarea
                                                        className="form-input"
                                                        style={{
                                                            minHeight: '280px',
                                                            fontFamily: 'monospace',
                                                            fontSize: '13px',
                                                            lineHeight: '1.5'
                                                        }}
                                                        placeholder={`{
  "student_name": "John Doe",
  "course_name": "AWS Cloud Practitioner",
  "issue_date": "2026-01-20",
  "issuing_authority": "NetworkersHome",
  "signature_name": "Director",
  "custom_body": "for outstanding performance"
}`}
                                                        value={jsonInput}
                                                        onChange={(e) => setJsonInput(e.target.value)}
                                                    />
                                                    {jsonError && (
                                                        <p style={{ color: '#ef4444', marginTop: '8px', fontSize: '14px' }}>
                                                            ⚠️ {jsonError}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Output Formats</label>
                                                    <div className="flex gap-md">
                                                        {['pdf', 'png', 'jpg'].map(format => (
                                                            <label key={format} className="flex items-center gap-sm" style={{ cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={outputFormats.includes(format)}
                                                                    onChange={() => handleFormatToggle(format)}
                                                                />
                                                                {format.toUpperCase()}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="alert" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: '#6366f1', marginTop: '16px' }}>
                                                    <strong>💡 Tip:</strong> Paste your JSON with the required fields: student_name, course_name, issue_date, certificate_id, issuing_authority
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between mt-xl">
                                            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                                                Back
                                            </button>
                                            <div className="flex gap-md">
                                                <button type="button" className="btn btn-outline btn-lg" onClick={handlePreviewEdit}>
                                                    🖌️ Preview & Edit
                                                </button>
                                                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                                    {loading ? <span className="spinner" /> : 'Generate Certificate'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Step 3: Download */}
                            {step === 3 && result && (
                                <div className="card text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                    <div className="download-section">
                                        <div className="download-icon">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                        </div>

                                        <h2 className="mb-md">Certificate Generated!</h2>
                                        <p className="text-muted mb-xl">
                                            Certificate ID: <strong>{result.certificate_id}</strong>
                                        </p>

                                        <div className="download-buttons">
                                            {Object.entries(result.download_urls).map(([format, url]) => (
                                                <button
                                                    key={format}
                                                    className="btn btn-primary"
                                                    onClick={async () => {
                                                        try {
                                                            const response = await fetch(url);
                                                            const blob = await response.blob();
                                                            const blobUrl = window.URL.createObjectURL(blob);
                                                            const link = document.createElement('a');
                                                            link.href = blobUrl;
                                                            link.download = `${result.certificate_id}.${format}`;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                            window.URL.revokeObjectURL(blobUrl);
                                                        } catch (err) {
                                                            // Fallback to opening in new tab
                                                            window.open(url, '_blank');
                                                        }
                                                    }}
                                                >
                                                    Download {format.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            className="btn btn-secondary mt-xl"
                                            onClick={() => {
                                                setStep(1);
                                                setResult(null);
                                                setFormData({
                                                    student_name: '',
                                                    course_name: '',
                                                    issue_date: new Date().toISOString().split('T')[0],
                                                    issuing_authority: '',
                                                    signature_name: '',
                                                    signature_image_url: '',
                                                    logo_url: '',
                                                    custom_body: ''
                                                });
                                            }}
                                        >
                                            Generate Another
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* History Modal */}
            {
                showHistory && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', zIndex: 1000,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                        <div className="modal-content" style={{
                            background: '#1e1e2e', borderRadius: '12px', padding: '24px',
                            width: '90%', maxWidth: '800px', maxHeight: '80vh', overflow: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={{ color: '#fff', margin: 0 }}>Certificate History</h2>
                                <button onClick={() => setShowHistory(false)} style={{
                                    background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer'
                                }}>×</button>
                            </div>

                            {historyLoading ? (
                                <p style={{ color: '#888' }}>Loading...</p>
                            ) : history.length === 0 ? (
                                <p style={{ color: '#888' }}>No certificates generated yet.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #333' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#888' }}>ID</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#888' }}>Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#888' }}>Course</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#888' }}>Date</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#888' }}>Download</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(cert => (
                                            <tr key={cert.id} style={{ borderBottom: '1px solid #222' }}>
                                                <td style={{ padding: '12px', color: '#a78bfa' }}>{cert.certificate_id}</td>
                                                <td style={{ padding: '12px', color: '#fff' }}>{cert.student_name}</td>
                                                <td style={{ padding: '12px', color: '#fff' }}>{cert.course_name}</td>
                                                <td style={{ padding: '12px', color: '#888' }}>{cert.issue_date}</td>
                                                <td style={{ padding: '12px' }}>
                                                    {cert.download_urls.pdf && (
                                                        <button
                                                            onClick={async () => {
                                                                const url = cert.download_urls.pdf.startsWith('http')
                                                                    ? cert.download_urls.pdf
                                                                    : `${API_URL}${cert.download_urls.pdf}`;
                                                                try {
                                                                    const response = await fetch(url);
                                                                    const blob = await response.blob();
                                                                    const blobUrl = window.URL.createObjectURL(blob);
                                                                    const link = document.createElement('a');
                                                                    link.href = blobUrl;
                                                                    link.download = `${cert.certificate_id}.pdf`;
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                    window.URL.revokeObjectURL(blobUrl);
                                                                } catch (err) {
                                                                    window.open(url, '_blank');
                                                                }
                                                            }}
                                                            style={{ color: '#60a5fa', marginRight: '10px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>PDF</button>
                                                    )}
                                                    {cert.download_urls.png && (
                                                        <button
                                                            onClick={async () => {
                                                                const url = cert.download_urls.png.startsWith('http')
                                                                    ? cert.download_urls.png
                                                                    : `${API_URL}${cert.download_urls.png}`;
                                                                try {
                                                                    const response = await fetch(url);
                                                                    const blob = await response.blob();
                                                                    const blobUrl = window.URL.createObjectURL(blob);
                                                                    const link = document.createElement('a');
                                                                    link.href = blobUrl;
                                                                    link.download = `${cert.certificate_id}.png`;
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                    window.URL.revokeObjectURL(blobUrl);
                                                                } catch (err) {
                                                                    window.open(url, '_blank');
                                                                }
                                                            }}
                                                            style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>PNG</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// ============================================
// BULK GENERATE PAGE
// ============================================
function BulkGeneratePage() {
    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [inputMode, setInputMode] = useState('json'); // 'json' or 'csv'
    const [jsonInput, setJsonInput] = useState(`[
  {
    "student_name": "John Doe"
  },
  {
    "student_name": "Jane Smith"
  },
  {
    "student_name": "Bob Johnson"
  }
]`);
    const [csvFile, setCsvFile] = useState(null);
    const [commonFields, setCommonFields] = useState({
        course_name: 'AWS Cloud Practitioner',
        issue_date: new Date().toISOString().split('T')[0],
        issuing_authority: 'NetworkersHome',
        signature_name: 'Director',
        signature_image_url: '',
        logo_url: '',
        certificate_title: '',
        certificate_subtitle: '',
        description_text: ''
    });
    const [outputFormats, setOutputFormats] = useState(['pdf']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await templatesAPI.list();
            setTemplates(response.templates);
        } catch (err) {
            setTemplates([]);
        }
    };

    const handleCommonFieldChange = (e) => {
        const { name, value } = e.target;
        setCommonFields(prev => ({ ...prev, [name]: value }));
    };

    const handleFormatToggle = (format) => {
        setOutputFormats(prev =>
            prev.includes(format)
                ? prev.filter(f => f !== format)
                : [...prev, format]
        );
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let candidates = [];

            if (inputMode === 'json') {
                try {
                    candidates = JSON.parse(jsonInput);
                    if (!Array.isArray(candidates)) {
                        throw new Error('JSON must be an array of candidates');
                    }
                } catch (parseError) {
                    setError('Invalid JSON: ' + parseError.message);
                    setLoading(false);
                    return;
                }
            } else if (inputMode === 'csv' && csvFile) {
                // Use CSV API
                const response = await certificatesAPI.bulkGenerateCSV(
                    selectedTemplate,
                    csvFile,
                    outputFormats
                );
                setResult(response);
                setStep(3);
                setLoading(false);
                return;
            }

            // Merge common fields with each candidate
            const certificates = candidates.map(candidate => ({
                ...commonFields,
                ...candidate,
                // Ensure required fields
                student_name: candidate.student_name,
                course_name: candidate.course_name || commonFields.course_name,
                issue_date: candidate.issue_date || commonFields.issue_date,
                issuing_authority: candidate.issuing_authority || commonFields.issuing_authority,
            }));

            const response = await certificatesAPI.bulkGenerate(
                selectedTemplate,
                certificates,
                outputFormats
            );
            setResult(response);
            setStep(3);
        } catch (err) {
            setError(err.message || 'Bulk generation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <Header isAuthenticated={true} onLogout={async () => { await authAPI.logout(); window.location.href = '/login'; }} />

            <main className="main-content">
                <div className="container">
                    <h1 className="text-center mb-xl">Bulk Certificate Generation</h1>

                    {/* Steps Indicator */}
                    <div className="steps">
                        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                            <span className="step-number">1</span>
                            <span className="step-label">Template</span>
                        </div>
                        <div className="step-connector" />
                        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                            <span className="step-number">2</span>
                            <span className="step-label">Candidates</span>
                        </div>
                        <div className="step-connector" />
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>
                            <span className="step-number">3</span>
                            <span className="step-label">Results</span>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-error mb-lg">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* Step 1: Template Selection */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-center mb-xl">Choose a Template</h2>
                            <div className="template-section">
                                <div className="template-grid">
                                    {templates.map(template => (
                                        <div
                                            key={template.id}
                                            className={`card template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedTemplate(template.id)}
                                        >
                                            <div className="template-preview">
                                                {template.thumbnail_url ? (
                                                    <img
                                                        src={template.thumbnail_url.startsWith('http') ? template.thumbnail_url : `${API_URL}${template.thumbnail_url}`}
                                                        alt={template.name}
                                                    />
                                                ) : (
                                                    <span>Preview</span>
                                                )}
                                            </div>
                                            <h3 className="template-name">{template.name}</h3>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text-center mt-xl">
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={() => setStep(2)}
                                    disabled={!selectedTemplate}
                                >
                                    Next: Add Candidates
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Candidates Input */}
                    {step === 2 && (
                        <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                            <h2 className="mb-md">Add Candidates & Settings</h2>

                            {/* Common Fields */}
                            <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>Common Fields (Applied to All)</h3>
                                <div className="certificate-form">
                                    <div className="form-group">
                                        <label className="form-label">Course Name *</label>
                                        <input
                                            type="text"
                                            name="course_name"
                                            className="form-input"
                                            value={commonFields.course_name}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Issue Date *</label>
                                        <input
                                            type="date"
                                            name="issue_date"
                                            className="form-input"
                                            value={commonFields.issue_date}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Issuing Authority *</label>
                                        <input
                                            type="text"
                                            name="issuing_authority"
                                            className="form-input"
                                            value={commonFields.issuing_authority}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Signature Name</label>
                                        <input
                                            type="text"
                                            name="signature_name"
                                            className="form-input"
                                            value={commonFields.signature_name}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Signature Image URL</label>
                                        <input
                                            type="url"
                                            name="signature_image_url"
                                            className="form-input"
                                            placeholder="https://example.com/signature.png"
                                            value={commonFields.signature_image_url}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Logo URL</label>
                                        <input
                                            type="url"
                                            name="logo_url"
                                            className="form-input"
                                            placeholder="https://example.com/logo.png"
                                            value={commonFields.logo_url}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Certificate Title</label>
                                        <input
                                            type="text"
                                            name="certificate_title"
                                            className="form-input"
                                            placeholder="Certificate of Completion"
                                            value={commonFields.certificate_title}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Certificate Subtitle</label>
                                        <input
                                            type="text"
                                            name="certificate_subtitle"
                                            className="form-input"
                                            placeholder="Professional Development"
                                            value={commonFields.certificate_subtitle}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label">Description Text</label>
                                        <input
                                            type="text"
                                            name="description_text"
                                            className="form-input"
                                            placeholder="has successfully completed all requirements for"
                                            value={commonFields.description_text}
                                            onChange={handleCommonFieldChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Input Mode Tabs */}
                            <div className="flex gap-md mb-lg">
                                <button
                                    className={`btn ${inputMode === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setInputMode('json')}
                                >
                                    JSON Array
                                </button>
                                <button
                                    className={`btn ${inputMode === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setInputMode('csv')}
                                >
                                    CSV Upload
                                </button>
                            </div>

                            {inputMode === 'json' ? (
                                <div className="form-group">
                                    <label className="form-label">Paste JSON Array of Candidates</label>
                                    <textarea
                                        className="form-input"
                                        style={{ minHeight: '200px', fontFamily: 'monospace' }}
                                        value={jsonInput}
                                        onChange={(e) => setJsonInput(e.target.value)}
                                        placeholder='[{"student_name": "John Doe"}, {"student_name": "Jane Smith"}]'
                                    />
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                                        Each object needs at least "student_name". Other fields will use common settings above.
                                    </p>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label className="form-label">Upload CSV File</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="form-input"
                                        onChange={(e) => setCsvFile(e.target.files[0])}
                                    />
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                                        CSV should have headers: student_name, course_name, issue_date, etc.
                                    </p>
                                </div>
                            )}

                            {/* Output Formats */}
                            <div className="form-group">
                                <label className="form-label">Output Formats</label>
                                <div className="flex gap-md">
                                    {['pdf', 'png', 'jpg'].map(format => (
                                        <label key={format} className="flex items-center gap-sm" style={{ cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={outputFormats.includes(format)}
                                                onChange={() => handleFormatToggle(format)}
                                            />
                                            {format.toUpperCase()}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-md justify-between mt-xl">
                                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                                    ← Back
                                </button>
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleGenerate}
                                    disabled={loading || (inputMode === 'csv' && !csvFile)}
                                >
                                    {loading ? 'Generating...' : 'Generate All Certificates'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Results */}
                    {step === 3 && result && (
                        <div className="card text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="download-section">
                                <div className="download-icon">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                </div>

                                <h2 className="mb-md">Bulk Generation Complete!</h2>
                                <p className="text-muted mb-lg">
                                    Generated: <strong>{result.successful}</strong> / {result.total} certificates
                                    {result.failed > 0 && <span style={{ color: 'var(--color-error)' }}> ({result.failed} failed)</span>}
                                </p>

                                {result.zip_download_url && (
                                    <a
                                        href={`${API_URL}${result.zip_download_url}`}
                                        download
                                        className="btn btn-primary btn-lg"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Download All (ZIP)
                                    </a>
                                )}

                                <button
                                    className="btn btn-secondary mt-lg"
                                    onClick={() => {
                                        setStep(1);
                                        setResult(null);
                                    }}
                                >
                                    Generate More
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// ============================================
// APP COMPONENT
// ============================================
function App() {
    const { isAuthenticated, login, logout } = useAuth();

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        isAuthenticated ? (
                            <Navigate to="/generate" replace />
                        ) : (
                            <LoginPage onLogin={login} />
                        )
                    }
                />
                <Route
                    path="/generate"
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <GeneratePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/bulk"
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <BulkGeneratePage />
                        </ProtectedRoute>
                    }
                />
                <Route path="/" element={<Navigate to={isAuthenticated ? '/generate' : '/login'} replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
