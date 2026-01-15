// src/pages/Baskets.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import { Package, Search, Calendar, ChevronLeft, ChevronRight, X, Clock, Edit, Save, AlertCircle } from 'lucide-react';

export default function Baskets() {
    const getTodayString = () => new Date().toISOString().split('T')[0];
    
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState(getTodayString());
    const [endDate, setEndDate] = useState(getTodayString());
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [baskets, setBaskets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // 分頁狀態
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    const [selectedBasket, setSelectedBasket] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'history'
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const permissions = user.permissions || [];

    const canEdit = permissions.includes('*') || permissions.includes('basket:update');

    console.log(user);
    console.log(permissions);
    console.log(canEdit);

    const fetchBaskets = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: pageSize,
                search: search || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                status: statusFilter === "ALL" ? undefined : statusFilter
            };

            const res = await api.get('/baskets/', { params });
            setBaskets(res.data.items);
            setTotal(res.data.total);
            setHasSearched(true);
        } catch (error) {
            console.error("Failed to fetch baskets", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (rfid) => {
        setLoadingHistory(true);
        try {
            const res = await api.get(`/baskets/${rfid}/history`);
            setHistoryData(res.data);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleUpdateBasket = async () => {
        try {
            await api.put(`/baskets/${selectedBasket.rfid}`, {
                status: editForm.status,
                quantity: parseInt(editForm.quantity),
                warehouseId: editForm.warehouseId
            });
            
            // 更新成功後，刷新列表與當前選中資料
            alert("更新成功！");
            setIsEditing(false);
            fetchBaskets(); // 刷新列表
            setSelectedBasket({ ...selectedBasket, ...editForm }); // 更新 Modal 顯示
        } catch (error) {
            alert("更新失敗：" + (error.response?.data?.detail || error.message));
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchBaskets();
    };

    useEffect(() => {
        if (hasSearched) fetchBaskets();
    }, [page]);

    const openDetail = (basket) => {
        setSelectedBasket(basket);
        setEditForm({
            status: basket.status,
            quantity: basket.quantity,
            warehouseId: basket.warehouseId
        });
        setIsEditing(false);
        setActiveTab('info');
        setHistoryData([]); // 清空舊歷史
        setShowModal(true);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'history' && historyData.length === 0) {
            fetchHistory(selectedBasket.rfid);
        }
    };

    // const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 relative">
            <h1 className="text-2xl font-bold mb-6 flex items-center text-slate-800">
                <Package className="mr-2" /> 籃子庫存管理
            </h1>
            
            {/* 搜尋區塊 */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-slate-200">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-slate-500 mb-1">關鍵字</label>
                        <div className="flex items-center border rounded px-2 bg-slate-50 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                            <Search size={18} className="text-slate-400 mr-2" />
                            <input 
                                type="text" 
                                className="bg-transparent py-2 outline-none w-full text-sm"
                                placeholder="RFID 或 產品名稱..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">開始日期</label>
                        <input 
                            type="date" 
                            max={getTodayString()} // 禁止選未來
                            className="border rounded px-3 py-2 bg-slate-50 text-sm outline-none focus:border-blue-500"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">結束日期</label>
                        <input 
                            type="date" 
                            max={getTodayString()} // 禁止選未來
                            className="border rounded px-3 py-2 bg-slate-50 text-sm outline-none focus:border-blue-500"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">狀態</label>
                        <select 
                            className="border rounded px-3 py-2 bg-slate-50 text-sm outline-none focus:border-blue-500"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">全部狀態</option>
                            <option value="IN_PRODUCTION">生產中</option>
                            <option value="WAREHOUSE">在庫</option>
                            <option value="SHIPPED">已出貨</option>
                            <option value="UNASSIGNED">未配置</option>
                        </select>
                    </div>

                    <button 
                        onClick={handleSearch}
                        className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        查詢
                    </button>
                </div>
            </div>

            {/* 資料列表 */}
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden min-h-[400px]">
                {!hasSearched ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p>請輸入條件並點擊查詢</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-3 font-medium">RFID</th>
                                        <th className="p-3 font-medium">產品資訊</th>
                                        <th className="p-3 font-medium">狀態</th>
                                        <th className="p-3 font-medium">數量</th>
                                        <th className="p-3 font-medium">位置</th>
                                        <th className="p-3 font-medium">最後更新</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="6" className="p-8 text-center text-slate-500">載入中...</td></tr>
                                    ) : baskets.length === 0 ? (
                                        <tr><td colSpan="6" className="p-8 text-center text-slate-500">查無資料</td></tr>
                                    ) : (
                                        baskets.map((basket) => (
                                            <tr 
                                                key={basket.bid} 
                                                onClick={() => openDetail(basket)}
                                                className="hover:bg-blue-50 cursor-pointer transition-colors"
                                            >
                                                <td className="p-3 font-mono text-blue-600 font-medium">{basket.rfid}</td>
                                                <td className="p-3">
                                                    {basket.product ? JSON.parse(basket.product).name : '-'}
                                                    {basket.batch && <div className="text-xs text-slate-400">{JSON.parse(basket.batch).id}</div>}
                                                </td>
                                                <td className="p-3">
                                                    <StatusBadge status={basket.status} />
                                                </td>
                                                <td className="p-3">{basket.quantity}</td>
                                                <td className="p-3">{basket.warehouseId || '-'}</td>
                                                <td className="p-3 text-slate-500">
                                                    {new Date(basket.lastUpdated).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* 分頁器 (略，同前一版) */}
                        <Pagination 
                            page={page} 
                            total={total} 
                            pageSize={pageSize} 
                            onChange={setPage} 
                        />
                    </>
                )}
            </div>

            {/* --- 詳情 Modal --- */}
            {showModal && selectedBasket && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">籃子詳情</h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">{selectedBasket.rfid}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex border-b">
                            <button 
                                onClick={() => handleTabChange('info')}
                                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                基本資訊
                            </button>
                            <button 
                                onClick={() => handleTabChange('history')}
                                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                歷史記錄
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {activeTab === 'info' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoItem label="產品" value={selectedBasket.product ? JSON.parse(selectedBasket.product).name : '無'} />
                                        <InfoItem label="批次" value={selectedBasket.batch ? JSON.parse(selectedBasket.batch).id : '無'} />
                                        <InfoItem label="最後更新者" value={selectedBasket.updateBy || 'System'} />
                                        <InfoItem label="更新時間" value={new Date(selectedBasket.lastUpdated).toLocaleString()} />
                                    </div>

                                    {/* 編輯區塊 (權限控制) */}
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-slate-700">庫存狀態</h4>
                                            {canEdit && !isEditing && (
                                                <button 
                                                    onClick={() => setIsEditing(true)}
                                                    className="flex items-center text-blue-600 text-sm hover:underline"
                                                >
                                                    <Edit size={14} className="mr-1" /> 修改資料
                                                </button>
                                            )}
                                        </div>

                                        {isEditing ? (
                                            <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-100">
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-800 mb-1">狀態</label>
                                                    <select 
                                                        className="w-full border rounded p-2 text-sm bg-white"
                                                        value={editForm.status}
                                                        onChange={e => setEditForm({...editForm, status: e.target.value})}
                                                    >
                                                        <option value="IN_PRODUCTION">生產中</option>
                                                        <option value="WAREHOUSE">在庫</option>
                                                        <option value="SHIPPED">已出貨</option>
                                                        <option value="UNASSIGNED">未配置</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-800 mb-1">數量</label>
                                                    <input 
                                                        type="number" 
                                                        className="w-full border rounded p-2 text-sm"
                                                        value={editForm.quantity}
                                                        onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-800 mb-1">倉庫位置</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full border rounded p-2 text-sm"
                                                        value={editForm.warehouseId}
                                                        onChange={e => setEditForm({...editForm, warehouseId: e.target.value})}
                                                    />
                                                </div>
                                                <div className="flex gap-2 justify-end mt-2">
                                                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm text-slate-500 hover:bg-slate-200 rounded">取消</button>
                                                    <button onClick={handleUpdateBasket} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center">
                                                        <Save size={14} className="mr-1" /> 儲存
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <InfoItem label="目前狀態" value={<StatusBadge status={selectedBasket.status} />} />
                                                <InfoItem label="數量" value={selectedBasket.quantity} />
                                                <InfoItem label="倉庫位置" value={selectedBasket.warehouseId || '未指定'} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // --- 歷史記錄頁籤 ---
                                <div className="space-y-4">
                                    {loadingHistory ? (
                                        <div className="text-center text-slate-500 py-8">載入歷史記錄中...</div>
                                    ) : historyData.length === 0 ? (
                                        <div className="text-center text-slate-400 py-8">沒有歷史記錄</div>
                                    ) : (
                                        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
                                            {historyData.map((log, idx) => (
                                                <div key={idx} className="relative pl-6">
                                                    {/* 時間軸圓點 */}
                                                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-blue-400 rounded-full"></div>
                                                    
                                                    <div className="text-xs text-slate-400 mb-1 flex items-center">
                                                        <Clock size={12} className="mr-1" />
                                                        {new Date(log.lastUpdated).toLocaleString()} 
                                                        <span className="ml-2 text-slate-300">by {log.updateBy || 'Unknown'}</span>
                                                    </div>
                                                    
                                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 shadow-sm text-sm">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="font-bold text-slate-700">{log.status}</span>
                                                            <span className="text-slate-600">數量: {log.quantity}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            位置: {log.warehouseId || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoItem({ label, value }) {
    return (
        <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">{label}</div>
            <div className="text-sm font-medium text-slate-800 mt-1">{value}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const colors = {
        IN_PRODUCTION: 'bg-yellow-100 text-yellow-800',
        SHIPPED: 'bg-green-100 text-green-800',
        WAREHOUSE: 'bg-blue-100 text-blue-800',
        UNASSIGNED: 'bg-gray-100 text-gray-800'
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
}

function Pagination({ page, total, pageSize, onChange }) {
    const totalPages = Math.ceil(total / pageSize);
    if (total === 0) return null;

    return (
        <div className="p-4 bg-slate-50 border-t flex justify-between items-center text-xs text-slate-500">
            <span>
                顯示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 筆，共 {total} 筆
            </span>
            <div className="flex items-center gap-2">
                <button 
                    disabled={page === 1}
                    onClick={() => onChange(p => p - 1)}
                    className="p-1 border rounded hover:bg-white disabled:opacity-50"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="font-medium text-slate-700">Page {page} / {totalPages}</span>
                <button 
                    disabled={page >= totalPages}
                    onClick={() => onChange(p => p + 1)}
                    className="p-1 border rounded hover:bg-white disabled:opacity-50"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
