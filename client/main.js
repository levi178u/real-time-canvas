import { CanvasManager } from './canvas.js';
import { WebSocketManager } from './websocket.js';

class App {
    constructor() {
        this.canvas = null;
        this.ws = null;
        this.canvasManager = null;
        
        this.toolSelect = document.getElementById('tool-select');
        this.colorInput = document.getElementById('color');
        this.widthInput = document.getElementById('width');
        this.widthDisplay = document.getElementById('width-display');
        this.undoBtn = document.getElementById('undo');
        this.redoBtn = document.getElementById('redo');
        this.clearBtn = document.getElementById('clear');
        this.roomInput = document.getElementById('room');
        this.joinBtn = document.getElementById('join');
        this.userList = document.getElementById('user-list');
        this.latencyDisplay = document.getElementById('latency');
        this.cursorsContainer = document.getElementById('cursors');
        
        this.users = new Map();
        this.currentUserId = null;
        
        this.init();
    }
    
    
    init() {
        const canvasElement = document.getElementById('canvas');
        this.canvasManager = new CanvasManager(canvasElement);
        
        this.ws = new WebSocketManager();
        this.setupCanvasCallbacks();
        this.setupWebSocketCallbacks();
        this.setupUIListeners();
        this.ws.connect();
    }
 
    setupCanvasCallbacks() {
        this.canvasManager.onDrawStart = (stroke) => {
            stroke.userId = this.ws.userId || 'local';
            this.ws.sendDrawStart(stroke);
        };
        this.canvasManager.onDrawPoint = (strokeId, x, y) => {
            this.ws.sendDrawPoint(strokeId, x, y);
        };
        this.canvasManager.onDrawEnd = (strokeId) => {
            this.ws.sendDrawEnd(strokeId);
        };
        this.canvasManager.onCursorMove = (x, y) => {
            this.ws.sendCursorMove(x, y);
        };
        this.canvasManager.onCursorsUpdated = (cursors) => {
            this.updateCursorsDisplay(cursors);
        };
    }
   
    setupWebSocketCallbacks() {
        this.ws.on('connected', () => {
            console.log('WebSocket connected');
            this.currentUserId = this.ws.userId;
        });
        
        this.ws.on('disconnected', () => {
            console.log('WebSocket disconnected');
        });
        
        this.ws.on('canvas-state', (data) => {
            this.canvasManager.loadCanvasState(data.strokes);
        });
        
        this.ws.on('remote-draw-start', (data) => {
            const stroke = {
                id: data.strokeId,
                tool: data.tool,
                color: data.color,
                width: data.width,
                points: [{ x: data.x, y: data.y }],
                userId: data.userId
            };
            this.canvasManager.addRemoteStroke(stroke);
        });
        
        this.ws.on('remote-draw-point', (data) => {
            this.canvasManager.addRemotePoint(data.strokeId, data.x, data.y);
        });
        
        this.ws.on('remote-draw-end', (data) => {
           
        });
        
        this.ws.on('remote-cursor-move', (data) => {
            const user = this.users.get(data.userId);
            if (user) {
                this.canvasManager.updateCursor(
                    data.userId,
                    data.x,
                    data.y,
                    user.color,
                    user.name
                );
            }
        });
        
        this.ws.on('remote-undo', (data) => {
            if (data.strokeId) {
                const stroke = this.canvasManager.removeStroke(data.strokeId);
                if (stroke) {
                    this.canvasManager.redoStack.push(stroke);
                }
            }
        });
        
        this.ws.on('remote-redo', (data) => {
            if (data.stroke) {
                this.canvasManager.restoreStroke(data.stroke);
            }
        });
        
        this.ws.on('remote-clear-canvas', (data) => {
            this.canvasManager.clearCanvas();
        });
        
        this.ws.on('user-joined', (data) => {
            console.log('User joined:', data);
        });
        
        this.ws.on('user-left', (data) => {
            this.canvasManager.removeCursor(data.userId);
            this.users.delete(data.userId);
            this.updateUserList();
        });
        
        this.ws.on('users-updated', (users) => {
            this.users.clear();
            users.forEach(user => {
                this.users.set(user.id, user);
            });
            this.updateUserList();
        });
        
        this.ws.on('latency-updated', (latency) => {
            this.latencyDisplay.textContent = Math.round(latency);
        });
    }
    
