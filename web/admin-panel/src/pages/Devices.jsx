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
            
            {/* 修改這裡：確保 gap 足夠，並且在不同螢幕尺寸正確換行 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {devices.map((device) => (
                    <div key={device.did} className={`border p-4 rounded-lg shadow-sm flex flex-col justify-between h-full ${device.status === 'ONLINE' ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        
                        {/* 上半部：標題與狀態標籤 */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="overflow-hidden"> {/* 防止文字過長撐開 */}
                                <h3 className="font-bold text-lg truncate" title={device.name}>{device.name || 'Unknown Device'}</h3>
                                <p className="text-sm text-gray-500">{device.model} (Android {device.os_version})</p>
                                <p className="text-xs text-gray-400 mt-1 truncate" title={device.device_id}>ID: {device.device_id}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ml-2 ${device.status === 'ONLINE' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                {device.status}
                            </span>
                        </div>

                        {/* 下半部：資訊與使用者 (新增 currentUser 顯示) */}
                        <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                            {/* 顯示當前使用者 (如果有的話) */}
                            {device.currentUser ? (
                                <div className="flex items-center text-blue-700 font-bold mb-2 bg-blue-100 p-1 rounded px-2 w-fit">
                                    <User size={14} className="mr-1" /> 
                                    使用者: {device.currentUser}
                                </div>
                            ) : (
                                <div className="text-gray-400 mb-2 italic">閒置中</div>
                            )}

                            <div className="flex items-center">
                                <Activity size={16} className="mr-1" />
                                最後活躍: {new Date(device.last_active).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                IP: {device.ip_address} | App: v{device.app_version}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}