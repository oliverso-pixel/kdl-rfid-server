// src/pages/Fleet.jsx
import { Truck, Users } from 'lucide-react';

export default function Fleet() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">車隊管理</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center">
                        <Truck className="mr-2" size={20} /> 車輛列表
                    </h2>
                    <div className="h-64 bg-slate-50 rounded flex items-center justify-center text-slate-400">
                        [車輛資料表格]
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center">
                        <Users className="mr-2" size={20} /> 司機列表
                    </h2>
                    <div className="h-64 bg-slate-50 rounded flex items-center justify-center text-slate-400">
                        [司機資料表格]
                    </div>
                </div>
            </div>
        </div>
    );
}