    setupUIListeners() {
        this.toolSelect.addEventListener('change', (e) => {
            this.canvasManager.setTool(e.target.value);
        });
        this.colorInput.addEventListener('change', (e) => {
            this.canvasManager.setColor(e.target.value);
        });
        
        this.widthInput.addEventListener('input', (e) => {
            const width = parseInt(e.target.value);
            this.canvasManager.setWidth(width);
            this.widthDisplay.textContent = width;
        });
        
        this.undoBtn.addEventListener('click', () => {
            const lastStroke = this.canvasManager.getLastStrokeForUser(this.currentUserId);
            if (lastStroke) {
                const removedStroke = this.canvasManager.removeStroke(lastStroke.id);
                if (removedStroke) {
                    this.ws.sendUndo(removedStroke.id, removedStroke);
                }
            }
        });
        
        this.redoBtn.addEventListener('click', () => {
            if (this.canvasManager.redoStack.length > 0) {
                const stroke = this.canvasManager.redoStack.pop();
                if (stroke && stroke.userId === this.currentUserId) {
                    this.canvasManager.restoreStroke(stroke);
                    this.ws.sendRedo(stroke.id, stroke);
                }
            }
        });
        
        this.clearBtn.addEventListener('click', () => {
            if (confirm('Clear the entire canvas? This action cannot be undone.')) {
                this.ws.sendClearCanvas();
            }
        });
        
        this.joinBtn.addEventListener('click', () => {
            const roomId = this.roomInput.value.trim() || 'default';
            this.ws.joinRoom(roomId);
        });
        
        this.roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinBtn.click();
            }
        });
    }
    
    updateUserList() {
        if (this.users.size === 0) {
            this.userList.textContent = '—';
            return;
        }
        
        const userNames = Array.from(this.users.values())
            .map(user => {
                const colorCircle = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${user.color};margin-right:4px;"></span>`;
                return `${colorCircle}${user.name}`;
            })
            .join(', ');
        
        this.userList.innerHTML = userNames;
    }
    updateCursorsDisplay(cursors) {
        // Clear existing cursors (except local)
        const existingCursors = this.cursorsContainer.querySelectorAll('.user-cursor:not(.local-cursor)');
        existingCursors.forEach(cursor => cursor.remove());
        
        cursors.forEach((cursorData, userId) => {
            if (userId === 'local' || userId === this.currentUserId) {
                return; 
            }
            
            const user = this.users.get(userId);
            if (!user) return;
            
            const canvasRect = this.canvasManager.canvas.getBoundingClientRect();
            const x = cursorData.x + canvasRect.left;
            const y = cursorData.y + canvasRect.top;
            
            let cursorEl = this.cursorsContainer.querySelector(`[data-user-id="${userId}"]`);
            if (!cursorEl) {
                cursorEl = document.createElement('div');
                cursorEl.className = 'user-cursor';
                cursorEl.setAttribute('data-user-id', userId);
                this.cursorsContainer.appendChild(cursorEl);
                
                const dot = document.createElement('span');
                dot.className = 'cursor-dot';
                dot.style.display = 'inline-block';
                dot.style.width = '8px';
                dot.style.height = '8px';
                dot.style.borderRadius = '50%';
                dot.style.marginRight = '4px';
                dot.style.verticalAlign = 'middle';
                cursorEl.appendChild(dot);
            }
            
            cursorEl.style.left = x + 'px';
            cursorEl.style.top = y + 'px';
            cursorEl.style.borderColor = user.color;
            cursorEl.style.borderWidth = '2px';
            cursorEl.style.borderStyle = 'solid';
            
            const dot = cursorEl.querySelector('.cursor-dot');
            if (dot) {
                dot.style.backgroundColor = user.color;
            }
            
            const nameText = user.name || `User ${userId.slice(0, 6)}`;
            Array.from(cursorEl.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.remove();
                }
            });
            if (dot && dot.nextSibling) {
                dot.nextSibling.textContent = nameText;
            } else if (dot) {
                cursorEl.appendChild(document.createTextNode(nameText));
            } else {
                cursorEl.textContent = nameText;
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}