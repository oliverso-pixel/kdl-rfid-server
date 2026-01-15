// src/pages/Products.jsx
import { Plus, Filter } from 'lucide-react';

export default function Products() {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">產品管理</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700">
                    <Plus size={18} className="mr-2" /> 新增產品
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border h-96 flex items-center justify-center text-slate-400">
                [產品資料表格區域 - 支援圖片預覽]
            </div>
        </div>
    );
}
