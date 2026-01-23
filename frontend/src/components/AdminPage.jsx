import { useState, useEffect } from 'react';
import { API_URL } from '../api';
import { authService } from '../supabase';

/**
 * AdminPage - Certificate Management Dashboard
 */
export default function AdminPage() {
    const [stats, setStats] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('certificates');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [revokeModal, setRevokeModal] = useState(null);
    const [revokeReason, setRevokeReason] = useState('');

    // Fetch data on mount
    useEffect(() => {
        fetchStats();
        fetchCertificates();
    }, []);

    useEffect(() => {
        if (activeTab === 'certificates') {
            fetchCertificates();
        } else if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab, page]);

    const getAuthHeaders = async () => {
        const token = await authService.getAccessToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchStats = async () => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_URL}/admin/stats`, { headers });
            if (!response.ok) {
                if (response.status === 403) {
                    setError('You do not have admin access');
                    return;
                }
                throw new Error('Failed to fetch stats');
            }
            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_URL}/admin/certificates?page=${page}&limit=20`, { headers });
            if (!response.ok) throw new Error('Failed to fetch certificates');
            const data = await response.json();
            setCertificates(data.certificates);
            setTotalPages(data.pages);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_URL}/admin/users?page=${page}&limit=20`, { headers });
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.users);
            setTotalPages(Math.ceil(data.total / 20));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (certificateId) => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_URL}/admin/certificates/${certificateId}/revoke`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reason: revokeReason })
            });
            if (!response.ok) throw new Error('Failed to revoke certificate');
            setRevokeModal(null);
            setRevokeReason('');
            fetchCertificates();
            fetchStats();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRestore = async (certificateId) => {
        if (!confirm('Are you sure you want to restore this certificate?')) return;
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_URL}/admin/certificates/${certificateId}/restore`, {
                method: 'POST',
                headers
            });
            if (!response.ok) throw new Error('Failed to restore certificate');
            fetchCertificates();
            fetchStats();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleAdmin = async (userId) => {
        if (!confirm('Are you sure you want to toggle admin status for this user?')) return;
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_URL}/admin/users/${userId}/toggle-admin`, {
                method: 'POST',
                headers
            });
            if (!response.ok) throw new Error('Failed to toggle admin status');
            fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    if (error === 'You do not have admin access' || (user && !user.is_admin)) {
        return (
            <div className="admin-page">
                <div className="container">
                    <div className="card text-center" style={{ maxWidth: '500px', margin: '100px auto' }}>
                        <h2 style={{ color: '#ef4444' }}>🚫 Admin Access Required</h2>
                        <p className="text-muted">You are logged in as <strong>{user?.email}</strong>, but this account does not have administrator privileges.</p>
                        <p className="mt-md">Please ensure you have set the <code>INITIAL_ADMIN_EMAIL</code> in your Render environment variables.</p>
                        <a href="/generate" className="btn btn-primary mt-lg">Go to Dashboard</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
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
                        <span>CertGen Admin</span>
                    </a>
                    <nav className="nav">
                        <a href="/generate" className="nav-link">Dashboard</a>
                        <a href="/" className="nav-link">Home</a>
                    </nav>
                </div>
            </header>

            <main className="main-content">
                <div className="container">
                    <h1 className="mb-xl">Admin Dashboard</h1>

                    {error && <div className="alert alert-error mb-lg">{error}</div>}

                    {/* Stats Cards */}
                    {stats && (
                        <div className="admin-stats-grid mb-xl">
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    📄
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.total_certificates}</span>
                                    <span className="stat-label">Total Certificates</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #22c55e)' }}>
                                    ✓
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.active_certificates}</span>
                                    <span className="stat-label">Active</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                                    ✗
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.revoked_certificates}</span>
                                    <span className="stat-label">Revoked</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                    👥
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">{stats.total_users}</span>
                                    <span className="stat-label">Users</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="admin-tabs mb-lg">
                        <button
                            className={`admin-tab ${activeTab === 'certificates' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('certificates'); setPage(1); }}
                        >
                            📄 Certificates
                        </button>
                        <button
                            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('users'); setPage(1); }}
                        >
                            👥 Users
                        </button>
                    </div>

                    {/* Certificates Table */}
                    {activeTab === 'certificates' && (
                        <div className="card">
                            <h3 className="mb-lg">All Certificates</h3>
                            {loading ? (
                                <div className="text-center"><span className="spinner" /></div>
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Certificate ID</th>
                                                    <th>Recipient</th>
                                                    <th>Course</th>
                                                    <th>Date</th>
                                                    <th>Status</th>
                                                    <th>User</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {certificates.map(cert => (
                                                    <tr key={cert.id} className={cert.is_revoked ? 'revoked' : ''}>
                                                        <td>
                                                            <code>{cert.certificate_id}</code>
                                                        </td>
                                                        <td>{cert.student_name}</td>
                                                        <td>{cert.course_name}</td>
                                                        <td>{cert.issue_date}</td>
                                                        <td>
                                                            {cert.is_revoked ? (
                                                                <span className="badge badge-error">Revoked</span>
                                                            ) : (
                                                                <span className="badge badge-success">Active</span>
                                                            )}
                                                        </td>
                                                        <td className="text-muted">{cert.user_email || '-'}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                {cert.download_urls?.pdf && (
                                                                    <a href={cert.download_urls.pdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                                                                        View
                                                                    </a>
                                                                )}
                                                                {cert.is_revoked ? (
                                                                    <button
                                                                        className="btn btn-sm btn-secondary"
                                                                        onClick={() => handleRestore(cert.certificate_id)}
                                                                    >
                                                                        Restore
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn-sm btn-danger"
                                                                        onClick={() => setRevokeModal(cert)}
                                                                    >
                                                                        Revoke
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="pagination mt-lg">
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                disabled={page === 1}
                                                onClick={() => setPage(p => p - 1)}
                                            >
                                                Previous
                                            </button>
                                            <span className="pagination-info">Page {page} of {totalPages}</span>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                disabled={page === totalPages}
                                                onClick={() => setPage(p => p + 1)}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Users Table */}
                    {activeTab === 'users' && (
                        <div className="card">
                            <h3 className="mb-lg">All Users</h3>
                            {loading ? (
                                <div className="text-center"><span className="spinner" /></div>
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Email</th>
                                                    <th>Phone</th>
                                                    <th>Certificates</th>
                                                    <th>Admin</th>
                                                    <th>Created</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(user => (
                                                    <tr key={user.id}>
                                                        <td>{user.email || '-'}</td>
                                                        <td>{user.phone || '-'}</td>
                                                        <td>{user.certificate_count}</td>
                                                        <td>
                                                            {user.is_admin ? (
                                                                <span className="badge badge-primary">Admin</span>
                                                            ) : (
                                                                <span className="badge badge-secondary">User</span>
                                                            )}
                                                        </td>
                                                        <td className="text-muted">
                                                            {new Date(user.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-outline"
                                                                onClick={() => handleToggleAdmin(user.id)}
                                                            >
                                                                {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Revoke Modal */}
            {revokeModal && (
                <div className="modal-overlay" onClick={() => setRevokeModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Revoke Certificate</h3>
                        <p>Are you sure you want to revoke certificate <strong>{revokeModal.certificate_id}</strong>?</p>
                        <p className="text-muted">Recipient: {revokeModal.student_name}</p>

                        <div className="form-group mt-lg">
                            <label className="form-label">Reason (optional)</label>
                            <textarea
                                className="form-input"
                                rows="3"
                                placeholder="Enter reason for revocation..."
                                value={revokeReason}
                                onChange={e => setRevokeReason(e.target.value)}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setRevokeModal(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={() => handleRevoke(revokeModal.certificate_id)}>
                                Revoke Certificate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
