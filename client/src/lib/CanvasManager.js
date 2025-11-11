export class CanvasManager {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        this.isDrawing = false;
        this.currentStroke = null;
        this.strokes = new Map();
        this.strokeOrder = [];
        
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentWidth = 4;
        
        this.pointsBuffer = [];
        this.lastPoint = null;
        this.lastRenderTime = 0;
        this.renderThrottle = 16;
        this.cursors = new Map();
        
        
        this.onDrawStart = null;
        this.onDrawPoint = null;
        this.onDrawEnd = null;
        this.onCursorMove = null;
        this.onCursorsUpdated = null;
        
        this.resizeCanvas();
        this.setupEventListeners();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (!container) {
            return;
        }
        
        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        this.redrawCanvas();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleEnd(e));
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleStart(this.createMouseEvent(touch, e.target));
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMove(this.createMouseEvent(touch, e.target));
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleEnd(e);
        });
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.handleEnd(e);
        });
    }

    createMouseEvent(touch, target) {
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: target,
            preventDefault: () => {}
        };
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleStart(e) {
        if (this.isDrawing) return;
        
        const coords = this.getCanvasCoordinates(e);
        this.isDrawing = true;
        
        const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.currentStroke = {
            id: strokeId,
            tool: this.currentTool,
            color: this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor,
            width: this.currentWidth,
            points: [coords],
            userId: 'local'
        };
        
        this.lastPoint = coords;
        this.pointsBuffer = [coords];
        
        if (this.onDrawStart) {
            this.onDrawStart(this.currentStroke);
        }
    }
    
    handleMove(e) {
        const coords = this.getCanvasCoordinates(e);
        
        if (this.onCursorMove) {
            this.onCursorMove(coords.x, coords.y);
        }
        
        if (!this.isDrawing || !this.currentStroke) return;
        
        const distance = this.getDistance(this.lastPoint, coords);
        const minDistance = this.currentWidth * 0.3;
        
        if (distance < minDistance) return;
        
        this.pointsBuffer.push(coords);
        this.currentStroke.points.push(coords);
        this.lastPoint = coords;
        
        const now = Date.now();
        if (now - this.lastRenderTime > this.renderThrottle) {
            this.drawStrokeSegment(this.lastPoint, coords, this.currentStroke);
            this.lastRenderTime = now;
            
            if (this.onDrawPoint) {
                this.onDrawPoint(this.currentStroke.id, coords.x, coords.y);
            }
        }
    }
    
    handleEnd(e) {
        if (!this.isDrawing || !this.currentStroke) return;
        
        this.isDrawing = false;
        
        if (this.pointsBuffer.length > 0) {
            this.drawStroke(this.currentStroke);
        }
        
        this.strokes.set(this.currentStroke.id, this.currentStroke);
        this.strokeOrder.push(this.currentStroke.id);
        
        if (this.onDrawEnd) {
            this.onDrawEnd(this.currentStroke.id);
        }
        
        this.currentStroke = null;
        this.pointsBuffer = [];
        this.lastPoint = null;
    }
    
    getDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    drawStrokeSegment(from, to, stroke) {
        this.ctx.save();
        
        if (stroke.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = stroke.color;
        }
        
        this.ctx.lineWidth = stroke.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawStroke(stroke) {
        if (!stroke || stroke.points.length === 0) return;
        
        this.ctx.save();
        
        if (stroke.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = stroke.color;
        }
        
        this.ctx.lineWidth = stroke.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        const points = stroke.points;
        
        if (points.length === 1) {
            this.ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                
                if (i === 1) {
                    this.ctx.lineTo(curr.x, curr.y);
                } else {
                    const midX = (prev.x + curr.x) / 2;
                    const midY = (prev.y + curr.y) / 2;
                    this.ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
                }
            }
            
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const strokeId of this.strokeOrder) {
            const stroke = this.strokes.get(strokeId);
            if (stroke) {
                this.drawStroke(stroke);
            }
        }
    }
    
    addRemoteStroke(strokeData) {
        const stroke = {
            id: strokeData.id || strokeData.strokeId,
            tool: strokeData.tool || 'brush',
            color: strokeData.color,
            width: strokeData.width,
            points: strokeData.points || [{ x: strokeData.x, y: strokeData.y }],
            userId: strokeData.userId
        };
        
        this.strokes.set(stroke.id, stroke);
        if (!this.strokeOrder.includes(stroke.id)) {
            this.strokeOrder.push(stroke.id);
        }
    }
    
    addRemotePoint(strokeId, x, y) {
        const stroke = this.strokes.get(strokeId);
        if (!stroke) return;
        
        const point = { x, y };
        stroke.points.push(point);
        
        if (stroke.points.length > 1) {
            const prevPoint = stroke.points[stroke.points.length - 2];
            this.drawStrokeSegment(prevPoint, point, stroke);
        }
    }
    
    removeStroke(strokeId) {
        if (this.strokes.has(strokeId)) {
            this.strokes.delete(strokeId);
            this.strokeOrder = this.strokeOrder.filter(id => id !== strokeId);
            this.redrawCanvas();
        }
    }
    
    restoreStroke(stroke) {
        this.strokes.set(stroke.id, stroke);
        if (!this.strokeOrder.includes(stroke.id)) {
            this.strokeOrder.push(stroke.id);
        }
        this.drawStroke(stroke);
    }
    
    clearCanvas() {
        this.strokes.clear();
        this.strokeOrder = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    loadCanvasState(strokes) {
        this.strokes.clear();
        this.strokeOrder = [];
        
        if (Array.isArray(strokes)) {
            for (const strokeData of strokes) {
                const stroke = {
                    id: strokeData.id,
                    tool: strokeData.tool || 'brush',
                    color: strokeData.color,
                    width: strokeData.width,
                    points: strokeData.points || [],
                    userId: strokeData.userId
                };
                this.strokes.set(stroke.id, stroke);
                this.strokeOrder.push(stroke.id);
            }
        }
        
        this.redrawCanvas();
    }
    
    updateCursor(userId, x, y, color = null, name = null) {
        this.cursors.set(userId, { x, y, color, name });
        if (this.onCursorsUpdated) {
            this.onCursorsUpdated(this.cursors);
        }
    }
    
    removeCursor(userId) {
        this.cursors.delete(userId);
        if (this.onCursorsUpdated) {
            this.onCursorsUpdated(this.cursors);
        }
    }
    
    setTool(tool) {
        this.currentTool = tool;
    }
    
    setColor(color) {
        this.currentColor = color;
    }
    
    setWidth(width) {
        this.currentWidth = width;
    }
}

