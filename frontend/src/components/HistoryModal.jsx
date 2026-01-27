import React, { useState, useEffect } from 'react';
import { certificatesAPI } from '../api';

const HistoryModal = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await certificatesAPI.getHistory();
            setHistory(data.certificates);
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setError('Failed to load history. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-24 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-zoom-in border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Certificate History</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and download your previous generations</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-3 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-2xl transition-all shrink-0 border border-primary-100 dark:border-primary-800 shadow-sm"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Fetching history...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-600 mb-4 font-bold text-2xl">!</div>
                            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                            <button onClick={fetchHistory} className="mt-4 text-primary-500 hover:underline">Try Again</button>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No certificates found</p>
                            <p className="text-sm text-gray-400 mt-1">Generated certificates will appear here</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="pb-4 pt-0 font-bold text-xs uppercase tracking-wider text-gray-400 px-2">ID</th>
                                        <th className="pb-4 pt-0 font-bold text-xs uppercase tracking-wider text-gray-400 px-2">Name</th>
                                        <th className="pb-4 pt-0 font-bold text-xs uppercase tracking-wider text-gray-400 px-2">Course</th>
                                        <th className="pb-4 pt-0 font-bold text-xs uppercase tracking-wider text-gray-400 px-2 text-center">Date</th>
                                        <th className="pb-4 pt-0 font-bold text-xs uppercase tracking-wider text-gray-400 px-2 text-right">Download</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {history.map((cert) => (
                                        <tr key={cert.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="py-4 px-2 font-mono text-xs text-primary-600 dark:text-primary-400">{cert.certificate_id}</td>
                                            <td className="py-4 px-2 text-sm font-bold text-gray-900 dark:text-white">{cert.student_name}</td>
                                            <td className="py-4 px-2 text-sm text-gray-600 dark:text-gray-400 italic">{cert.course_name}</td>
                                            <td className="py-4 px-2 text-sm text-gray-500 text-center">{cert.issue_date}</td>
                                            <td className="py-4 px-2 text-right">
                                                <div className="flex justify-end gap-3">
                                                    {Object.entries(cert.download_urls).map(([format, url]) => (
                                                        <a
                                                            key={format}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-bold text-primary-500 hover:text-primary-600 uppercase tracking-widest hover:underline"
                                                            download
                                                        >
                                                            {format}
                                                        </a>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
