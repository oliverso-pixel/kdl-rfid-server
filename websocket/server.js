require('dotenv').config();
const WebSocket = require('ws');
const Redis = require('ioredis');
const axios = require('axios');

const PYTHON_API_URL = 'http://localhost:8000/api/v1/devices/heartbeat';
const WS_PORT = process.env.WS_PORT || 3001;

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
});

const CHANNEL = process.env.REDIS_CHANNEL || 'rfid_updates';

const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`🚀 WebSocket Server started on port ${WS_PORT}`);

// --- 處理 Redis 訊息 ---
// 當 Python API 更新資料庫並 publish 到 Redis 時，這裡會收到
redis.subscribe(CHANNEL, (err, count) => {
    if (err) {
        console.error('❌ Failed to subscribe to Redis:', err);
    } else {
        console.log(`✅ Subscribed to Redis channel: ${CHANNEL}`);
    }
});

redis.on('message', (channel, message) => {
    console.log(`📨 Redis Message received: ${message}`);
    broadcastToClients(message);
});

// --- 處理 WebSocket 連線 ---
wss.on('connection', (ws, req) => {
    // 1. 解析 URL 參數取得 deviceId
    // Android 連線字串範例: ws://192.168.1.100:3001/?deviceId=android_id_123
    let deviceId = null;
    try {
        // req.url 只有路徑部分 (e.g., "/?deviceId=xxx")，需要補上 base 才能解析
        const url = new URL(req.url, `http://${req.headers.host}`);
        deviceId = url.searchParams.get('deviceId');
    } catch (e) {
        console.error('Error parsing URL:', e);
    }

    const ip = req.socket.remoteAddress;
    console.log(`📱 New Client connected: IP=${ip}, DeviceID=${deviceId || 'Unknown'}`);

    // 將 deviceId 存入 ws 物件，方便斷線時使用
    ws.deviceId = deviceId;

    // 連線成功，立即標記為 ONLINE
    if (deviceId) {
        updateDeviceStatus(deviceId, 'ONLINE');
    }

    ws.on('message', (message) => {
        const msgString = message.toString();
        console.log(`📩 Received from client: ${msgString}`);
        
        try {
            const data = JSON.parse(msgString);

            if (data.type === 'heartbeat' && data.message === 'ping') {
                
                const devId = data.deviceId || ws.deviceId || 'Unknown';
                console.log(`💓 Heartbeat from ${devId} at ${new Date().toLocaleTimeString()}`);

                ws.send(JSON.stringify({ type: 'pong' }));

                if (devId && devId !== 'Unknown') {
                    updateDeviceStatus(devId, 'ONLINE');
                }
                return;
            }
        } catch (e) {
            // if (msgString === 'ping') {
            //     console.log(`💓 Ping (raw) from ${ws.deviceId}`);
            //     ws.send(JSON.stringify({ type: 'pong' }));
            //     if (ws.deviceId) updateDeviceStatus(ws.deviceId, 'ONLINE');
            //     return;
            // }
            console.log(`📩 Received from client: ${e}`);
        }
    });

    ws.on('close', () => {
        console.log(`🔌 Client disconnected: ${ws.deviceId || ip}`);
        updateDeviceStatus(ws.deviceId, 'OFFLINE');
    });

    ws.on('error', (error) => {
        console.error(`⚠️ WebSocket error: ${error}`);
        if (ws.deviceId) {
            updateDeviceStatus(ws.deviceId, 'OFFLINE');
        }
    });

    ws.on('error', (error) => {
        console.error(`⚠️ WebSocket error: ${error}`);
    });
});

/**
 * 呼叫 Python API 更新裝置狀態
 */
async function updateDeviceStatus(deviceId, status) {
    try {
        await axios.post(PYTHON_API_URL, {
            device_id: deviceId,
            status: status
        });
        console.log(`Updated ${deviceId} to ${status}`); // 除錯用，訊息太多可註解掉
    } catch (error) {
        console.error(`❌ Failed to update device status: ${error.message}`);
    }
}

/**
 * 廣播訊息給所有連線中的客戶端
 */
function broadcastToClients(data) {
    let clientCount = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data); // 直接傳送 JSON 字串，Android 端會收到 onMessage
            clientCount++;
        }
    });
    if (clientCount > 0) {
        console.log(`📢 Broadcasted to ${clientCount} clients`);
    }
}

// 優雅關閉
process.on('SIGINT', () => {
    console.log('Stopping server...');
    redis.disconnect();
    wss.close();
    process.exit();
});
