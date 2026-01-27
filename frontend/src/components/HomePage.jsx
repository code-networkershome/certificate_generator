import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const HomePage = ({ isAuthenticated }) => {
    const navigate = useNavigate();
    const [templateIndex, setTemplateIndex] = useState(0);

    const previewTemplates = [
        'classic_blue',
        'dark_orange',
        'dark_teal',
        'elegant_gold',
        'gradient_purple',
        'harvard_crimson',
        'midnight_pro',
        'ocean_blue'
    ];

    const baseUrl = 'https://qghvtknkorbsulwyfpxx.supabase.co/storage/v1/object/public/certificates/previews/';

    useEffect(() => {
        const interval = setInterval(() => {
            setTemplateIndex((prev) => (prev + 1) % previewTemplates.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [previewTemplates.length]);

    const features = [
        {
            title: '32+ Premium Templates',
            desc: 'Professionally designed for every occasion - from minimalist to elegant styles.',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
            ),
            color: 'bg-blue-500'
        },
        {
            title: 'Bulk Generation',
            desc: 'Generate hundreds of certificates instantly with CSV or JSON uploads.',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'bg-purple-500'
        },
        {
            title: 'Interactive Editor',
            desc: 'Drag & drop elements and customize styles in real-time before generating.',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
            ),
            color: 'bg-pink-500'
        }
    ];

    return (
        <div className="space-y-24 pb-20">
            {/* Hero Section */}
            <section className="relative pt-16 animate-fade-in-up">
                <div className="text-center space-y-8 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 text-primary-600 dark:text-primary-400 text-sm font-semibold shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                        </span>
                        Professional Certificate Builder
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        Create <span className="text-primary-600 dark:text-primary-400">Beautiful Certificates</span> in Minutes
                    </h1>

                    <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Generate, customize, and distribute professional certificates for your students or employees.
                        Choose from stunning templates and export in multiple formats.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button
                            onClick={() => navigate(isAuthenticated ? '/generate' : '/login')}
                            className="btn-primary !px-10 !py-4 text-lg w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                            Get Started Free
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                        <button
                            onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                            className="btn-secondary !px-10 !py-4 text-lg w-full sm:w-auto"
                        >
                            Learn More
                        </button>
                    </div>
                </div>

                <div className="mt-20 relative px-4">
                    <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl shadow-primary-500/10 border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in-up delay-200">
                        <div className="aspect-[16/9] bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/5 group-hover:opacity-0 transition-opacity"></div>

                            {/* Animated Carousel Container */}
                            <div className="w-[85%] aspect-[1.414/1] relative overflow-hidden rounded-lg shadow-2xl border-4 border-gray-900 dark:border-gray-950 transform group-hover:scale-[1.02] transition-transform duration-500">
                                {previewTemplates.map((slug, idx) => (
                                    <div
                                        key={slug}
                                        className={`absolute inset-0 transition-all duration-1000 transform ${idx === templateIndex
                                            ? 'opacity-100 translate-x-0 scale-100'
                                            : 'opacity-0 translate-x-8 scale-95 pointer-events-none'
                                            }`}
                                    >
                                        <img
                                            src={`${baseUrl}${slug}_preview.png`}
                                            alt="Certificate Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<div class=\"flex items-center justify-center h-full bg-gray-200 dark:bg-gray-800 text-gray-400 italic\">Preview Loading...</div>';
                                            }}
                                        />
                                    </div>
                                ))}

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-gray-900/10 to-transparent"></div>

                                {/* Badge Overlay */}
                                <div className="absolute top-4 right-4 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                    Premium Template
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Orbs */}
                    <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-400/20 blur-[120px] rounded-full pointer-events-none"></div>
                    <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-400/20 blur-[120px] rounded-full pointer-events-none"></div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-3xl font-bold dark:text-white">Why Choose CertGen?</h2>
                    <p className="text-gray-500 dark:text-gray-400">Everything you need to scale your certification process</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="card-premium p-8 group hover:-translate-y-2">
                            <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-gray-200/50 dark:shadow-none transition-transform group-hover:scale-110`}>
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer CTA */}
            <section className="px-4">
                <div className="max-w-5xl mx-auto rounded-[2rem] p-12 text-center relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 shadow-2xl shadow-primary-500/20">
                    <div className="relative z-10 space-y-8 animate-fade-in-up">
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">Ready to automate your certifications?</h2>
                            <p className="text-primary-100 text-lg max-w-2xl mx-auto leading-relaxed opacity-90 font-medium">Join hundreds of forward-thinking organizations providing professional, verifiable certificates at scale.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                            <button onClick={() => navigate('/register')} className="bg-white text-primary-600 hover:bg-primary-50 px-12 py-4 rounded-xl font-bold text-lg shadow-xl shadow-black/10 transition-all hover:-translate-y-1 active:scale-95">
                                Create Free Account
                            </button>
                            <button onClick={() => navigate('/login')} className="bg-white/10 text-white hover:bg-white/20 px-10 py-4 rounded-xl font-bold text-lg backdrop-blur-sm border border-white/20 transition-all">
                                Sign In
                            </button>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 blur-[80px] rounded-full"></div>
                    <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full"></div>

                    {/* Subtle Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                        <svg className="h-full w-full" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs><pattern id="grid-dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.5" fill="white" /></pattern></defs>
                            <rect width="100" height="100" fill="url(#grid-dots)" />
                        </svg>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
