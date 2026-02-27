// src/App.jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
    Menu, X, LogOut, LayoutDashboard, Users, ShoppingBag, Factory, 
    Warehouse, Truck, Car, Smartphone, Package, Settings as SettingsIcon
} from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Baskets from './pages/Baskets';
import Devices from './pages/Devices';
import UsersPage from './pages/Users';
import Products from './pages/Products';
import Production from './pages/Production';
import Warehouses from './pages/Warehouses';
import Shipping from './pages/Shipping';
import Fleet from './pages/Fleet';
import SettingsPage from './pages/Settings';

function PrivateRoute({ children }) {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
}

const NAV_ITEMS = [
    { name: '儀表板', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: '生產管理', path: '/production', icon: <Factory size={20} /> },
    { name: '籃子監控', path: '/inventory', icon: <Package size={20} /> },
    { name: '倉庫管理', path: '/warehouses', icon: <Warehouse size={20} /> },
    { name: '出貨管理', path: '/shipping', icon: <Truck size={20} /> },
    { name: '車隊管理', path: '/fleet', icon: <Car size={20} /> },
    { name: '產品管理', path: '/products', icon: <ShoppingBag size={20} /> },
    { name: '用戶管理', path: '/users', icon: <Users size={20} /> },
    { name: '裝置管理', path: '/devices', icon: <Smartphone size={20} /> },
    { name: '設定', path: '/settings', icon: <SettingsIcon size={20} /> },
];

function Layout({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* 移動端頂部列：僅在 md 以下顯示 */}
            <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
                <h2 className="text-xl font-bold tracking-wide">RFID Admin</h2>
                <button 
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* 側邊導覽列：移動端為固定抽屜，桌面端為相對定位的固定寬度欄位 */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out flex flex-col shadow-xl
                md:relative md:translate-x-0 
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-800 hidden md:block">
                    <h2 className="text-xl font-bold text-white tracking-wide">RFID Admin</h2>
                    <div className="text-xs text-slate-500 mt-2">v1.0.0</div>
                </div>
                
                <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="text-sm font-medium text-white truncate">{user.name || user.username}</div>
                    <div className="text-xs text-slate-400 mt-1">{user.department} | {user.role}</div>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-3">
                        {NAV_ITEMS.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <li key={item.path}>
                                    <Link 
                                        to={item.path} 
                                        onClick={() => setSidebarOpen(false)} // 點擊選單後自動關閉側邊欄
                                        className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                                            isActive 
                                                ? 'bg-blue-600 text-white shadow-md' 
                                                : 'hover:bg-slate-800 hover:text-white'
                                        }`}
                                    >
                                        <span className="mr-3">{item.icon}</span>
                                        <span className="font-medium text-sm">{item.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center justify-center w-full px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition-colors text-sm"
                    >
                        <LogOut size={18} className="mr-2" /> 登出系統
                    </button>
                </div>
            </aside>

            {/* 移動端遮罩層：側邊欄打開時，點擊右側內容區域可關閉 */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity" 
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* 主內容區：新增 min-w-0 防止 flex 佈局下表格撐開容器 */}
            <main className="flex-1 overflow-auto relative min-w-0">
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
        
        {/* 套用 Layout 的路由 */}
        <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute><Layout><Baskets /></Layout></PrivateRoute>} />
        <Route path="/production" element={<PrivateRoute><Layout><Production /></Layout></PrivateRoute>} />
        <Route path="/warehouses" element={<PrivateRoute><Layout><Warehouses /></Layout></PrivateRoute>} />
        <Route path="/shipping" element={<PrivateRoute><Layout><Shipping /></Layout></PrivateRoute>} />
        <Route path="/fleet" element={<PrivateRoute><Layout><Fleet /></Layout></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Layout><Products /></Layout></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><Layout><UsersPage /></Layout></PrivateRoute>} />
        <Route path="/devices" element={<PrivateRoute><Layout><Devices /></Layout></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Layout><SettingsPage /></Layout></PrivateRoute>} />

        {/* 處理未定義路由 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;