import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { RoomManager } from './rooms.js';
import { DrawingState } from './drawing-state.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app.use(cors());
app.use(express.json());
const clientPath = path.join(__dirname, '../client');
// const devClientPath = path.join(__dirname, '../client');

// if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('/', (req, res) => {
        res.sendFile(path.join(clientPath, 'index.html'));
    });
// }
//  else {
//     // Development mode - serve from client directory
//     app.use(express.static(devClientPath));
//     app.get('/', (req, res) => {
//         res.sendFile(path.join(devClientPath, 'index.html'));
//     });
// }

const roomManager = new RoomManager();
const drawingStates = new Map();
// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    let currentRoom = null;
    let userId = socket.id;
    socket.on('join-room', (roomId = 'default', userInfo) => {
        if (currentRoom) {
            socket.leave(currentRoom);
            roomManager.removeUser(currentRoom, socket.id);
        }
        currentRoom = roomId;
        socket.join(roomId);
        if (!drawingStates.has(roomId)) {
            drawingStates.set(roomId, new DrawingState());
        }
        const user = roomManager.addUser(roomId, socket.id, userInfo);
        userId = user.id;
        const state = drawingStates.get(roomId);
        const strokes = state.getStrokes();
        socket.emit('canvas-state', {
            strokes: strokes.map(stroke => ({
                id: stroke.id,
                userId: stroke.userId,
                tool: stroke.tool,
                color: stroke.color,
                width: stroke.width,
                points: stroke.points || []
            })),
            history: state.getHistory(),
        });
        // Notify others about the new user
        socket.to(roomId).emit('user-joined', {
            userId: user.id,
            name: user.name,
            color: user.color,
        });
        // Send updated user list to all in room
        const users = roomManager.getUsers(roomId);
        io.to(roomId).emit('users-updated', users);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('draw-start', (data) => {
        if (!currentRoom)
            return;
        const state = drawingStates.get(currentRoom);
        const strokeId = data.strokeId || `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        state.startStroke(userId, data, strokeId);
        socket.to(currentRoom).emit('draw-start', {
            x: data.x,
            y: data.y,
            color: data.color,
            width: data.width,
            tool: data.tool,
            userId,
            strokeId,
        });
    });
    socket.on('draw-point', (data) => {
        if (!currentRoom)
            return;
        const state = drawingStates.get(currentRoom);
        state.addPoint(data.strokeId, data.x, data.y);
        socket.to(currentRoom).emit('draw-point', {
            ...data,
            userId,
        });
    });
    socket.on('draw-end', (data) => {
        if (!currentRoom)
            return;
        const state = drawingStates.get(currentRoom);
        state.endStroke(data.strokeId);
        socket.to(currentRoom).emit('draw-end', {
            ...data,
            userId,
        });
    });
    socket.on('cursor-move', (data) => {
        if (!currentRoom)
            return;
        socket.to(currentRoom).emit('cursor-move', {
            ...data,
            userId,
        });
    });
    
    socket.on('ping', (callback) => {
        if (typeof callback === 'function') {
            callback();
        }
    });
    // socket.on('undo', () => {
    //     if (!currentRoom)
    //         return;
    //     const state = drawingStates.get(currentRoom);
    //     // Only allow undo of the most recent stroke by this user
    //     const result = state.undo(userId);
    //     if (result.success && result.strokeId) {
    //         io.to(currentRoom).emit('undo', {
    //             strokeId: result.strokeId,
    //             userId,
    //         });
    //     }
    // });

    socket.on('undo', (data) => {
  if (!currentRoom) return;
  const state = drawingStates.get(currentRoom);
  if (!state) return;
  const strokeId = data && data.strokeId;
  const result = strokeId ? state.undoById(userId, strokeId) : state.undo(userId);
  if (result.success && result.strokeId) {
    io.to(currentRoom).emit('undo', { strokeId: result.strokeId, userId });
  }
});

    // socket.on('redo', () => {
    //     if (!currentRoom)
    //         return;
    //     const state = drawingStates.get(currentRoom);
    //     const result = state.redo();
    //     if (result.success && result.strokeId && result.stroke) {
    //         // Serialize stroke for transmission
    //         const stroke = result.stroke;
    //         io.to(currentRoom).emit('redo', {
    //             strokeId: result.strokeId,
    //             stroke: {
    //                 id: stroke.id,
    //                 userId: stroke.userId,
    //                 tool: stroke.tool,
    //                 color: stroke.color,
    //                 width: stroke.width,
    //                 points: stroke.points || []
    //             },
    //             userId,
    //         });
    //     }
    // });

    socket.on('redo', (data) => {
  if (!currentRoom) return;
  const state = drawingStates.get(currentRoom);
  if (!state) return;
  const strokeId = data && data.strokeId;
  const result = strokeId ? state.redoById(userId, strokeId) : state.redo(userId);
  if (result.success && result.strokeId && result.stroke) {
    const s = result.stroke;
    const safeStroke = {
      id: s.id,
      userId: s.userId,
      tool: s.tool,
      color: s.color,
      width: s.width,
      points: Array.isArray(s.points) ? s.points : []
    };

    io.to(currentRoom).emit('redo', { strokeId: result.strokeId, stroke: safeStroke, userId });
  } else if (!result.success) {
    socket.emit('redo_failed', { reason: result.reason || 'no-op' });
  }
});
    socket.on('clear-canvas', () => {
        if (!currentRoom)
            return;
        const state = drawingStates.get(currentRoom);
        state.clear();
        io.to(currentRoom).emit('clear-canvas', { userId });
    });
    socket.on('disconnect', () => {
        if (currentRoom) {
            roomManager.removeUser(currentRoom, socket.id);
            const users = roomManager.getUsers(currentRoom);
            socket.to(currentRoom).emit('users-updated', users);
            socket.to(currentRoom).emit('user-left', { userId });
            console.log(`User ${socket.id} left room ${currentRoom}`);
        }
        console.log(`User disconnected: ${socket.id}`);
    });
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Collaborative Canvas ready for connections`);
});
