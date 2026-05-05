// src/pages/InventoryHistory.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import { ClipboardList, Download, Calendar, Info, X, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function InventoryHistory() {
    // 獲取今天日期的 YYYY-MM-DD 格式（考慮本地時區）
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // 1. 將預設搜尋日期設為今天
    const [searchDate, setSearchDate] = useState(getTodayString()); 

    // 預覽報告相關狀態
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [reportTab, setReportTab] = useState('missing'); // 'missing', 'extra', 'matched'

    useEffect(() => {
        fetchSessions();
    }, [searchDate]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const params = searchDate ? { search_date: searchDate } : {};
            const res = await api.get('/inventory/sessions', { params });
            setSessions(res.data);
        } catch (error) {
            console.error("無法獲取盤點紀錄", error);
        } finally {
            setLoading(false);
        }
    };

    // 輔助函數：解析 JSON 格式的產品與批次
    const parseData = (jsonString, keyToExtract) => {
        if (!jsonString) return '-';
        try {
            const parsed = JSON.parse(jsonString);
            return parsed[keyToExtract] || jsonString;
        } catch (e) {
            return jsonString;
        }
    };

    // 2. 獲取並在畫面上顯示單次盤點報告
    const viewReport = async (sessionId) => {
        setShowReportModal(true);
        setReportLoading(true);
        setSelectedReport(null);
        try {
            const res = await api.get(`/inventory/sessions/${sessionId}/report`);
            setSelectedReport(res.data);
            
            // 自動切換到有問題的標籤頁
            if (res.data.missing && res.data.missing.length > 0) {
                setReportTab('missing');
            } else if (res.data.extra && res.data.extra.length > 0) {
                setReportTab('extra');
            } else {
                setReportTab('matched');
            }
        } catch (error) {
            alert("無法獲取報告明細資料");
            setShowReportModal(false);
        } finally {
            setReportLoading(false);
        }
    };

    // 下載單次盤點的 In/Out 報告 Excel
    const downloadReport = async (sessionId, warehouseId) => {
        try {
            const res = await api.get(`/inventory/sessions/${sessionId}/report`);
            const { matched, missing, extra } = res.data;

            const matchedList = matched || [];
            const missingList = missing || [];
            const extraList = extra || [];

            const workbook = XLSX.utils.book_new();

            const formatForExcel = (b, statusStr) => ({
                'RFID': b.rfid,
                'Tag Code': b.tag_code || '-',
                '貨物種類': parseData(b.product, 'name'),
                '批次 (Batch)': parseData(b.batch, 'id') || parseData(b.batch, 'batch_code'),
                '數量': b.quantity || 0,
                '系統狀態': statusStr
            });

            const wsMissing = XLSX.utils.json_to_sheet(missingList.map(b => formatForExcel(b, '遺失/未掃到')));
            XLSX.utils.book_append_sheet(workbook, wsMissing, "盤虧清單(Out)");

            const wsExtra = XLSX.utils.json_to_sheet(extraList.map(b => formatForExcel(b, '異常移入')));
            XLSX.utils.book_append_sheet(workbook, wsExtra, "盤盈清單(In)");

            const wsMatch = XLSX.utils.json_to_sheet(matchedList.map(b => formatForExcel(b, '準確')));
            XLSX.utils.book_append_sheet(workbook, wsMatch, "準確清單");

            XLSX.writeFile(workbook, `Inventory_Report_${warehouseId}_S${sessionId}.xlsx`);
        } catch (error) {
            console.error("下載 Excel 時發生錯誤:", error);
            alert("生成報告失敗或該紀錄無明細數據");
        }
    };

    // 渲染報告的表格內容
    const renderReportTable = (dataList) => {
        if (!dataList || dataList.length === 0) {
            return <div className="p-8 text-center text-slate-500">此分類下無資料</div>;
        }
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                    <thead className="bg-slate-50 border-b text-slate-600 font-bold">
                        <tr>
                            <th className="p-3">RFID</th>
                            <th className="p-3">Tag Code</th>
                            <th className="p-3">產品資訊</th>
                            <th className="p-3">數量</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {dataList.map((b, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-blue-600">{b.rfid}</td>
                                <td className="p-3 text-slate-500">{b.tag_code || '-'}</td>
                                <td className="p-3">
                                    <div className="font-bold text-slate-700">{parseData(b.product, 'name')}</div>
                                    <div className="text-xs text-slate-400">批次: {parseData(b.batch, 'id') || parseData(b.batch, 'batch_code')}</div>
                                </td>
                                <td className="p-3">{b.quantity || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-6 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <ClipboardList className="mr-2 text-blue-600" /> 盤點紀錄查詢
                </h1>
                
                {/* 搜尋區塊 */}
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                    <Calendar size={18} className="text-slate-400 mr-2" />
                    <input 
                        type="date" 
                        className="bg-transparent outline-none text-sm text-slate-700 w-full"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                    />
                    {searchDate && (
                        <button onClick={() => setSearchDate("")} className="ml-2 text-slate-400 hover:text-red-500 transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* 紀錄列表 */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4">盤點時間</th>
                                <th className="p-4">倉庫</th>
                                <th className="p-4">盤點人員</th>
                                <th className="p-4">應有 / 實測</th>
                                <th className="p-4">結果 (盈 / 虧)</th>
                                <th className="p-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y">
                            {loading ? (
                                <tr><td colSpan="6" className="p-10 text-center text-slate-500">載入中...</td></tr>
                            ) : sessions.length === 0 ? (
                                <tr><td colSpan="6" className="p-10 text-center text-slate-500">該日期無盤點紀錄</td></tr>
                            ) : sessions.map(s => (
                                <tr key={s.session_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium">{new Date(s.start_time).toLocaleDateString()}</div>
                                        <div className="text-xs text-slate-400">{new Date(s.start_time).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">{s.warehouse_id}</td>
                                    <td className="p-4 text-slate-600">
                                        <span className="font-semibold text-slate-800">{s.username}</span> 
                                        <span className="text-xs text-slate-400 ml-1">({s.user_id})</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-slate-400">{s.total_expected}</span> / <span className="font-bold">{s.total_scanned}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-green-600 font-bold">+{s.extra_count}</span> / 
                                        <span className="text-red-600 font-bold ml-1">-{s.missing_count}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => viewReport(s.session_id)}
                                                className="inline-flex items-center text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md border border-slate-200 transition-colors whitespace-nowrap"
                                                title="在網頁預覽報告"
                                            >
                                                <Eye size={16} className="mr-1" /> 查看
                                            </button>
                                            <button 
                                                onClick={() => downloadReport(s.session_id, s.warehouse_id)}
                                                className="inline-flex items-center text-slate-600 hover:text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-md border border-slate-200 transition-colors whitespace-nowrap"
                                                title="下載 Excel"
                                            >
                                                <Download size={16} className="mr-1" /> 匯出
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 報告預覽 Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center">
                                <ClipboardList className="mr-2 text-blue-600" />
                                盤點報告明細
                            </h3>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {reportLoading ? (
                            <div className="p-20 text-center text-slate-500">報告載入中...</div>
                        ) : selectedReport ? (
                            <div className="flex flex-col flex-1 overflow-hidden">
                                {/* Tabs 區域 */}
                                <div className="flex border-b bg-slate-50">
                                    <button 
                                        onClick={() => setReportTab('missing')} 
                                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${reportTab === 'missing' ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        <AlertTriangle size={16} /> 盤虧 / 遺失 ({(selectedReport.missing || []).length})
                                    </button>
                                    <button 
                                        onClick={() => setReportTab('extra')} 
                                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${reportTab === 'extra' ? 'text-orange-500 border-b-2 border-orange-500 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        <AlertTriangle size={16} /> 盤盈 / 異常移入 ({(selectedReport.extra || []).length})
                                    </button>
                                    <button 
                                        onClick={() => setReportTab('matched')} 
                                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${reportTab === 'matched' ? 'text-green-600 border-b-2 border-green-600 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        <CheckCircle size={16} /> 準確 ({(selectedReport.matched || []).length})
                                    </button>
                                </div>

                                {/* 內容列表區域 */}
                                <div className="flex-1 overflow-auto p-2">
                                    {reportTab === 'missing' && renderReportTable(selectedReport.missing)}
                                    {reportTab === 'extra' && renderReportTable(selectedReport.extra)}
                                    {reportTab === 'matched' && renderReportTable(selectedReport.matched)}
                                </div>
                            </div>
                        ) : (
                            <div className="p-20 text-center text-slate-500">無法獲取數據</div>
                        )}
                        
                        <div className="p-4 border-t flex justify-end bg-slate-50 rounded-b-xl">
                            <button 
                                onClick={() => setShowReportModal(false)}
                                className="px-6 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-bold transition-colors"
                            >
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}