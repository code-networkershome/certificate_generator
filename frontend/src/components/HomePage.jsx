import { useNavigate } from 'react-router-dom';

/**
 * HomePage - Beautiful landing page for CertGen
 */
export default function HomePage({ isAuthenticated }) {
    const navigate = useNavigate();

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg">
                    <div className="hero-gradient"></div>
                    <div className="hero-pattern"></div>
                </div>

                <div className="container hero-content">
                    <div className="hero-badge">
                        <span className="badge-icon">✨</span>
                        <span>Professional Certificate Generator</span>
                    </div>

                    <h1 className="hero-title">
                        Create <span className="text-gradient">Beautiful Certificates</span>
                        <br />in Minutes
                    </h1>

                    <p className="hero-subtitle">
                        Generate professional certificates for courses, achievements, and events.
                        Choose from 32+ stunning templates, customize every detail, and download in PDF or Image formats.
                    </p>

                    <div className="hero-actions">
                        <button
                            className="btn btn-primary btn-xl"
                            onClick={() => navigate(isAuthenticated ? '/generate' : '/login')}
                        >
                            {isAuthenticated ? 'Start Creating' : 'Get Started Free'}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            className="btn btn-outline btn-xl"
                            onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                        >
                            Learn More
                        </button>
                    </div>

                    <div className="hero-stats">
                        <div className="stat">
                            <span className="stat-number">32+</span>
                            <span className="stat-label">Templates</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat">
                            <span className="stat-number">3</span>
                            <span className="stat-label">Formats</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat">
                            <span className="stat-number">∞</span>
                            <span className="stat-label">Possibilities</span>
                        </div>
                    </div>
                </div>

                {/* Floating Certificate Preview */}
                <div className="hero-preview">
                    <div className="preview-card">
                        <div className="preview-header">
                            <div className="preview-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                        <div className="preview-content">
                            <div className="mini-cert">
                                <div className="mini-cert-border"></div>
                                <div className="mini-cert-header">Certificate of Achievement</div>
                                <div className="mini-cert-name">John Doe</div>
                                <div className="mini-cert-course">AWS Cloud Practitioner</div>
                                <div className="mini-cert-footer">
                                    <div className="mini-sig"></div>
                                    <div className="mini-date">January 2026</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Features</span>
                        <h2 className="section-title">Everything You Need</h2>
                        <p className="section-subtitle">
                            Powerful tools to create, customize, and distribute professional certificates
                        </p>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M3 9h18" />
                                    <path d="M9 21V9" />
                                </svg>
                            </div>
                            <h3>32+ Templates</h3>
                            <p>Professional designs for every occasion - from modern minimalist to elegant classic styles</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                            </div>
                            <h3>Live Editor</h3>
                            <p>Drag, drop, and customize every element. See changes instantly in real-time preview</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #14b8a6, #22c55e)' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <h3>Bulk Generation</h3>
                            <p>Generate hundreds of certificates at once. Upload CSV or paste JSON data</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </div>
                            <h3>Multiple Formats</h3>
                            <p>Download as PDF for printing or PNG/JPG for digital sharing</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                            <h3>Custom Branding</h3>
                            <p>Add your logo, signature, and organization details for professional branding</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <h3>Secure & Private</h3>
                            <p>Your data is encrypted and stored securely. We never share your certificates</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">How It Works</span>
                        <h2 className="section-title">Three Simple Steps</h2>
                        <p className="section-subtitle">
                            Create professional certificates in under a minute
                        </p>
                    </div>

                    <div className="steps-container">
                        <div className="step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Choose Template</h3>
                                <p>Browse our collection of 32+ professionally designed templates and pick the perfect one</p>
                            </div>
                        </div>

                        <div className="step-connector">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </div>

                        <div className="step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Enter Details</h3>
                                <p>Fill in recipient name, course details, date, and customize with your logo and signature</p>
                            </div>
                        </div>

                        <div className="step-connector">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </div>

                        <div className="step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Download</h3>
                                <p>Preview, make final adjustments, and download your certificate in PDF, PNG, or JPG</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card">
                        <div className="cta-content">
                            <h2>Ready to Create Amazing Certificates?</h2>
                            <p>Join thousands of educators, trainers, and organizations using CertGen</p>
                            <button
                                className="btn btn-primary btn-xl"
                                onClick={() => navigate(isAuthenticated ? '/generate' : '/login')}
                            >
                                {isAuthenticated ? 'Create Certificate' : 'Get Started Free'}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                        <div className="cta-decoration">
                            <div className="cta-circle cta-circle-1"></div>
                            <div className="cta-circle cta-circle-2"></div>
                            <div className="cta-circle cta-circle-3"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <div className="logo">
                                <div className="logo-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <path d="M9 15l2 2 4-4" />
                                    </svg>
                                </div>
                                <span>CertGen</span>
                            </div>
                            <p>Professional certificate generator for modern teams</p>
                        </div>
                        <div className="footer-links">
                            <a href="/generate">Generate</a>
                            <a href="/bulk">Bulk</a>
                            <a href="/login">Login</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>© 2026 CertGen by NetworkersHome. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
