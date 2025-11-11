export class WebSocketManager {
    constructor() {
        this.socket = null;
        this.roomId = 'default';
        this.userId = null;
        this.userColor = null;
        this.userName = null;
        this.listeners = {};
        this.latency = 0;
        this.isConnected = false;
        this.lastCursorUpdate = 0;
        this.cursorThrottle = 50;
    }

    connect() {
        if (typeof io === 'undefined') {
            console.error('Socket.io client not loaded');
            return;
        }
        
        this.socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.userId = this.socket.id;
            this.emit('connected');
            this.joinRoom(this.roomId);
            this.startLatencyTracking();
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.emit('disconnected');
        });

        this.socket.on('canvas-state', (data) => this.emit('canvas-state', data));
        this.socket.on('draw-start', (data) => this.emit('remote-draw-start', data));
        this.socket.on('draw-point', (data) => this.emit('remote-draw-point', data));
        this.socket.on('draw-end', (data) => this.emit('remote-draw-end', data));
        this.socket.on('cursor-move', (data) => this.emit('remote-cursor-move', data));
        this.socket.on('undo', (data) => this.emit('remote-undo', data));
        this.socket.on('redo', (data) => this.emit('remote-redo', data));
        this.socket.on('clear-canvas', (data) => this.emit('remote-clear-canvas', data));
        this.socket.on('user-joined', (data) => this.emit('user-joined', data));
        this.socket.on('user-left', (data) => this.emit('user-left', data));
        this.socket.on('users-updated', (users) => this.emit('users-updated', users));
    }

    joinRoom(roomId, userInfo = {}) {
        this.roomId = roomId;
        if (this.socket && this.socket.connected) {
            this.socket.emit('join-room', roomId, {
                name: userInfo.name || this.userName || `User ${this.socket.id.slice(0, 6)}`,
                color: userInfo.color || this.userColor
            });
        }
    }

    sendDrawStart(strokeData) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('draw-start', {
                strokeId: strokeData.id,
                x: strokeData.points[0].x,
                y: strokeData.points[0].y,
                color: strokeData.color,
                width: strokeData.width,
                tool: strokeData.tool
            });
        }
    }

    sendDrawPoint(strokeId, x, y) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('draw-point', {
                strokeId,
                x,
                y
            });
        }
    }
    
    sendDrawEnd(strokeId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('draw-end', {
                strokeId
            });
        }
    }
  
    sendCursorMove(x, y) {
        const now = Date.now();
        if (now - this.lastCursorUpdate < this.cursorThrottle) {
            return;
        }
        this.lastCursorUpdate = now;
        
        if (this.socket && this.socket.connected) {
            this.socket.emit('cursor-move', {
                x,
                y
            });
        }
    }
    
    // sendUndo(strokeId, stroke) {
    //     if (this.socket && this.socket.connected) {
    //         this.socket.emit('undo', {
    //             strokeId: strokeId,
    //             stroke: stroke // Send full stroke data for syncing
    //         });
    //     }
    // }
    sendUndo() {
  if (this.socket && this.socket.connected) {
    this.socket.emit('undo', (res) => {
      console.log('undo ack', res);
    });
  }
}

    
    // sendRedo(strokeId, stroke) {
    //     if (this.socket && this.socket.connected) {
    //         this.socket.emit('redo', {
    //             strokeId: strokeId,
    //             stroke: stroke
    //         });
    //     }
    // }

    sendRedo(strokeId) {
  if (this.socket && this.socket.connected) {
    if (strokeId) this.socket.emit('redo', { strokeId });
    else this.socket.emit('redo');
  }
}
    
    sendClearCanvas() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('clear-canvas');
        }
    }
    
    startLatencyTracking() {
        setInterval(() => {
            if (this.socket && this.socket.connected) {
                const start = Date.now();
                this.socket.emit('ping', () => {
                    this.latency = Date.now() - start;
                    this.emit('latency-updated', this.latency);
                });
            }
        }, 1000);
    }
    
 
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
    
 
    setUserInfo(name, color) {
        this.userName = name;
        this.userColor = color;
    }
    
  
    getLatency() {
        return this.latency;
    }
}
