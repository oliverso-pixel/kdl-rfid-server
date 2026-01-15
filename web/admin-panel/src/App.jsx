// src/App.jsx
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Devices from './pages/Devices';
import Baskets from './pages/Baskets';
import Login from './pages/Login';

function PrivateRoute({ children }) {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
}

function Layout({ children }) {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <aside className="w-64 bg-slate-800 text-white p-4 flex flex-col">
                <h2 className="text-xl font-bold mb-8">RFID Admin</h2>
                <div className="mb-4 text-sm text-gray-400">Hi, {user.username}</div>
                
                <nav className="space-y-2 flex-1">
                    <Link to="/" className="block p-3 rounded hover:bg-slate-700">📦 籃子監控</Link>
                    <Link to="/devices" className="block p-3 rounded hover:bg-slate-700">📱 裝置管理</Link>
                </nav>

                <button 
                    onClick={handleLogout}
                    className="flex items-center p-3 rounded hover:bg-red-600 mt-auto text-red-100"
                >
                    <LogOut size={18} className="mr-2" /> 登出
                </button>
            </aside>
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* 受保護的路由 */}
        <Route path="/" element={
            <PrivateRoute>
                <Layout><Baskets /></Layout>
            </PrivateRoute>
        } />
        <Route path="/devices" element={
            <PrivateRoute>
                <Layout><Devices /></Layout>
            </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;