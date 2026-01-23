// src/pages/Production.jsx
import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Factory, Calendar, Plus, Ban, Trash2, Edit, Save, X, Search, Copy, CheckCircle, RotateCcw } from 'lucide-react';

export default function Production() {
    const getTodayString = () => new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [batches, setBatches] = useState([]);
    const [products, setProducts] = useState([]); 
    const [loading, setLoading] = useState(false);

    // Modal 狀態
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ bid: null, status: '', targetQuantity: 0, producedQuantity: 0 });
    
    // 表單資料
    const [createForm, setCreateForm] = useState({ itemcode: '', targetQuantity: 100, productSearch: '' });
    const [copySourceDate, setCopySourceDate] = useState(''); // 複製來源日期
    const [statusForm, setStatusForm] = useState({ bid: null, status: '' }); // 狀態修改用

    // 產品搜尋建議列表
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchWrapperRef = useRef(null);

    // 權限
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const perms = user.permissions || [];
    const isSuperAdmin = perms.includes('*');
    
    // 權限定義
    const canStop = isSuperAdmin || perms.includes('production:stop');
    const canEditHistory = isSuperAdmin || perms.includes('production:edit_history');
    const canDeleteHistory = isSuperAdmin || perms.includes('production:delete_history');
    // 假設擁有 create 權限的人也可以修改狀態 (除了 Stop 需要特殊權限)
    const canUpdateStatus = isSuperAdmin || perms.includes('production:create');

    const isPastDate = new Date(selectedDate) < new Date(getTodayString());
    const allowEdit = !isPastDate || canEditHistory;
    const allowDelete = !isPastDate || canDeleteHistory;

    // --- API 呼叫 ---

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await api.get('/production/', { params: { target_date: selectedDate } });
            setBatches(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        // 取得所有啟用中的產品
        const res = await api.get('/products/', { params: { page_size: 1000, is_active: true } });
        setProducts(res.data.items);
    };

    useEffect(() => { fetchBatches(); }, [selectedDate]);
    useEffect(() => { fetchProducts(); }, []);

    // --- 產品搜尋邏輯 ---

    useEffect(() => {
        // 點擊外部關閉建議選單
        function handleClickOutside(event) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setCreateForm(prev => ({ ...prev, productSearch: val, itemcode: '' })); // 清空 itemcode 直到選中
        
        if (val.trim()) {
            const filtered = products.filter(p => 
                p.name.toLowerCase().includes(val.toLowerCase()) || 
                p.itemcode.toLowerCase().includes(val.toLowerCase())
            );
            setFilteredProducts(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectProduct = (prod) => {
        setCreateForm(prev => ({ ...prev, itemcode: prod.itemcode, productSearch: `${prod.name} (${prod.itemcode})` }));
        setShowSuggestions(false);
    };

    // --- 操作邏輯 ---

    // 1. 新增單筆工序
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!createForm.itemcode) {
            alert("請從選單中選擇一個有效的產品");
            return;
        }
        try {
            await api.post('/production/', {
                itemcode: createForm.itemcode,
                targetQuantity: parseInt(createForm.targetQuantity),
                productionDate: selectedDate
            });
            setShowCreateModal(false);
            fetchBatches();
        } catch (error) {
            alert("建立失敗: " + (error.response?.data?.detail || error.message));
        }
    };

    // 2. 從歷史日期載入 (複製工序)
    const handleCopySchedule = async () => {
        if (!copySourceDate) return alert("請選擇來源日期");
        
        setLoading(true);
        try {
            // A. 取得來源日期的所有工序
            const res = await api.get('/production/', { params: { target_date: copySourceDate } });
            const sourceBatches = res.data;

            if (sourceBatches.length === 0) {
                alert("該日期沒有工序資料");
                setLoading(false);
                return;
            }

            if (!confirm(`確定要從 ${copySourceDate} 載入 ${sourceBatches.length} 筆工序到 ${selectedDate} 嗎？`)) {
                setLoading(false);
                return;
            }

            // B. 逐筆建立到當前日期 (使用 Promise.all 並行處理)
            const promises = sourceBatches.map(batch => 
                api.post('/production/', {
                    itemcode: batch.itemcode,
                    targetQuantity: batch.targetQuantity, // 複製原本的預計產量
                    productionDate: selectedDate
                })
            );

            await Promise.all(promises);
            
            alert("載入完成");
            setShowCopyModal(false);
            fetchBatches(); // 重新整理當前列表
        } catch (error) {
            alert("載入部分或全部失敗: " + error.message);
            fetchBatches();
        } finally {
            setLoading(false);
        }
    };

    // 3. 修改狀態
    const handleStatusUpdate = async () => {
        try {
            await api.put(`/production/${statusForm.bid}`, { status: statusForm.status });
            setShowEditStatusModal(false);
            fetchBatches();
        } catch (error) {
            alert("更新失敗: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleOpenEdit = (batch) => {
        setEditForm({
            bid: batch.bid,
            status: batch.status,
            targetQuantity: batch.targetQuantity,
            producedQuantity: batch.producedQuantity
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async () => {
        try {
            await api.put(`/production/${editForm.bid}`, {
                status: editForm.status,
                targetQuantity: parseInt(editForm.targetQuantity),
                producedQuantity: parseInt(editForm.producedQuantity)
            });
            setShowEditModal(false);
            fetchBatches();
        } catch (error) {
            alert("更新失敗: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (bid) => {
        if (!confirm("確定要刪除此工序嗎？")) return;
        try {
            await api.delete(`/production/${bid}`);
            fetchBatches();
        } catch (error) {
            alert("刪除失敗");
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center text-slate-800">
                <Factory className="mr-2" /> 生產管理
            </h1>

            {/* --- 控制面板 --- */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-slate-600 flex items-center">
                        <Calendar size={18} className="mr-2" /> 生產日期
                    </label>
                    <input 
                        type="date" 
                        className="border rounded px-3 py-2 bg-slate-50 outline-none focus:border-blue-500"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-2">
                    {allowEdit && (
                        <>
                            <button 
                                onClick={() => { setCopySourceDate(''); setShowCopyModal(true); }}
                                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded flex items-center hover:bg-slate-50 transition-colors"
                            >
                                <Copy size={18} className="mr-2" /> 從歷史載入
                            </button>
                            <button 
                                onClick={() => { 
                                    setCreateForm({ itemcode: '', targetQuantity: 100, productSearch: '' }); 
                                    setFilteredProducts([]);
                                    setShowCreateModal(true); 
                                }}
                                className="bg-green-600 text-white px-4 py-2 rounded flex items-center hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <Plus size={18} className="mr-2" /> 新增工序
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* --- 工序列表 --- */}
            <div className="grid grid-cols-1 gap-4">
                {batches.map(batch => (
                    <div key={batch.bid} className={`bg-white border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm hover:shadow-md transition-shadow 
                        ${batch.status === 'STOPPED' ? 'border-l-4 border-l-red-500 bg-red-50/50' : 
                          batch.status === 'COMPLETED' ? 'border-l-4 border-l-gray-500 bg-gray-50' :
                          'border-l-4 border-l-green-500'}`}>
                        
                        <div className="mb-2 md:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border">{batch.batch_code}</span>
                                <StatusBadge status={batch.status} />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                {products.find(p => p.itemcode === batch.itemcode)?.name || batch.itemcode}
                                <span className="ml-2 text-sm text-slate-400 font-normal">({batch.itemcode})</span>
                            </h3>
                            <div className="text-sm text-slate-500 mt-1 flex gap-4">
                                <span>預計: <strong>{batch.targetQuantity}</strong></span>
                                <span>生產: <strong>{batch.producedQuantity}</strong></span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {/* 編輯工序按鈕 */}
                            {canUpdateStatus && (
                                <button 
                                    onClick={() => handleOpenEdit(batch)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors" 
                                    title="編輯工序"
                                >
                                    <Edit size={18} />
                                </button>
                            )}
                            
                            {/* 刪除按鈕 */}
                            {allowDelete && (
                                <button 
                                    onClick={() => handleDelete(batch.bid)} 
                                    className="p-2 text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors" 
                                    title="刪除工序"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                
                {batches.length === 0 && !loading && (
                    <div className="text-center text-slate-400 py-12 bg-slate-50 rounded border border-dashed">
                        尚無生產計畫，請點擊「新增工序」或「從歷史載入」
                    </div>
                )}
            </div>

            {/* --- Modal 1: 新增工序 (含產品搜尋) --- */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 overflow-visible"> {/* overflow-visible for dropdown */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">新增工序 ({selectedDate})</h3>
                            <button onClick={() => setShowCreateModal(false)}><X size={20} className="text-slate-400 hover:text-black" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="relative" ref={searchWrapperRef}>
                                <label className="block text-sm font-bold mb-1">產品搜尋</label>
                                <div className="flex items-center border rounded px-2 focus-within:ring-2 ring-blue-100 border-slate-300">
                                    <Search size={18} className="text-slate-400 mr-2" />
                                    <input 
                                        type="text" 
                                        className="w-full py-2 outline-none"
                                        placeholder="輸入名稱或代號..."
                                        value={createForm.productSearch}
                                        onChange={handleSearchChange}
                                        onFocus={() => createForm.productSearch && setShowSuggestions(true)}
                                    />
                                    {createForm.itemcode && <CheckCircle size={18} className="text-green-500 ml-2" />}
                                </div>
                                {/* 搜尋建議下拉選單 */}
                                {showSuggestions && filteredProducts.length > 0 && (
                                    <ul className="absolute z-50 left-0 right-0 bg-white border rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                                        {filteredProducts.map(p => (
                                            <li 
                                                key={p.pid} 
                                                onClick={() => selectProduct(p)}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-b-0"
                                            >
                                                <div className="font-bold text-slate-700">{p.name}</div>
                                                <div className="text-xs text-slate-400">{p.itemcode}</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">預計產量</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded p-2 focus:border-blue-500 outline-none"
                                    value={createForm.targetQuantity}
                                    onChange={e => setCreateForm({...createForm, targetQuantity: e.target.value})}
                                    required
                                    min="1"
                                />
                            </div>
                            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition-colors">
                                確認建立
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Modal 2: 從歷史載入 --- */}
            {showCopyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">從歷史日期載入</h3>
                            <button onClick={() => setShowCopyModal(false)}><X size={20} className="text-slate-400 hover:text-black" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-slate-600">選擇來源日期</label>
                                <input 
                                    type="date" 
                                    className="w-full border rounded p-2 bg-slate-50"
                                    value={copySourceDate}
                                    onChange={e => setCopySourceDate(e.target.value)}
                                    max={getTodayString()} // 通常是從過去載入
                                />
                                <p className="text-xs text-slate-400 mt-2">
                                    注意：這將會把所選日期的所有工序複製一份到當前日期 ({selectedDate})。
                                </p>
                            </div>
                            <button 
                                onClick={handleCopySchedule}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center"
                            >
                                {loading ? '載入中...' : '確認載入'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modal 3: 修改狀態 --- */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">編輯工序</h3>
                            <button onClick={() => setShowEditModal(false)}><X size={20} className="text-slate-400 hover:text-black" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">狀態</label>
                                <select 
                                    className="w-full border rounded p-2 bg-white"
                                    value={editForm.status}
                                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                                >
                                    <option value="PENDING">PENDING (等待中)</option>
                                    <option value="IN_PRODUCTION">IN_PRODUCTION (生產中)</option>
                                    <option value="COMPLETED">COMPLETED (已完成)</option>
                                    {canStop && <option value="STOPPED">STOPPED (強制停止)</option>}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">預計總量</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-2"
                                        value={editForm.targetQuantity}
                                        onChange={e => setEditForm({...editForm, targetQuantity: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">剩餘數量</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-2"
                                        value={editForm.producedQuantity}
                                        onChange={e => setEditForm({...editForm, producedQuantity: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800">
                                提示：修改「預計總量」會自動調整剩餘量。若需手動修正誤差，請直接修改「剩餘數量」。
                            </div>

                            <button 
                                onClick={handleEditSubmit}
                                className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700"
                            >
                                儲存變更
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        PENDING: 'bg-gray-100 text-gray-600',
        IN_PRODUCTION: 'bg-blue-100 text-blue-800',
        COMPLETED: 'bg-green-100 text-green-800',
        STOPPED: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${styles[status] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
}
