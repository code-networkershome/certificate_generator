import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children, user, isAuthenticated }) => {
    return (
        <div className="min-h-screen bg-mesh transition-colors duration-300">
            <Navbar user={user} isAuthenticated={isAuthenticated} />
            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
};

export default Layout;
