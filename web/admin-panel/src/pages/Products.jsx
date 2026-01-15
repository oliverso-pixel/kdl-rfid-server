// src/pages/Products.jsx
import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Search, Edit, Trash2, Image as ImageIcon, X, Upload } from 'lucide-react';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    
    // API Base URL 用於顯示圖片
    // 注意：這裡假設您的 api.js 中 baseURL 是 'http://IP:8000/api/v1'
    // 圖片路徑是 '/static/...', 所以我們要去掉 '/api/v1'
    const IMAGE_BASE_URL = api.defaults.baseURL.replace('/api/v1', '');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [uploading, setUploading] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/products/', { params: { search: search || undefined } });
            setProducts(res.data.items);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProducts(); }, []);

    // 處理圖片上傳
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await api.post('/products/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // 上傳成功，將 URL 填入表單
            setFormData(prev => ({ ...prev, imageUrl: res.data.url }));
        } catch (error) {
            alert("圖片上傳失敗");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/products/${formData.pid}`, formData);
                alert("更新成功");
            } else {
                await api.post('/products/', formData);
                alert("新增成功");
            }
            setShowModal(false);
            fetchProducts();
        } catch (error) {
            alert("操作失敗: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleOpenCreate = () => {
        setFormData({ 
            itemcode: '', name: '', barcodeId: '', qrcodeId: '',
            div: 10,
            maxBasketCapacity: 50, shelflife: 365, is_active: true, imageUrl: ''
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const handleOpenEdit = (prod) => {
        setFormData({ ...prod });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (pid) => {
        if(confirm("確定要停用此產品嗎？")) {
            await api.delete(`/products/${pid}`);
            fetchProducts();
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">產品管理</h1>
                <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700">
                    <Plus size={18} className="mr-2" /> 新增產品
                </button>
            </div>

            {/* 搜尋 */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
                <div className="flex items-center bg-slate-50 px-3 py-2 rounded border max-w-md">
                    <Search size={18} className="text-slate-400 mr-2" />
                    <input 
                        type="text" 
                        placeholder="搜尋產品名稱或代號..." 
                        className="bg-transparent outline-none w-full text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchProducts()}
                    />
                </div>
            </div>

            {/* 產品列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(prod => (
                    <div key={prod.pid} className={`bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col ${!prod.is_active ? 'opacity-60 grayscale' : ''}`}>
                        <div className="h-48 bg-slate-100 relative">
                            {prod.imageUrl ? (
                                <img 
                                    src={`${IMAGE_BASE_URL}${prod.imageUrl}`} 
                                    alt={prod.name} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <ImageIcon size={48} />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1">
                                <button onClick={() => handleOpenEdit(prod)} className="p-2 bg-white/90 rounded-full shadow hover:text-blue-600">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(prod.pid)} className="p-2 bg-white/90 rounded-full shadow hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-4 flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{prod.name}</h3>
                                {!prod.is_active && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">已停用</span>}
                            </div>
                            <p className="text-sm text-slate-500 mb-4 font-mono">{prod.itemcode}</p>
                            
                            <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-600">
                                <div>籃子容量: {prod.maxBasketCapacity}</div>
                                <div>保存期限: {prod.shelflife}天</div>
                                <div className="col-span-2 truncate">Barcode: {prod.barcodeId || '-'}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 編輯 Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold">{isEditing ? '編輯產品' : '新增產品'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={24} className="text-slate-400 hover:text-black" /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* 圖片上傳區 */}
                            <div className="flex gap-6">
                                <div className="w-32 h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group">
                                    {formData.imageUrl ? (
                                        <img src={`${IMAGE_BASE_URL}${formData.imageUrl}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="text-slate-400" size={32} />
                                    )}
                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                        <Upload size={24} />
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                    {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-xs">上傳中...</div>}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">產品名稱</label>
                                        <input required type="text" className="w-full border rounded p-2" 
                                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">產品代號 (Item Code)</label>
                                        <input required type="text" className="w-full border rounded p-2" 
                                            value={formData.itemcode} onChange={e => setFormData({...formData, itemcode: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Barcode ID</label>
                                    <input type="text" className="w-full border rounded p-2" 
                                        value={formData.barcodeId} onChange={e => setFormData({...formData, barcodeId: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">QR Code ID</label>
                                    <input type="text" className="w-full border rounded p-2" 
                                        value={formData.qrcodeId} onChange={e => setFormData({...formData, qrcodeId: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Div</label>
                                    <select className="w-full border rounded p-2 bg-white" value={formData.div} onChange={e => setFormData({...formData, div: parseInt(e.target.value)})}>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">最大籃子容量</label>
                                    <input type="number" className="w-full border rounded p-2" 
                                        value={formData.maxBasketCapacity} onChange={e => setFormData({...formData, maxBasketCapacity: parseInt(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">保存期限 (天)</label>
                                    <input type="number" className="w-full border rounded p-2" 
                                        value={formData.shelflife} onChange={e => setFormData({...formData, shelflife: parseInt(e.target.value)})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">描述</label>
                                <textarea className="w-full border rounded p-2" rows="3"
                                    value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="prod_active" 
                                    checked={formData.is_active} 
                                    onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                                <label htmlFor="prod_active" className="text-sm">啟用此產品</label>
                            </div>

                            <div className="pt-4 border-t flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">取消</button>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold">
                                    {isEditing ? '儲存變更' : '建立產品'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
