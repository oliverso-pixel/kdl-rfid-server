// src/pages/Settings.jsx
import { useState, useEffect } from 'react';
import api from '../api';
import { User, Lock, Save, Shield } from 'lucide-react';

export default function Settings() {
    const [profile, setProfile] = useState(null);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    
    useEffect(() => {
        // 取得當前用戶最新資料
        api.get('/auth/me').then(res => setProfile(res.data));
    }, []);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            alert("新密碼兩次輸入不一致");
            return;
        }
        try {
            await api.put('/users/me/password', {
                current_password: passwords.current,
                new_password: passwords.new
            });
            alert("密碼修改成功");
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            alert("修改失敗：" + (error.response?.data?.detail || error.message));
        }
    };

    if (!profile) return <div className="p-6">載入中...</div>;

    return (
        <div className="p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">個人設定</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 基本資料卡片 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-lg font-bold mb-4 flex items-center">
                        <User className="mr-2" size={20} /> 基本資料
                    </h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="text-slate-500">帳號</span>
                            <span className="col-span-2 font-mono">{profile.username}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="text-slate-500">姓名</span>
                            <span className="col-span-2">{profile.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="text-slate-500">部門/角色</span>
                            <span className="col-span-2">
                                <span className="px-2 py-1 bg-slate-100 rounded text-xs mr-2">{profile.department}</span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{profile.role}</span>
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="text-slate-500">權限</span>
                            <div className="col-span-2 flex flex-wrap gap-1">
                                {profile.permissions.includes('*') 
                                    ? <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">超級管理員</span>
                                    : profile.permissions.map(p => (
                                        <span key={p} className="px-2 py-0.5 bg-gray-100 rounded text-xs">{p}</span>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* 修改密碼卡片 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-lg font-bold mb-4 flex items-center">
                        <Lock className="mr-2" size={20} /> 修改密碼
                    </h2>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">目前密碼</label>
                            <input 
                                type="password" 
                                className="w-full border rounded p-2 text-sm"
                                value={passwords.current}
                                onChange={e => setPasswords({...passwords, current: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">新密碼</label>
                            <input 
                                type="password" 
                                className="w-full border rounded p-2 text-sm"
                                value={passwords.new}
                                onChange={e => setPasswords({...passwords, new: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">確認新密碼</label>
                            <input 
                                type="password" 
                                className="w-full border rounded p-2 text-sm"
                                value={passwords.confirm}
                                onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-700 flex items-center justify-center">
                            <Save size={16} className="mr-2" /> 儲存變更
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
