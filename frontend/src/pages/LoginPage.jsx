import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';

const LoginPage = ({ onLogin }) => {
    const [authMode, setAuthMode] = useState('password'); // 'password' | 'email-otp'
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const navigate = useNavigate();

    const handlePasswordAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (isSignUp) {
                if (password !== confirmPassword) throw new Error('Passwords do not match');
                if (password.length < 6) throw new Error('Password must be at least 6 characters');
                const result = await authAPI.signUp(email, password);
                if (result.user && !result.session) {
                    setMessage('Check your email to confirm your account.');
                } else {
                    const profile = await onLogin();
                    if (profile) {
                        navigate(profile?.is_admin ? '/admin' : '/generate');
                    } else {
                        throw new Error('Could not retrieve user profile. Please try again.');
                    }
                }
            } else {
                await authAPI.signIn(email, password);
                const profile = await onLogin();
                if (profile) {
                    navigate(profile?.is_admin ? '/admin' : '/generate');
                } else {
                    throw new Error('Could not retrieve user profile. Please try again.');
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authAPI.sendEmailOTP(email);
            setOtpSent(true);
            setMessage('OTP sent to your email.');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authAPI.verifyEmailOTP(email, otpCode);
            const profile = await onLogin();
            if (profile) {
                navigate(profile?.is_admin ? '/admin' : '/generate');
            } else {
                throw new Error('Could not retrieve user profile. Please try again.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                        {isSignUp ? 'Create an account' : 'Welcome back'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {isSignUp ? 'Join CertGen and start generating certificates' : 'Sign in to access your dashboard'}
                    </p>
                </div>

                <div className="card-premium p-8">
                    {/* Tabs */}
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-8">
                        <button
                            onClick={() => { setAuthMode('password'); setOtpSent(false); }}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${authMode === 'password' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Password
                        </button>
                        {!isSignUp && (
                            <button
                                onClick={() => setAuthMode('email-otp')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${authMode === 'email-otp' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                OTP
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-3 text-red-600 dark:text-red-400 text-sm">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl flex gap-3 text-green-600 dark:text-green-400 text-sm">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {message}
                        </div>
                    )}

                    {authMode === 'password' ? (
                        <form onSubmit={handlePasswordAuth} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 pl-1">Email Address</label>
                                <input
                                    type="email"
                                    className="input-premium"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 pl-1">Password</label>
                                <input
                                    type="password"
                                    className="input-premium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete={isSignUp ? "new-password" : "current-password"}
                                    required
                                />
                            </div>
                            {isSignUp && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 pl-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="input-premium"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            )}
                            <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex justify-center items-center">
                                {loading ? <div className="spinner !w-5 !h-5" /> : (isSignUp ? 'Create Account' : 'Sign In')}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 pl-1">Email Address</label>
                                <input
                                    type="email"
                                    className="input-premium"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                    disabled={otpSent}
                                />
                            </div>
                            {otpSent && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 pl-1 space-x-2">
                                        <span>Enter OTP</span>
                                        <button type="button" onClick={() => setOtpSent(false)} className="text-primary-600 dark:text-primary-400 hover:underline text-xs font-normal">Change email</button>
                                    </label>
                                    <input
                                        type="text"
                                        className="input-premium text-center tracking-[0.5em] text-lg font-bold"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <button type="submit" disabled={loading} className="btn-primary w-full h-12 flex justify-center items-center">
                                {loading ? <div className="spinner !w-5 !h-5" /> : (otpSent ? 'Verify & Sign In' : 'Send Verification Code')}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); setAuthMode('password'); }}
                            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
