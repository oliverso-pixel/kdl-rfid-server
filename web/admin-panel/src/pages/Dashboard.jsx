// src/pages/Dashboard.jsx
import { Activity, Package, Truck, AlertCircle } from 'lucide-react';

export default function Dashboard() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">儀表板</h1>
            
            {/* 統計卡片區 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="今日生產" value="1,250" icon={<Activity />} color="bg-blue-500" />
                <StatCard title="庫存總數" value="15,400" icon={<Package />} color="bg-green-500" />
                <StatCard title="今日出貨" value="850" icon={<Truck />} color="bg-orange-500" />
                <StatCard title="異常警報" value="3" icon={<AlertCircle />} color="bg-red-500" />
            </div>

            {/* 這裡可以放圖表或近期活動 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border h-64 flex items-center justify-center text-slate-400">
                    [生產趨勢圖表佔位]
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border h-64 flex items-center justify-center text-slate-400">
                    [近期活動列表佔位]
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center">
            <div className={`p-4 rounded-full ${color} text-white mr-4`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            </div>
        </div>
    );
}
