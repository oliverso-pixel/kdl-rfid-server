// src/pages/InventoryHistory.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import { ClipboardList, Download, Search, Calendar, FileText, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function InventoryHistory() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [warehouseFilter, setWarehouseFilter] = useState("");

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            // 假設後端有 GET /inventory/sessions 這個 endpoint
            const res = await api.get('/inventory/sessions');
            setSessions(res.data);
        } catch (error) {
            console.error("無法獲取盤點紀錄", error);
        } finally {
            setLoading(false);
        }
    };

    // 下載單次盤點的 In/Out 報告
    const downloadReport = async (sessionId) => {
        try {
            // 獲取該 session 的詳細報告內容
            const res = await api.get(`/inventory/sessions/${sessionId}/report`);
            const { warehouse_id, matched_baskets, missing_baskets, extra_baskets } = res.data;

            const workbook = XLSX.utils.book_new();

            // 1. 盤虧表 (Missing/Out) - 應該在但沒掃到
            const missingData = missing_baskets.map(b => ({
                'RFID': b.rfid,
                'Tag Code': b.tag_code,
                '產品': b.product,
                '預期數量': b.quantity,
                '狀態': '遺失/已移走'
            }));
            const wsMissing = XLSX.utils.json_to_sheet(missingData);
            XLSX.utils.book_append_sheet(workbook, wsMissing, "盤虧清單(Out)");

            // 2. 盤盈表 (Extra/In) - 不該在但掃到了
            const extraData = extra_baskets.map(b => ({
                'RFID': b.rfid,
                'Tag Code': b.tag_code,
                '產品': b.product,
                '數量': b.quantity,
                '狀態': '異常移入'
            }));
            const wsExtra = XLSX.utils.json_to_sheet(extraData);
            XLSX.utils.book_append_sheet(workbook, wsExtra, "盤盈清單(In)");

            // 3. 正常表 (Match)
            const matchData = matched_baskets.map(b => ({
                'RFID': b.rfid,
                '產品': b.product,
                '數量': b.quantity
            }));
            const wsMatch = XLSX.utils.json_to_sheet(matchData);
            XLSX.utils.book_append_sheet(workbook, wsMatch, "準確清單");

            XLSX.writeFile(workbook, `Inventory_Report_${warehouse_id}_S${sessionId}.xlsx`);
        } catch (error) {
            alert("生成報告失敗");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <ClipboardList className="mr-2 text-blue-600" /> 盤點紀錄查詢
                </h1>
            </div>

            {/* 列表說明 */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex items-start">
                <Info className="text-blue-500 mr-3 mt-1" size={20} />
                <div className="text-sm text-blue-800">
                    <p className="font-bold">如何查看盤點結果？</p>
                    <ul className="list-disc ml-4 mt-1">
                        <li>下方列出了所有由移動端 (App) 提交的盤點作業。</li>
                        <li><strong>盤盈 (Extra)</strong>：指該倉庫原本沒有紀錄，但現場掃描到的籃子。</li>
                        <li><strong>盤虧 (Missing)</strong>：指系統紀錄應在該倉庫，但現場未掃描到的籃子。</li>
                        <li>點擊「下載報告」可導出 Excel 詳細清單進行核對。</li>
                    </ul>
                </div>
            </div>

            {/* 紀錄列表 */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">盤點時間</th>
                            <th className="p-4">倉庫</th>
                            <th className="p-4">盤點人員</th>
                            <th className="p-4">應有/實測</th>
                            <th className="p-4">結果 (盈/虧)</th>
                            <th className="p-4 text-center">報告</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y">
                        {loading ? (
                            <tr><td colSpan="6" className="p-10 text-center">載入中...</td></tr>
                        ) : sessions.map(s => (
                            <tr key={s.session_id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium">{new Date(s.start_time).toLocaleDateString()}</div>
                                    <div className="text-xs text-slate-400">{new Date(s.start_time).toLocaleTimeString()}</div>
                                </td>
                                <td className="p-4 font-bold text-slate-700">{s.warehouse_id}</td>
                                <td className="p-4 text-slate-600">{s.user_id}</td>
                                <td className="p-4">
                                    <span className="text-slate-400">{s.total_expected}</span> / <span className="font-bold">{s.total_scanned}</span>
                                </td>
                                <td className="p-4">
                                    <span className="text-green-600 font-bold">+{s.extra_count}</span> / 
                                    <span className="text-red-600 font-bold ml-1">-{s.missing_count}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => downloadReport(s.session_id)}
                                        className="inline-flex items-center text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md border border-blue-200 transition-colors"
                                    >
                                        <Download size={16} className="mr-1" /> 下載報告
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
