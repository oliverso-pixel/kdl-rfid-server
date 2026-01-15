// src/pages/Warehouses.jsx
import { MapPin, Plus } from 'lucide-react';

export default function Warehouses() {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">倉庫管理</h1>
                <button className="bg-slate-800 text-white px-4 py-2 rounded flex items-center hover:bg-slate-700">
                    <Plus size={18} className="mr-2" /> 新增倉庫
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 倉庫卡片範例 */}
                <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <MapPin size={24} />
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">啟用中</span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">主倉庫 A</h3>
                    <p className="text-slate-500 text-sm mb-4">台北市內湖區...</p>
                    <div className="border-t pt-4 text-sm text-slate-600">
                        <p>容量使用率: 75%</p>
                    </div>
                </div>
                
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                    <Plus size={32} className="mb-2" />
                    <span>新增更多倉庫</span>
                </div>
            </div>
        </div>
    );
}
