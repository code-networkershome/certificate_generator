import { useState, useEffect } from 'react';
import { adminAPI } from '../api';

export default function AdminPage() {
    const [stats, setStats] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isForbidden, setIsForbidden] = useState(false);
    const [activeTab, setActiveTab] = useState('certificates');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [revokeModal, setRevokeModal] = useState(null);
    const [revokeReason, setRevokeReason] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (activeTab === 'certificates') fetchCertificates();
        else if (activeTab === 'users') fetchUsers();
    }, [activeTab, page]);

    const fetchStats = async () => {
        try {
            const data = await adminAPI.getStats();
            setStats(data);
        } catch (err) {
            if (err.status === 403) setIsForbidden(true);
            setError(err.message);
        }
    };

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const data = await adminAPI.getCertificates(page, 20);
            setCertificates(data.certificates);
            setTotalPages(data.pages);
        } catch (err) {
            if (err.status === 403) setIsForbidden(true);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminAPI.getUsers(page, 20);
            setUsers(data.users);
            setTotalPages(Math.ceil(data.total / 20));
        } catch (err) {
            if (err.status === 403) setIsForbidden(true);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (id) => {
        try {
            await adminAPI.revokeCertificate(id, revokeReason);
            setRevokeModal(null);
            setRevokeReason('');
            fetchCertificates();
            fetchStats();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleAdmin = async (userId) => {
        if (!confirm('Toggle admin status?')) return;
        try {
            await adminAPI.toggleAdmin(userId);
            fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    if (isForbidden) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in-up">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-6 text-3xl">🚫</div>
                <h2 className="text-3xl font-extrabold dark:text-white mb-4">Access Denied</h2>
                <p className="text-gray-500 max-w-md">Admin privileges are required to view this dashboard. Please contact the system administrator.</p>
                <a href="/generate" className="btn-primary mt-8">Return to Dashboard</a>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold dark:text-white">Admin Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage certificates and system users</p>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Issued', value: stats.total_certificates, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
                        { label: 'Active', value: stats.active_certificates, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                        { label: 'Revoked', value: stats.revoked_certificates, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                        { label: 'Total Users', value: stats.total_users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' }
                    ].map((s, i) => (
                        <div key={i} className="card-premium p-6 flex items-center gap-4">
                            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center text-xl font-bold ${s.color}`}>
                                {s.label.slice(0, 1)}
                            </div>
                            <div>
                                <div className="text-2xl font-bold dark:text-white">{s.value}</div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Content Tabs */}
            <div className="card-premium overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button onClick={() => { setActiveTab('certificates'); setPage(1); }} className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'certificates' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/30' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        Certificates
                    </button>
                    <button onClick={() => { setActiveTab('users'); setPage(1); }} className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'users' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/30' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        Users
                    </button>
                </div>

                <div className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="py-20 flex justify-center"><div className="spinner"></div></div>
                    ) : activeTab === 'certificates' ? (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-tighter text-xs">ID</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-tighter text-xs">Recipient & Course</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-tighter text-xs">Status</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-tighter text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {certificates.map(cert => (
                                    <tr key={cert.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-primary-600 dark:text-primary-400">{cert.certificate_id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold dark:text-white">{cert.student_name}</div>
                                            <div className="text-xs text-gray-500">{cert.course_name} • {cert.issue_date}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${cert.is_revoked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {cert.is_revoked ? 'Revoked' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 space-x-2">
                                            {!cert.is_revoked && (
                                                <button onClick={() => setRevokeModal(cert)} className="text-red-500 hover:underline font-medium">Revoke</button>
                                            )}
                                            {cert.download_urls?.pdf && (
                                                <a href={cert.download_urls.pdf} target="_blank" className="text-primary-500 hover:underline font-medium">View</a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-tighter text-xs">User Email</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-tighter text-xs">Count</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-tighter text-xs">Role</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-tighter text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4 font-bold dark:text-white">{u.email}</td>
                                        <td className="px-6 py-4 text-gray-500">{u.certificate_count} certs</td>
                                        <td className="px-6 py-4 tracking-widest text-[10px]">
                                            <span className={`px-2 py-1 rounded font-bold uppercase ${u.is_admin ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700'}`}>
                                                {u.is_admin ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleToggleAdmin(u.id)} className="text-primary-500 hover:underline font-medium text-xs">
                                                {u.is_admin ? 'Demote' : 'Promote'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary !py-1 flex items-center gap-1">← Prev</button>
                        <span className="text-gray-500 font-medium tracking-widest">Page {page} of {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary !py-1 flex items-center gap-1">Next →</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {revokeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="card-premium max-w-md w-full p-8 space-y-6">
                        <h3 className="text-2xl font-bold dark:text-white">Revoke Certificate</h3>
                        <p className="text-gray-500">ID: <span className="font-mono text-red-500">{revokeModal.certificate_id}</span></p>
                        <textarea className="input-premium h-24" placeholder="Reason for revocation..." value={revokeReason} onChange={e => setRevokeReason(e.target.value)} />
                        <div className="flex gap-4">
                            <button onClick={() => setRevokeModal(null)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={() => handleRevoke(revokeModal.certificate_id)} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">Confirm Revoke</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
