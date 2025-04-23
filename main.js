// main.js
import WebSocket from 'ws';
import { spawn } from 'child_process';
import { connectToButtplug, on, off, isReady, disconnectButtplug } from './bp.js';
import { setupWebUI } from './web_ui.js';

// Configuration constants
const CONFIG = {
  OBS_PORT: 4456,
  BUTTPLUG_URL: 'ws://localhost:12345',
  CONNECTION_RETRIES: 5,
  RETRY_DELAY_MS: 5000,
  HR_THRESHOLD: 100,
  UPDATE_INTERVAL_MS: 500,
  WEB_UI_PORT: 3000
};

// State management
const state = {
  heartRate: 0,
  vibrationState: 'off',
  connectRetries: 0,
  shutdownInProgress: false
};

// Create OBS-compatible WebSocket server
const wss = new WebSocket.Server({ port: CONFIG.OBS_PORT });

// Start local Buttplug server
function startButtplugServer() {
  try {
    const proc = spawn('buttplug-server', ['--websocket'], { 
      stdio: 'inherit', 
      shell: true 
    });
    
    proc.on('error', (err) => {
      console.error('Failed to start Buttplug server:', err.message);
    });
    
    return proc;
  } catch (err) {
    console.error('Error starting Buttplug server:', err.message);
    return null;
  }
}

// Connect to Buttplug with retry logic
async function connectWithRetry() {
  if (state.shutdownInProgress) return;
  
  try {
    await connectToButtplug(CONFIG.BUTTPLUG_URL);
    state.connectRetries = 0;
    console.log('✅ Successfully connected to Buttplug server');
  } catch (error) {
    state.connectRetries++;
    
    if (state.connectRetries < CONFIG.CONNECTION_RETRIES) {
      console.log(`Retrying Buttplug connection (${state.connectRetries}/${CONFIG.CONNECTION_RETRIES})...`);
      setTimeout(connectWithRetry, CONFIG.RETRY_DELAY_MS);
    } else {
      console.error(`❌ Failed to connect to Buttplug after ${CONFIG.CONNECTION_RETRIES} retries`);
    }
  }
}

// Initialize components
const buttplugProc = startButtplugServer();

// Setup Web UI
const updateUIStatus = setupWebUI(
  (action) => handleUIControl(action),
  {
    port: CONFIG.WEB_UI_PORT,
    openBrowser: true,
    title: 'Heart Rate Monitor'
  }
);

// Start connection process
connectWithRetry();

// Handle UI control actions
async function handleUIControl(action) {
  if (!isReady()) {
    console.warn('Device not ready for UI control');
    return false;
  }
  
  try {
    if (action === 'on') {
      await on();
      state.vibrationState = 'on';
    } else if (action === 'off') {
      await off();
      state.vibrationState = 'off';
    }
    updateUIStatus(state.heartRate, state.vibrationState);
    return true;
  } catch (error) {
    console.error('UI control error:', error);
    return false;
  }
}

// Process heart rate data and auto-control vibration
async function processHeartRate() {
  if (!isReady() || state.shutdownInProgress) return;
  
  try {
    if (state.heartRate < CONFIG.HR_THRESHOLD && state.vibrationState !== 'on') {
      await on();
      state.vibrationState = 'on';
      updateUIStatus(state.heartRate, state.vibrationState);
      console.log(`Auto→ ON (HR ${state.heartRate} < ${CONFIG.HR_THRESHOLD})`);
    }
    else if (state.heartRate >= CONFIG.HR_THRESHOLD && state.vibrationState !== 'off') {
      await off();
      state.vibrationState = 'off';
      updateUIStatus(state.heartRate, state.vibrationState);
      console.log(`Auto→ OFF (HR ${state.heartRate} ≥ ${CONFIG.HR_THRESHOLD})`);
    }
  } catch (error) {
    console.error('Error during heart rate processing:', error.message);
  }
}

// Main interval for auto control
const mainInterval = setInterval(processHeartRate, CONFIG.UPDATE_INTERVAL_MS);

// OBS WebSocket server handler
wss.on('connection', ws => {
  console.log('OBS client connected');
  
  // Send initial protocol handshake
  ws.send(JSON.stringify({ 
    op: 0, 
    d: { 
      obsWebSocketVersion: '5.4.2', 
      rpcVersion: 1 
    } 
  }));

  ws.on('message', data => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      console.warn('Received invalid JSON message');
      return;
    }
    
    const { op, d } = msg;

    // Handle protocol handshake
    if (op === 1) {
      ws.send(JSON.stringify({ 
        op: 2, 
        d: { 
          negotiatedRpcVersion: 1 
        } 
      }));
    }
    // Handle heart rate updates
    else if (op === 6 && d.requestType === 'SetInputSettings') {
      const { inputName, inputSettings } = d.requestData;
      
      if (inputName === 'heartrate' && inputSettings?.text) {
        const hr = parseInt(inputSettings.text, 10);
        
        if (!isNaN(hr)) {
          state.heartRate = hr;
          updateUIStatus(state.heartRate, state.vibrationState);
          console.log('HR update →', hr);
        }
      }

      // Send response
      ws.send(JSON.stringify({
        op: 7,
        d: {
          requestType: d.requestType,
          requestId: d.requestId,
          requestStatus: { result: true, code: 100 }
        }
      }));
    }
  });

  ws.on('close', () => console.log('OBS client disconnected'));
  ws.on('error', (err) => console.error('WebSocket error:', err.message));
});

// Graceful shutdown handler
async function gracefulShutdown() {
  if (state.shutdownInProgress) return;
  state.shutdownInProgress = true;
  
  console.log('Initiating graceful shutdown...');
  
  // Clear interval
  clearInterval(mainInterval);
  
  try {
    // Ensure device is off
    if (isReady() && state.vibrationState === 'on') {
      await off();
    }
    
    // Disconnect from Buttplug
    await disconnectButtplug();
    
    // Close WebSocket server
    await new Promise(resolve => {
      wss.close(resolve);
    });
    
    // Kill Buttplug server process
    if (buttplugProc) {
      buttplugProc.kill();
    }
    
    console.log('Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  gracefulShutdown();
});

console.log(`OBS-style WS server listening on ws://0.0.0.0:${CONFIG.OBS_PORT}`);
console.log(`Web UI available at http://localhost:${CONFIG.WEB_UI_PORT}`);