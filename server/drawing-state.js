export class DrawingState {
  constructor() {
    this.strokes = new Map();
    this.strokeOrder = [];
    this.history = [];
    this.undoStack = [];
    this.nextStrokeId = 0;
  }

  startStroke(userId, data, strokeId) {
    const finalStrokeId = strokeId || `stroke-${Date.now()}-${this.nextStrokeId++}`;
    const stroke = {
      id: finalStrokeId,
      userId,
      points: [{ x: data.x, y: data.y }],
      color: data.color,
      width: data.width,
      tool: data.tool,
      timestamp: Date.now()
    };
    this.strokes.set(finalStrokeId, stroke);
    this.strokeOrder.push(finalStrokeId);
    this.history.push(finalStrokeId);
    this.undoStack = this.undoStack.filter(id => this.strokes.get(id)?.userId !== userId);
    return finalStrokeId;
  }

  addPoint(strokeId, x, y) {
    const stroke = this.strokes.get(strokeId);
    if (stroke) stroke.points.push({ x, y });
  }

  endStroke(strokeId) {
    return this.strokes.get(strokeId) || null;
  }

  getStroke(strokeId) {
    return this.strokes.get(strokeId);
  }

  getStrokes() {
    return this.strokeOrder.map(id => this.strokes.get(id)).filter(Boolean);
  }

  getHistory() {
    return [...this.history];
  }

  _findLastIndexByUser(arr, userId) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const s = this.strokes.get(arr[i]);
      if (s && s.userId === userId) return i;
    }
    return -1;
  }

  undo(userId) {
    const idx = this._findLastIndexByUser(this.history, userId);
    if (idx === -1) return { success: false };
    const [strokeId] = this.history.splice(idx, 1);
    this.strokeOrder = this.strokeOrder.filter(id => id !== strokeId);
    this.undoStack.push(strokeId);
    const stroke = this.strokes.get(strokeId);
    return { success: true, strokeId, stroke };
  }

  redo(userId) {
    const idx = this._findLastIndexByUser(this.undoStack, userId);
    if (idx === -1) return { success: false };
    const [strokeId] = this.undoStack.splice(idx, 1);
    this.history.push(strokeId);
    this.strokeOrder.push(strokeId);
    const stroke = this.strokes.get(strokeId);
    return { success: true, strokeId, stroke };
  }

  undoById(userId, strokeId) {
    const idx = this.history.findIndex(id => id === strokeId && this.strokes.get(id)?.userId === userId);
    if (idx === -1) return { success: false };
    this.history.splice(idx, 1);
    this.strokeOrder = this.strokeOrder.filter(id => id !== strokeId);
    this.undoStack.push(strokeId);
    const stroke = this.strokes.get(strokeId);
    return { success: true, strokeId, stroke };
  }

  redoById(userId, strokeId) {
    const idx = this.undoStack.findIndex(id => id === strokeId && this.strokes.get(id)?.userId === userId);
    if (idx === -1) return { success: false };
    this.undoStack.splice(idx, 1);
    this.history.push(strokeId);
    this.strokeOrder.push(strokeId);
    const stroke = this.strokes.get(strokeId);
    return { success: true, strokeId, stroke };
  }

  clear() {
    this.strokes.clear();
    this.strokeOrder = [];
    this.history = [];
    this.undoStack = [];
  }

  removeStroke(strokeId) {
    this.strokes.delete(strokeId);
    this.strokeOrder = this.strokeOrder.filter(id => id !== strokeId);
    this.history = this.history.filter(id => id !== strokeId);
    this.undoStack = this.undoStack.filter(id => id !== strokeId);
  }
}
