// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // 這裡直接用 axios 避免循環依賴，或者用 api 實例但小心 401
import { Lock, User } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // 硬編碼 API URL，避免未登入時 Interceptor 的干擾
    const API_URL = 'http://192.9.204.144:8000/api/v1'; 

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const res = await axios.post(`${API_URL}/auth/login`, formData);
            
            // 儲存 Token 與使用者資訊
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('user', JSON.stringify({
                username: res.data.username,
                role: res.data.role,
                department: res.data.department,
                permissions: res.data.permissions || []
            }));

            navigate('/'); // 登入成功跳轉首頁
        } catch (err) {
            console.error(err);
            setError('登入失敗，請檢查帳號密碼');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">RFID 系統登入</h2>
                {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
                
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">帳號</label>
                        <div className="flex items-center border rounded px-3 py-2">
                            <User size={18} className="text-gray-400 mr-2" />
                            <input 
                                type="text" 
                                className="w-full outline-none"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">密碼</label>
                        <div className="flex items-center border rounded px-3 py-2">
                            <Lock size={18} className="text-gray-400 mr-2" />
                            <input 
                                type="password" 
                                className="w-full outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-700">
                        登入
                    </button>
                </form>
            </div>
        </div>
    );
}