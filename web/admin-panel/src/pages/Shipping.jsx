// src/pages/Shipping.jsx
import { Truck, FileText } from 'lucide-react';

export default function Shipping() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">出貨管理 (Loading)</h1>
            
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="border-b p-4 flex gap-4">
                    <button className="text-blue-600 font-bold border-b-2 border-blue-600 pb-2">出貨排程</button>
                    <button className="text-slate-500 hover:text-slate-700 pb-2">歷史記錄</button>
                </div>
                <div className="h-96 flex items-center justify-center text-slate-400">
                    [出貨路線列表 - 顯示車號、司機、預計出貨量、狀態]
                </div>
            </div>
        </div>
    );
}
