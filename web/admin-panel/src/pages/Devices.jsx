import { useEffect, useState } from 'react';
import api from '../api';
import { Smartphone, Activity, AlertCircle } from 'lucide-react';

export default function Devices() {
    const [devices, setDevices] = useState([]);

    const fetchDevices = async () => {
        try {
            // 需要您在 Python API 新增 GET /api/v1/devices/ 接口
            const res = await api.get('/devices/');
            setDevices(res.data);
        } catch (error) {
            console.error("Failed to fetch devices", error);
        }
    };

    useEffect(() => {
        fetchDevices();
        // 每 5 秒自動更新一次狀態
        const interval = setInterval(fetchDevices, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center">
                <Smartphone className="mr-2" /> 裝置管理
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => (
                    <div key={device.did} className={`border p-4 rounded-lg shadow-sm ${device.status === 'ONLINE' ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{device.name || 'Unknown Device'}</h3>
                                <p className="text-sm text-gray-500">{device.model} (Android {device.os_version})</p>
                                <p className="text-xs text-gray-400 mt-1">ID: {device.device_id}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${device.status === 'ONLINE' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                {device.status}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t text-sm flex items-center text-gray-600">
                            <Activity size={16} className="mr-1" />
                            最後活躍: {new Date(device.last_active).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            IP: {device.ip_address} | App: v{device.app_version}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}