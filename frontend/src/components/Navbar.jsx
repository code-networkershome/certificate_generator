import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import HistoryModal from './HistoryModal';

const Navbar = ({ user, isAuthenticated, onLogout }) => {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

    const handleLogout = async () => {
        if (onLogout) {
            await onLogout();
        }
        navigate('/login');
    };

    return (
        <>
            <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-8">
                            <Link to="/" className="flex items-center gap-2 group">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                                    CertGen
                                </span>
                            </Link>

                            {isAuthenticated && (
                                <div className="hidden md:flex items-center gap-6">
                                    <Link to="/generate" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors">
                                        Generate
                                    </Link>
                                    <Link to="/bulk" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors">
                                        Bulk
                                    </Link>
                                    <button
                                        onClick={() => setIsHistoryOpen(true)}
                                        className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 font-medium transition-colors"
                                    >
                                        History
                                    </button>
                                    {user?.is_admin && (
                                        <Link to="/admin" className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-semibold">
                                            Admin
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                aria-label="Toggle theme"
                            >
                                {theme === 'light' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                            </button>

                            {isAuthenticated ? (
                                <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                                    <div className="hidden sm:block text-right">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">
                                            {user?.email?.split('@')[0]}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Authenticated</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="btn-secondary !py-1.5 !px-4 text-sm"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <Link to="/login" className="btn-primary !py-2 !px-6 text-sm">
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <HistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
        </>
    );
};

export default Navbar;
