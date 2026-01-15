// src/pages/Users.jsx
import { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, Search, Edit, Trash2, Shield, X, Save, Ban, CheckCircle } from 'lucide-react';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Modal 狀態
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});

    // 權限檢查
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = (currentUser.permissions || []).includes('*');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users/', { params: { search: search || undefined } });
            setUsers(res.data.items);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenCreate = () => {
        setFormData({ 
            username: '', password: '', name: '', 
            role: 'Operator', department: 'Production', 
            is_active: true, extra_permissions: [] 
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setFormData({ 
            uid: user.uid,
            username: user.username, 
            name: user.name, 
            role: user.role, 
            department: user.department, 
            is_active: user.is_active,
            extra_permissions: user.permissions || [],
            password: '' // 編輯時若不填則不改密碼
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // 處理權限字串轉陣列
            let payload = { ...formData };
            if (typeof payload.extra_permissions === 'string') {
               // 如果是 UI 輸入的 CSV 字串，轉為陣列
               payload.extra_permissions = payload.extra_permissions.split(',').map(s => s.trim()).filter(s => s);
            }

            if (isEditing) {
                // 如果密碼為空，移除該欄位以防被重設為空字串
                if (!payload.password) delete payload.password;
                
                await api.put(`/users/${payload.uid}`, payload);
                alert("更新成功");
            } else {
                await api.post('/users/', payload);
                alert("新增成功");
            }
            setShowModal(false);
            fetchUsers();
        } catch (error) {
            alert("操作失敗：" + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (uid) => {
        if (confirm("確定要刪除此用戶嗎？(此操作無法復原)")) {
            try {
                await api.delete(`/users/${uid}`);
                fetchUsers();
            } catch (error) {
                alert("刪除失敗");
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">用戶管理</h1>
                <button onClick={handleOpenCreate} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center hover:bg-slate-700">
                    <UserPlus size={18} className="mr-2" /> 新增用戶
                </button>
            </div>

            {/* 搜尋欄 */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-4 flex gap-2">
                <div className="flex items-center bg-slate-50 px-3 py-2 rounded border max-w-md flex-1">
                    <Search size={18} className="text-slate-400 mr-2" />
                    <input 
                        type="text" 
                        placeholder="搜尋帳號或姓名..." 
                        className="bg-transparent outline-none w-full text-sm" 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                    />
                </div>
                <button onClick={fetchUsers} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                    搜尋
                </button>
            </div>

            {/* 用戶列表 */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-3 font-medium">狀態</th>
                            <th className="p-3 font-medium">帳號</th>
                            <th className="p-3 font-medium">姓名</th>
                            <th className="p-3 font-medium">部門 / 角色</th>
                            <th className="p-3 font-medium">最後登入</th>
                            <th className="p-3 font-medium text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="6" className="p-8 text-center text-slate-500">載入中...</td></tr> : 
                         users.map(user => (
                            <tr key={user.uid} className={`border-b hover:bg-slate-50 ${!user.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                                <td className="p-3">
                                    {user.is_active ? 
                                        <CheckCircle size={16} className="text-green-500" /> : 
                                        <Ban size={16} className="text-red-500" />
                                    }
                                </td>
                                <td className="p-3 font-mono">{user.username}</td>
                                <td className="p-3">{user.name}</td>
                                <td className="p-3">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs mr-1">{user.department}</span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{user.role}</span>
                                </td>
                                <td className="p-3 text-slate-500">
                                    {user.last_login ? new Date(user.last_login).toLocaleString() : '-'}
                                </td>
                                <td className="p-3 text-right space-x-2">
                                    <button 
                                        onClick={() => handleOpenEdit(user)}
                                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                        title="編輯"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    {isSuperAdmin && (
                                        <button 
                                            onClick={() => handleDelete(user.uid)}
                                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                                            title="刪除"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 新增/編輯 Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">{isEditing ? '編輯用戶' : '新增用戶'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400 hover:text-black" /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!isEditing && (
                                <div>
                                    <label className="block text-xs font-bold mb-1">帳號</label>
                                    <input required type="text" className="w-full border rounded p-2" 
                                        value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-xs font-bold mb-1">姓名</label>
                                <input required type="text" className="w-full border rounded p-2" 
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1">部門</label>
                                    <select className="w-full border rounded p-2" 
                                        value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                                        <option value="IT">IT</option>
                                        <option value="Production">Production</option>
                                        <option value="Warehouse">Warehouse</option>
                                        <option value="Shipping">Shipping</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">角色</label>
                                    <select className="w-full border rounded p-2" 
                                        value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                        <option value="Admin">Admin</option>
                                        <option value="Operator">Operator</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1">
                                    {isEditing ? '重設密碼 (若不修改請留空)' : '密碼'}
                                </label>
                                <input type="password" className="w-full border rounded p-2" 
                                    required={!isEditing}
                                    placeholder={isEditing ? "******" : ""}
                                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="active" 
                                    checked={formData.is_active} 
                                    onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                                <label htmlFor="active" className="text-sm">啟用帳號</label>
                            </div>

                            {/* 僅 Super Admin 可見的權限設定 */}
                            {isSuperAdmin && (
                                <div className="border-t pt-2">
                                    <label className="block text-xs font-bold mb-1 text-purple-800 flex items-center">
                                        <Shield size={12} className="mr-1"/> 額外權限 (JSON格式)
                                    </label>
                                    <textarea className="w-full border rounded p-2 text-xs font-mono" rows="2"
                                        placeholder='["basket:create"]'
                                        value={JSON.stringify(formData.extra_permissions)}
                                        onChange={e => {
                                            try {
                                                const val = JSON.parse(e.target.value);
                                                setFormData({...formData, extra_permissions: val});
                                            } catch(err) {
                                                // 暫時允許錯誤輸入，提交時會擋或用 String 處理
                                            }
                                        }}
                                    />
                                    <p className="text-[10px] text-gray-400">請輸入標準 JSON Array，例如 ["basket:create"]</p>
                                </div>
                            )}

                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold">
                                {isEditing ? '儲存變更' : '建立用戶'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
