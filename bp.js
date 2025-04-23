// bp.js
import { ButtplugClient, ButtplugNodeWebsocketClientConnector } from 'buttplug';

// Singleton pattern for client management
let client = null;
let device = null;
let connectionStatus = {
  isConnecting: false,
  isConnected: false,
  lastError: null
};

/**
 * Connects to a Buttplug server and waits for the first device.
 * @param {string} [url] - WebSocket URL of the Buttplug server.
 * @param {number} [timeoutMs] - Timeout (ms) for finding a device.
 * @returns {Promise<void>} - Resolves when connected and device found
 */
export async function connectToButtplug(
  url = 'ws://localhost:12345',
  timeoutMs = 10000
) {
  // Prevent multiple simultaneous connection attempts
  if (connectionStatus.isConnecting) {
    throw new Error('Connection already in progress');
  }
  
  // Return immediately if already connected
  if (client && client.connected) {
    return Promise.resolve();
  }

  connectionStatus.isConnecting = true;
  connectionStatus.lastError = null;
  
  try {
    // Create and connect client
    client = new ButtplugClient('My Buttplug Controller');
    const connector = new ButtplugNodeWebsocketClientConnector(url);
    
    await client.connect(connector);
    console.log(`Connected to Buttplug server at ${url}`);
    
    // Start scanning for devices
    await client.startScanning();
    console.log('Started scanning for devices...');
    
    // Wait for device with timeout
    await waitForDevice(timeoutMs);
    
    connectionStatus.isConnected = true;
    return Promise.resolve();
  } catch (error) {
    connectionStatus.lastError = error;
    console.error('Buttplug connection error:', error.message);
    
    // Clean up on error
    await safeDisconnect();
    throw error;
  } finally {
    connectionStatus.isConnecting = false;
  }
}

/**
 * Wait for a device to be found
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<void>}
 */
function waitForDevice(timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.removeAllListeners('deviceadded');
      client.stopScanning().catch(() => {});
      reject(new Error('No device found within timeout'));
    }, timeoutMs);
    
    client.on('deviceadded', (d) => {
      clearTimeout(timer);
      client.stopScanning().catch(() => {});
      device = d;
      console.log(`Device connected: ${device.name}`);
      resolve();
    });
  });
}

/**
 * Check if the client is connected with a device
 * @returns {boolean}
 */
export function isReady() {
  return client && client.connected && device !== null;
}

/**
 * Get connection status information
 * @returns {Object} Connection status
 */
export function getConnectionStatus() {
  return {
    ...connectionStatus,
    deviceName: device ? device.name : null
  };
}

/** 
 * Vibrate at full speed 
 * @returns {Promise<void>}
 */
export async function on() {
  if (!isReady()) throw new Error('Device not connected');
  try {
    await device.vibrate(1.0);
    console.log('Device ON');
  } catch (error) {
    console.error('Error turning device on:', error);
    throw error;
  }
}

/** 
 * Stop vibration 
 * @returns {Promise<void>}
 */
export async function off() {
  if (!isReady()) throw new Error('Device not connected');
  try {
    await device.stop();
    console.log('Device OFF');
  } catch (error) {
    console.error('Error turning device off:', error);
    throw error;
  }
}

/**
 * Safe disconnect with error handling
 * @returns {Promise<void>}
 */
async function safeDisconnect() {
  if (!client) return;
  
  try {
    if (device) {
      try {
        await device.stop();
      } catch (e) {
        console.warn('Error stopping device:', e.message);
      }
    }
    
    if (client.connected) {
      await client.disconnect();
    }
  } catch (e) {
    console.warn('Error during disconnect:', e.message);
  } finally {
    client = null;
    device = null;
    connectionStatus.isConnected = false;
  }
}

/** 
 * Disconnects and clears state
 * @returns {Promise<void>}
 */
export async function disconnectButtplug() {
  await safeDisconnect();
  console.log('Buttplug client disconnected');
}