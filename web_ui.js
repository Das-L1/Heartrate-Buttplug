// web_ui.js
import express from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import open from 'open';

/**
 * Sets up and starts the web UI for heart rate and vibrator control
 * @param {Function} controlCallback - Callback for handling manual controls
 * @param {Object} options - Configuration options
 * @returns {Function} Status update function
 */
export function setupWebUI(controlCallback, options = {}) {
  const config = {
    port: options.port || 3000,
    openBrowser: options.openBrowser !== false,
    title: options.title || 'HR & Vibrator Control'
  };
  
  const state = {
    heartRate: 0,
    vibrationState: 'off',
    connections: 0
  };
  
  // Create Express app and HTTP server
  const app = express();
  const server = http.createServer(app);
  const io = new IOServer(server);

  // Serve static files if provided
  if (options.staticDir) {
    app.use(express.static(options.staticDir));
  }

  // Main route with UI
  app.get('/', (req, res) => {
    res.send(generateHtml(config.title));
  });

  // Socket.IO connection handler
  io.on('connection', socket => {
    state.connections++;
    console.log(`Web UI client connected (total: ${state.connections})`);
    
    // Send initial status
    socket.emit('status', { 
      heartRate: state.heartRate, 
      vibrator: state.vibrationState
    });

    // Handle manual controls
    socket.on('manualOn', async () => {
      console.log('Manual ON requested');
      const success = await controlCallback('on');
      if (!success) {
        socket.emit('error', { message: 'Failed to turn device on' });
      }
    });
    
    socket.on('manualOff', async () => {
      console.log('Manual OFF requested');
      const success = await controlCallback('off');
      if (!success) {
        socket.emit('error', { message: 'Failed to turn device off' });
      }
    });
    
    socket.on('disconnect', () => {
      state.connections--;
      console.log(`Web UI client disconnected (total: ${state.connections})`);
    });
  });

  // Start the server
  server.listen(config.port, () => {
    console.log(`Web UI listening on http://0.0.0.0:${config.port}`);
    
    // Open browser if enabled
    if (config.openBrowser) {
      open(`http://localhost:${config.port}`).catch(err => {
        console.warn('Failed to open browser:', err.message);
      });
    }
  });

  // Return update function
  return (heartRate, vibrationState) => {
    state.heartRate = heartRate;
    state.vibrationState = vibrationState;
    io.emit('status', { 
      heartRate: state.heartRate, 
      vibrator: state.vibrationState
    });
  };
}

/**
 * Generate HTML for the web UI
 * @param {string} title - Page title
 * @returns {string} HTML content
 */
function generateHtml(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      text-align: center;
      margin: 0;
      padding: 20px;
      background-color: #f8f9fa;
      color: #212529;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: center;
    }
    
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
      margin-top: 20px;
      flex: 1;
      min-width: 300px;
    }
    
    .heart-rate {
      font-size: 4rem;
      font-weight: bold;
      margin-bottom: 1rem;
      color: #dc3545;
    }
    
    .device-state {
      font-size: 1.5rem;
      margin-bottom: 2rem;
      font-weight: 500;
    }
    
    .state-on {
      color: #28a745;
    }
    
    .state-off {
      color: #6c757d;
    }
    
    .btn {
      display: inline-block;
      font-weight: 500;
      color: #212529;
      text-align: center;
      vertical-align: middle;
      cursor: pointer;
      background-color: transparent;
      border: 1px solid transparent;
      padding: 0.375rem 0.75rem;
      font-size: 1rem;
      line-height: 1.5;
      border-radius: 0.25rem;
      transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
    }
    
    .btn-primary {
      color: #fff;
      background-color: #007bff;
      border-color: #007bff;
    }
    
    .btn-primary:hover {
      color: #fff;
      background-color: #0069d9;
      border-color: #0062cc;
    }
    
    .btn-danger {
      color: #fff;
      background-color: #dc3545;
      border-color: #dc3545;
    }
    
    .btn-danger:hover {
      color: #fff;
      background-color: #c82333;
      border-color: #bd2130;
    }
    
    .switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
      margin-bottom: 20px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 34px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #2196F3;
    }
    
    input:checked + .slider:before {
      transform: translateX(26px);
    }
    
    .error-message {
      background-color: #f8d7da;
      color: #721c24;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      display: none;
    }
    
    .footer {
      margin-top: 30px;
      font-size: 0.8rem;
      color: #6c757d;
    }
    
    @keyframes heartbeat {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    .heartbeat {
      animation: heartbeat 1s infinite;
      display: inline-block;
    }
  </style>
</head>
<body>
  <h1>Heart Rate & Vibrator Control</h1>
  
  <div class="card">
    <h2>Heart Rate Monitor</h2>
    <div id="hr" class="heart-rate">HR: <span class="heartbeat">--</span></div>
    <div id="state" class="device-state">Vibrator: --</div>
    
    <div id="errorMsg" class="error-message"></div>
    
    <div>
      <label class="switch">
        <input type="checkbox" id="toggleSwitch">
        <span class="slider"></span>
      </label>
      <div>Manual Control</div>
    </div>
  </div>
  
  <div class="footer">
    Heart rate threshold: 100 BPM
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Connect to WebSocket
    const socket = io();
    
    // Get DOM elements
    const hrEl = document.querySelector('#hr .heartbeat');
    const stateEl = document.getElementById('state');
    const toggle = document.getElementById('toggleSwitch');
    const errorMsg = document.getElementById('errorMsg');
    
    // Update heart rate animation speed based on value
    function updateHeartbeatAnimation(hr) {
      const animationDuration = hr > 0 ? (60 / hr) : 1;
      document.querySelector('.heartbeat').style.animation = 
        \`heartbeat \${animationDuration}s infinite\`;
    }
    
    // Handle status updates
    socket.on('status', ({ heartRate, vibrator }) => {
      hrEl.textContent = heartRate;
      updateHeartbeatAnimation(heartRate);
      
      stateEl.textContent = 'Vibrator: ' + vibrator.toUpperCase();
      stateEl.className = 'device-state state-' + vibrator;
      
      toggle.checked = vibrator === 'on';
    });
    
    // Handle errors
    socket.on('error', ({ message }) => {
      errorMsg.textContent = message;
      errorMsg.style.display = 'block';
      setTimeout(() => {
        errorMsg.style.display = 'none';
      }, 3000);
    });
    
    // Toggle switch event
    toggle.addEventListener('change', () => {
      errorMsg.style.display = 'none';
      if (toggle.checked) {
        socket.emit('manualOn');
      } else {
        socket.emit('manualOff');
      }
    });
  </script>
</body>
</html>`;
}