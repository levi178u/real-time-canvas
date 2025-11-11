import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from './lib/useWebSocket';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { UserList } from './components/UserList';
import './App.css';

function App() {
    const [tool, setTool] = useState('brush');
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(4);
    const [roomId, setRoomId] = useState('default');
    
    const canvasRef = useRef(null);
    const {
        isConnected,
        userId,
        latency,
        users,
        joinRoom,
        sendDrawStart,
        sendDrawPoint,
        sendDrawEnd,
        sendCursorMove,
        sendUndo,
        sendRedo,
        sendClearCanvas,
        on,
        off,
        socket
    } = useWebSocket();

    useEffect(() => {
        if (!socket) return;

        const handleCanvasState = (data) => {
            const canvasManager = canvasRef.current?.getCanvasManager();
            if (canvasManager && data.strokes) {
                canvasManager.loadCanvasState(data.strokes);
            }
        };

        const handleRemoteDrawStart = (data) => {
            const canvasManager = canvasRef.current?.getCanvasManager();
            if (canvasManager) {
                // Notify that user is drawing
                if (canvasManager.onRemoteDrawStart) {
                    canvasManager.onRemoteDrawStart(data.userId);
                }
                
                const stroke = {
                    id: data.strokeId,
                    tool: data.tool,
                    color: data.color,
                    width: data.width,
                    points: [{ x: data.x, y: data.y }],
                    userId: data.userId
                };
                canvasManager.addRemoteStroke(stroke);
            }
        };

        const handleRemoteDrawPoint = (data) => {
            const canvasManager = canvasRef.current?.getCanvasManager();
            if (canvasManager) {
                canvasManager.addRemotePoint(data.strokeId, data.x, data.y);
            }
        };

        const handleRemoteDrawEnd = (data) => {
            const canvasManager = canvasRef.current?.getCanvasManager();
            if (canvasManager && data.userId) {
                // Notify that user stopped drawing
                if (canvasManager.onRemoteDrawEnd) {
                    canvasManager.onRemoteDrawEnd(data.userId);
                }
            }
        };

        const handleRemoteUndo = (data) => {
            const canvasManager = canvasRef.current?.getCanvasManager();
            if (canvasManager && data.strokeId) {
                canvasManager.removeStroke(data.strokeId);
            }
        };

        const handleRemoteRedo = (data) => {
            const canvasManager = canvasRef.current?.getCanvasManager();
            if (canvasManager && data.stroke && data.strokeId) {
                canvasManager.restoreStroke(data.stroke);
            }
        };

        const handleRemoteClear = () => {
            const canvasManager = canvasRef.current?.getCanvasManager();
            if (canvasManager) {
                canvasManager.clearCanvas();
            }
        };

        const handleRemoteCursorMove = (data) => {
            const canvasManager = canvasRef.current?.getCanvasManager();
            if (canvasManager) {
                const user = users.find(u => u.id === data.userId);
                if (user) {
                    canvasManager.updateCursor(
                        data.userId,
                        data.x,
                        data.y,
                        user.color,
                        user.name
                    );
                }
            }
        };

        socket.on('canvas-state', handleCanvasState);
        socket.on('draw-start', handleRemoteDrawStart);
        socket.on('draw-point', handleRemoteDrawPoint);
        socket.on('draw-end', handleRemoteDrawEnd);
        socket.on('undo', handleRemoteUndo);
        socket.on('redo', handleRemoteRedo);
        socket.on('clear-canvas', handleRemoteClear);
        socket.on('cursor-move', handleRemoteCursorMove);

        return () => {
            socket.off('canvas-state', handleCanvasState);
            socket.off('draw-start', handleRemoteDrawStart);
            socket.off('draw-point', handleRemoteDrawPoint);
            socket.off('draw-end', handleRemoteDrawEnd);
            socket.off('undo', handleRemoteUndo);
            socket.off('redo', handleRemoteRedo);
            socket.off('clear-canvas', handleRemoteClear);
            socket.off('cursor-move', handleRemoteCursorMove);
        };
    }, [socket, users]);

    useEffect(() => {
        const canvasManager = canvasRef.current?.getCanvasManager();
        if (!canvasManager) return;

        // Set up drawing callbacks
        canvasManager.onDrawStart = (stroke) => {
            stroke.userId = userId;
            sendDrawStart(stroke);
        };

        canvasManager.onDrawPoint = (strokeId, x, y) => {
            sendDrawPoint(strokeId, x, y);
        };

        canvasManager.onDrawEnd = (strokeId) => {
            sendDrawEnd(strokeId);
        };

        canvasManager.onCursorMove = (x, y) => {
            sendCursorMove(x, y);
        };

        canvasManager.onCursorsUpdated = () => {
            // Cursor updates are handled by the Canvas component
        };
    }, [userId, sendDrawStart, sendDrawPoint, sendDrawEnd, sendCursorMove]);

    useEffect(() => {
        const canvasManager = canvasRef.current?.getCanvasManager();
        if (canvasManager) {
            canvasManager.updateUsers?.(users);
        }
    }, [users]);

    const handleJoinRoom = (newRoomId) => {
        setRoomId(newRoomId);
        joinRoom(newRoomId, {});
    };

    const handleUndo = () => {
        sendUndo();
    };

    const handleRedo = () => {
        sendRedo();
    };

    const handleClear = () => {
        if (window.confirm('Clear the entire canvas? This action cannot be undone.')) {
            sendClearCanvas();
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#fff',
                borderBottom: '1px solid #e6e9ee'
            }}>
                <h1 style={{ margin: 0, fontSize: '20px' }}>Collaborative Canvas</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Users:</span>
                    <UserList users={users} />
                    {!isConnected && <span style={{ color: '#f54952' }}>(Disconnected)</span>}
                </div>
            </header>

            <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <Toolbar
                    tool={tool}
                    color={color}
                    width={width}
                    onToolChange={setTool}
                    onColorChange={setColor}
                    onWidthChange={setWidth}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onClear={handleClear}
                    roomId={roomId}
                    onJoinRoom={handleJoinRoom}
                    latency={latency}
                />

                <section style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                    <Canvas
                        ref={canvasRef}
                        tool={tool}
                        color={color}
                        width={width}
                        users={users}
                    />
                </section>
            </main>

            <footer style={{
                textAlign: 'center',
                padding: '8px',
                fontSize: '12px',
                color: '#666'
            }}>
                <small>Collaborative Canvas - Real-time multi-user drawing</small>
            </footer>
        </div>
    );
}

export default App;

