// src/pages/Warehouses.jsx
import { useState, useEffect } from 'react';
import api from '../api';
import { Warehouse, MapPin, Plus, Edit, Package, X, CheckCircle, Ban } from 'lucide-react';

export default function Warehouses() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal 狀態
    const [showFormModal, setShowFormModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    
    // 庫存檢視資料
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = (user.permissions || []).includes('*');

    // 1. 載入倉庫列表
    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/warehouses/');
            setWarehouses(res.data);
        } catch (error) {
            console.error("Failed to fetch warehouses", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchWarehouses(); }, []);

    // 2. 載入特定倉庫的庫存
    const fetchInventory = async (whId) => {
        setInventoryLoading(true);
        try {
            const res = await api.get(`/warehouses/${whId}/baskets`);
            setInventory(res.data);
        } catch (error) {
            alert("無法載入庫存資訊");
        } finally {
            setInventoryLoading(false);
        }
    };

    // 操作處理
    const handleOpenCreate = () => {
        setFormData({ warehouseId: '', name: '', address: '', isActive: true });
        setIsEditing(false);
        setShowFormModal(true);
    };

    const handleOpenEdit = (wh) => {
        setFormData({ ...wh });
        setIsEditing(true);
        setShowFormModal(true);
    };

    const handleOpenInventory = (wh) => {
        setSelectedWarehouse(wh);
        setInventory([]);
        setShowInventoryModal(true);
        fetchInventory(wh.warehouseId);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/warehouses/${formData.wid}`, formData);
                alert("更新成功");
            } else {
                await api.post('/warehouses/', formData);
                alert("新增成功");
            }
            setShowFormModal(false);
            fetchWarehouses();
        } catch (error) {
            alert("操作失敗: " + (error.response?.data?.detail || error.message));
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <Warehouse className="mr-2" /> 倉庫管理
                </h1>
                {isSuperAdmin && (
                    <button onClick={handleOpenCreate} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center hover:bg-slate-700">
                        <Plus size={18} className="mr-2" /> 新增倉庫
                    </button>
                )}
            </div>

            {/* 倉庫卡片列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {warehouses.map((wh) => (
                    <div key={wh.wid} className={`bg-white border rounded-lg p-6 shadow-sm relative group transition-all hover:shadow-md ${!wh.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <MapPin size={24} />
                            </div>
                            <div className="flex gap-2">
                                {/* 狀態標籤 */}
                                {wh.isActive ? (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex items-center h-fit">
                                        <CheckCircle size={10} className="mr-1"/> 啟用
                                    </span>
                                ) : (
                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold flex items-center h-fit">
                                        <Ban size={10} className="mr-1"/> 停用
                                    </span>
                                )}
                                
                                {/* 編輯按鈕 (Admin) */}
                                {isSuperAdmin && (
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(wh); }} className="text-gray-400 hover:text-blue-600">
                                        <Edit size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <h3 className="font-bold text-lg mb-1 text-slate-800">{wh.name}</h3>
                        <p className="text-xs font-mono text-slate-400 mb-2">ID: {wh.warehouseId}</p>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2 h-10">{wh.address || '無地址資訊'}</p>
                        
                        <button 
                            onClick={() => handleOpenInventory(wh)}
                            className="w-full border border-blue-600 text-blue-600 hover:bg-blue-50 py-2 rounded text-sm font-bold flex items-center justify-center transition-colors"
                        >
                            <Package size={16} className="mr-2" /> 查看庫存
                        </button>
                    </div>
                ))}
            </div>

            {/* --- Modal 1: 新增/編輯倉庫 --- */}
            {showFormModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">{isEditing ? '編輯倉庫' : '新增倉庫'}</h3>
                            <button onClick={() => setShowFormModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">倉庫 ID</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-2 disabled:bg-gray-100"
                                    value={formData.warehouseId}
                                    onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                                    disabled={isEditing} // ID 不可修改
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">倉庫名稱</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-2"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">地址</label>
                                <textarea 
                                    className="w-full border rounded p-2"
                                    rows="3"
                                    value={formData.address || ''}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="wh_active"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                />
                                <label htmlFor="wh_active" className="text-sm">啟用狀態</label>
                            </div>
                            <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded font-bold hover:bg-slate-700">
                                儲存
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Modal 2: 查看庫存 --- */}
            {showInventoryModal && selectedWarehouse && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold">{selectedWarehouse.name} - 庫存清單</h3>
                                <p className="text-xs text-slate-500">ID: {selectedWarehouse.warehouseId}</p>
                            </div>
                            <button onClick={() => setShowInventoryModal(false)}><X size={20} /></button>
                        </div>
                        
                        <div className="p-0 overflow-auto flex-1">
                            {inventoryLoading ? (
                                <div className="p-8 text-center text-slate-500">載入中...</div>
                            ) : inventory.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">目前無在庫籃子</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b sticky top-0">
                                        <tr>
                                            <th className="p-3 font-medium text-slate-600">RFID</th>
                                            <th className="p-3 font-medium text-slate-600">產品</th>
                                            <th className="p-3 font-medium text-slate-600 text-right">數量</th>
                                            <th className="p-3 font-medium text-slate-600">更新時間</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inventory.map(b => (
                                            <tr key={b.bid} className="hover:bg-blue-50">
                                                <td className="p-3 font-mono text-blue-600">{b.rfid}</td>
                                                <td className="p-3">
                                                    {b.product ? JSON.parse(b.product).name : '-'}
                                                </td>
                                                <td className="p-3 text-right font-bold">{b.quantity}</td>
                                                <td className="p-3 text-xs text-slate-400">
                                                    {new Date(b.lastUpdated).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        <div className="p-3 border-t bg-slate-50 text-right text-xs text-slate-500">
                            共 {inventory.length} 筆資料
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
