// src/pages/BasketOperations.jsx
import { useState } from 'react';
import api from '../api';
import { Database, Upload, Download, Info, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function BasketOperations() {
    const getTodayString = () => new Date().toISOString().split('T')[0];

    // 上傳相關狀態
    const [uploadData, setUploadData] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // 匯出相關狀態
    const [exportStartDate, setExportStartDate] = useState(getTodayString());
    const [exportEndDate, setExportEndDate] = useState(getTodayString());
    const [exportStatus, setExportStatus] = useState("ALL");
    const [isExporting, setIsExporting] = useState(false);

    // 文字轉 16 進制 (Hex) 的輔助函數
    const stringToHex = (str) => {
        return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase();
    };

    // =========== 大量上傳邏輯 ===========
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                let items = [];
                // 處理 TXT 或 CSV
                if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
                    const text = evt.target.result;
                    const lines = text.split('\n');
                    let headers = [];
                    let startIdx = 0;
                    
                    if (lines[0].toLowerCase().includes('tag_code') || lines[0].toLowerCase().includes('rfid')) {
                        headers = lines[0].toLowerCase().split(/[,\t]/).map(s => s.trim().replace(/['"]/g, ''));
                        startIdx = 1;
                    }
                    
                    for (let i = startIdx; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        const cols = lines[i].split(/[,\t]/).map(s => s.trim().replace(/['"]/g, ''));
                        let item = { type: 1 };

                        if (headers.length > 0) {
                            headers.forEach((h, idx) => {
                                if (h === 'rfid') item.rfid = cols[idx];
                                if (h === 'tag_code') item.tag_code = cols[idx];
                                if (h === 'type' && cols[idx]) item.type = parseInt(cols[idx]);
                                if (h === 'description') item.description = cols[idx];
                            });
                        } else {
                            // 預設順序： 1.RFID 2.Tag Code 3.Type 4.Description
                            item.rfid = cols[0];
                            item.tag_code = cols[1];
                            item.type = parseInt(cols[2] || 1);
                            item.description = cols[3] || '';
                        }
                        items.push(item);
                    }
                } else {
                    // 處理 Excel (XLSX, XLS)
                    const bstr = evt.target.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws);
                    
                    items = data.map(row => {
                        const keys = Object.keys(row);
                        const getVal = (possibleKeys) => {
                            const key = keys.find(k => possibleKeys.includes(k.toLowerCase().trim()));
                            return key ? row[key] : null;
                        };
                        return {
                            rfid: getVal(['rfid']) || '',
                            tag_code: String(getVal(['tag_code', 'tag code', 'tagcode']) || ''),
                            type: parseInt(getVal(['type']) || 1),
                            description: String(getVal(['description', 'desc', '描述']) || '')
                        };
                    });
                }

                // 處理缺失的 RFID (將 tag_code 轉為 Hex)
                const processedItems = items.map((item, index) => {
                    if (!item.rfid) {
                        if (!item.tag_code) {
                            throw new Error(`第 ${index + 1} 行資料錯誤：RFID 與 Tag Code 不能同時為空白！`);
                        }
                        item.rfid = stringToHex(item.tag_code);
                    }
                    return item;
                }).filter(item => item.rfid);

                setUploadData(processedItems);
                setShowUploadModal(true);
            } catch (err) {
                alert('檔案解析失敗: ' + err.message);
            }
        };
        
        if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
        e.target.value = null;
    };

    const handleConfirmUpload = async () => {
        setIsUploading(true);
        try {
            const res = await api.post('/baskets/bulk', { items: uploadData });
            const results = res.data.results;
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;
            
            alert(`上傳完成！\n成功: ${successCount} 筆\n失敗/重複: ${failCount} 筆`);
            setShowUploadModal(false);
            setUploadData([]);
        } catch (error) {
            alert("上傳失敗: " + (error.response?.data?.detail || error.message));
        } finally {
            setIsUploading(false);
        }
    };

    // =========== 匯出資料邏輯 ===========
    const handleExport = async () => {
        setIsExporting(true);
        try {
            const params = {
                page: 1,
                page_size: 100000, // 抓取大量資料以匯出
                start_date: exportStartDate ? `${exportStartDate} 00:00:00` : undefined,
                end_date: exportEndDate ? `${exportEndDate} 23:59:59` : undefined,
                status: exportStatus === "ALL" ? undefined : exportStatus
            };

            const res = await api.get('/baskets/', { params });
            const items = res.data.items;

            if (items.length === 0) {
                alert("該範圍內無資料可匯出！");
                setIsExporting(false);
                return;
            }

            // 整理匯出的欄位
            const exportData = items.map(b => ({
                'RFID': b.rfid,
                'Tag Code': b.tag_code || '',
                'Type': b.type || 1,
                '產品代號': b.product ? JSON.parse(b.product).itemcode : '',
                '產品名稱': b.product ? JSON.parse(b.product).name : '',
                '批次': b.batch ? JSON.parse(b.batch).id : '',
                '數量': b.quantity,
                '狀態': b.status,
                '倉庫位置': b.warehouseId || '',
                '更新者': b.updateBy || '',
                '最後更新時間': new Date(b.lastUpdated).toLocaleString()
            }));

            // 產出 Excel
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Baskets");
            XLSX.writeFile(workbook, `Baskets_Export_${getTodayString()}.xlsx`);

        } catch (error) {
            alert("匯出失敗：" + (error.response?.data?.detail || error.message));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold flex items-center text-slate-800 mb-6">
                <Database className="mr-2" /> 籃子資料操作
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左側：大量新增卡片 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center text-lg font-bold text-green-700 mb-4">
                        <Upload className="mr-2" /> 大量新增籃子
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-600 mb-6">
                        <h4 className="font-bold mb-2 flex items-center"><Info size={16} className="mr-1"/> 操作說明</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>支援檔案格式：<strong>.xlsx, .xls, .csv, .txt</strong></li>
                            <li>需包含的標題列（不分大小寫）：<code>rfid, tag_code, type, description</code></li>
                            <li><strong>自動轉換機制：</strong>如果 <code>rfid</code> 為空白，系統會自動將 <code>tag_code</code> 的文字轉換為 16 進制並填入 RFID 欄位。</li>
                            <li><code>tag_code</code> 若需觸發轉換，則不可為空白。</li>
                        </ul>
                    </div>

                    <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        accept=".txt,.csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                    />
                    <label 
                        htmlFor="file-upload"
                        className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center"
                    >
                        <Upload size={18} className="mr-2" /> 選擇檔案上傳
                    </label>
                </div>

                {/* 右側：匯出資料卡片 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center text-lg font-bold text-blue-700 mb-4">
                        <Download className="mr-2" /> 匯出籃子數據
                    </div>

                    <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-600 mb-6">
                        <h4 className="font-bold mb-2 flex items-center"><Info size={16} className="mr-1"/> 操作說明</h4>
                        <p>設定過濾條件後，系統會將符合條件的所有籃子資料打包為 <strong>Excel (.xlsx)</strong> 檔案並自動下載。匯出包含產品與批次的詳細內容。</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">開始日期</label>
                            <input type="date" max={getTodayString()} value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full border rounded px-3 py-2 bg-slate-50 outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">結束日期</label>
                            <input type="date" max={getTodayString()} value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full border rounded px-3 py-2 bg-slate-50 outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">狀態</label>
                            <select value={exportStatus} onChange={e => setExportStatus(e.target.value)} className="w-full border rounded px-3 py-2 bg-slate-50 outline-none focus:border-blue-500">
                                <option value="ALL">全部狀態</option>
                                <option value="IN_PRODUCTION">生產中</option>
                                <option value="WAREHOUSE">在庫</option>
                                <option value="SHIPPED">已出貨</option>
                                <option value="UNASSIGNED">未配置</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center disabled:bg-blue-300"
                    >
                        {isExporting ? '處理中...' : <><Download size={18} className="mr-2" /> 匯出為 Excel</>}
                    </button>
                </div>
            </div>

            {/* 大量上傳預覽 Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">確認上傳籃子資料</h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                        </div>
                        
                        <div className="p-4 bg-blue-50 text-sm text-blue-800 border-b border-blue-100">
                            成功解析出 <strong>{uploadData.length}</strong> 筆有效資料，請確認下方預覽內容。
                            <br/>
                            <span className="text-xs text-slate-500 mt-1 block">*若上傳資料無 RFID，系統已自動將 Tag Code 轉換為 16進制補齊。</span>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-4">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-100 sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="p-2">#</th>
                                        <th className="p-2">RFID (Hex)</th>
                                        <th className="p-2">Tag Code</th>
                                        <th className="p-2">Type</th>
                                        <th className="p-2">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {uploadData.slice(0, 100).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-2 text-slate-400">{idx + 1}</td>
                                            <td className="p-2 font-mono text-blue-600">{item.rfid}</td>
                                            <td className="p-2">{item.tag_code || '-'}</td>
                                            <td className="p-2">{item.type}</td>
                                            <td className="p-2 truncate max-w-xs">{item.description || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {uploadData.length > 100 && (
                                <div className="text-center text-slate-500 mt-4 text-xs font-bold bg-slate-50 py-2 rounded">
                                    僅預覽前 100 筆資料...
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded" disabled={isUploading}>
                                取消
                            </button>
                            <button onClick={handleConfirmUpload} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 flex items-center shadow-md" disabled={isUploading}>
                                {isUploading ? '上傳中...' : `確認上傳 (${uploadData.length} 筆)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}