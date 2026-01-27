import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './components/HomePage';
import AdminPage from './components/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GeneratePage from './pages/GeneratePage';
import BulkGeneratePage from './pages/BulkGeneratePage';

function App() {
    const { isAuthenticated, user, loading, login } = useAuth();

    return (
        <ThemeProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Layout user={user} isAuthenticated={isAuthenticated}>
                    <Routes>
                        <Route path="/" element={<HomePage isAuthenticated={isAuthenticated} />} />
                        <Route
                            path="/login"
                            element={
                                isAuthenticated ? (
                                    <Navigate to={user?.is_admin ? "/admin" : "/generate"} replace />
                                ) : (
                                    <LoginPage onLogin={login} />
                                )
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                isAuthenticated ? (
                                    <Navigate to="/generate" replace />
                                ) : (
                                    <RegisterPage onLogin={login} />
                                )
                            }
                        />
                        <Route
                            path="/generate"
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                    <GeneratePage user={user} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/bulk"
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                    <BulkGeneratePage user={user} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                                    <AdminPage user={user} />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
