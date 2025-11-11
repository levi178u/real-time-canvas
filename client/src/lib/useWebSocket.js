import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useWebSocket(url = undefined) {
    const socketUrl = url || (import.meta.env.DEV ? 'http://localhost:3000' : '');
    const [isConnected, setIsConnected] = useState(false);
    const [userId, setUserId] = useState(null);
    const [latency, setLatency] = useState(0);
    const [users, setUsers] = useState([]);
    const socketRef = useRef(null);
    const lastCursorUpdateRef = useRef(0);
    const cursorThrottle = 50;

    useEffect(() => {
        const socket = io(socketUrl || window.location.origin, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            setUserId(socket.id);
            socket.emit('join-room', 'default', {});
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('users-updated', (usersList) => {
            setUsers(usersList);
        });

        const latencyInterval = setInterval(() => {
            if (socket.connected) {
                const start = Date.now();
                socket.emit('ping', () => {
                    setLatency(Date.now() - start);
                });
            }
        }, 1000);

        return () => {
            clearInterval(latencyInterval);
            socket.disconnect();
        };
    }, [socketUrl]);

    const joinRoom = useCallback((roomId, userInfo = {}) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('join-room', roomId, userInfo);
        }
    }, []);

    const sendDrawStart = useCallback((strokeData) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('draw-start', {
                strokeId: strokeData.id,
                x: strokeData.points[0].x,
                y: strokeData.points[0].y,
                color: strokeData.color,
                width: strokeData.width,
                tool: strokeData.tool
            });
        }
    }, []);

    const sendDrawPoint = useCallback((strokeId, x, y) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('draw-point', {
                strokeId,
                x,
                y
            });
        }
    }, []);

    const sendDrawEnd = useCallback((strokeId) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('draw-end', {
                strokeId
            });
        }
    }, []);

    const sendCursorMove = useCallback((x, y) => {
        const now = Date.now();
        if (now - lastCursorUpdateRef.current < cursorThrottle) {
            return;
        }
        lastCursorUpdateRef.current = now;

        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('cursor-move', {
                x,
                y
            });
        }
    }, []);

    const sendUndo = useCallback(() => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('undo');
        }
    }, []);

    const sendRedo = useCallback(() => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('redo');
        }
    }, []);

    const sendClearCanvas = useCallback(() => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('clear-canvas');
        }
    }, []);

    const on = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    }, []);

    const off = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    }, []);

    return {
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
        socket: socketRef.current
    };
}

