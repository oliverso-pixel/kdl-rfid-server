// src/pages/Production.jsx
import { Calendar, Plus } from 'lucide-react';

export default function Production() {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">生產管理 (批次)</h1>
                <button className="bg-green-600 text-white px-4 py-2 rounded flex items-center hover:bg-green-700">
                    <Plus size={18} className="mr-2" /> 建立生產批次
                </button>
            </div>

            {/* 過濾器範例 */}
            <div className="flex gap-4 mb-4">
                <div className="bg-white border rounded px-3 py-2 flex items-center text-sm text-slate-600">
                    <Calendar size={16} className="mr-2" /> 2024-01-01 ~ 2024-01-31
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border h-96 flex items-center justify-center text-slate-400">
                [生產批次列表 - 顯示批號、產品、預計產量、狀態]
            </div>
        </div>
    );
}
