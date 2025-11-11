import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { CanvasManager } from '../lib/CanvasManager';

export const Canvas = forwardRef(({ 
    tool, 
    color, 
    width,
    users = []
}, ref) => {
    const canvasRef = useRef(null);
    const canvasManagerRef = useRef(null);
    const cursorsContainerRef = useRef(null);
    const drawingStatusRef = useRef(new Map()); 
    const [drawingUsers, setDrawingUsers] = useState(new Map()); // For UI updates

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvasManager = new CanvasManager(canvasRef.current);
        canvasManagerRef.current = canvasManager;

        // Set up cursor update handler
        canvasManager.onCursorsUpdated = (cursors) => {
            updateCursorsDisplay(cursors);
        };

        // Track drawing events from remote users
        canvasManager.onRemoteDrawStart = (userId) => {
            drawingStatusRef.current.set(userId, true);
            setDrawingUsers(new Map(drawingStatusRef.current));
        };

        canvasManager.onRemoteDrawEnd = (userId) => {
            drawingStatusRef.current.delete(userId);
            setDrawingUsers(new Map(drawingStatusRef.current));
        };

        return () => {
            if (canvasManagerRef.current) {
                window.removeEventListener('resize', canvasManagerRef.current.resizeCanvas);
            }
        };
    }, []);

    useImperativeHandle(ref, () => ({
        getCanvasManager: () => canvasManagerRef.current
    }));

    useEffect(() => {
        if (canvasManagerRef.current) {
            canvasManagerRef.current.setTool(tool);
        }
    }, [tool]);

    useEffect(() => {
        if (canvasManagerRef.current) {
            canvasManagerRef.current.setColor(color);
        }
    }, [color]);

    useEffect(() => {
        if (canvasManagerRef.current) {
            canvasManagerRef.current.setWidth(width);
        }
    }, [width]);

    const updateCursorsDisplay = (cursors) => {
        if (!cursorsContainerRef.current || !canvasRef.current) return;

        // Clear existing cursors
        cursorsContainerRef.current.innerHTML = '';

        // Add/update cursors for remote users
        cursors.forEach((cursorData, userId) => {
            const user = users.find(u => u.id === userId);
            if (!user) return;

            const canvasRect = canvasRef.current.getBoundingClientRect();
            const x = cursorData.x + canvasRect.left;
            const y = cursorData.y + canvasRect.top;

            // Check if user is currently drawing
            const isDrawing = drawingStatusRef.current.has(userId);

            const cursorEl = document.createElement('div');
            cursorEl.className = 'user-cursor';
            cursorEl.style.position = 'absolute';
            cursorEl.style.left = x + 'px';
            cursorEl.style.top = y + 'px';
            cursorEl.style.borderColor = user.color;
            cursorEl.style.borderWidth = '2px';
            cursorEl.style.borderStyle = 'solid';
            cursorEl.style.padding = '6px 10px';
            cursorEl.style.borderRadius = '4px';
            cursorEl.style.fontSize = '12px';
            cursorEl.style.fontWeight = '600';
            cursorEl.style.background = isDrawing 
                ? `linear-gradient(135deg, ${user.color}20, ${user.color}40)` 
                : 'rgba(0, 0, 0, 0.8)';
            cursorEl.style.color = 'white';
            cursorEl.style.whiteSpace = 'nowrap';
            cursorEl.style.pointerEvents = 'none';
            cursorEl.style.zIndex = '1000';
            cursorEl.style.boxShadow = isDrawing 
                ? `0 0 12px ${user.color}80, 0 2px 6px rgba(0, 0, 0, 0.3)`
                : '0 2px 6px rgba(0, 0, 0, 0.2)';
            cursorEl.style.transform = 'translate(-50%, -100%)';
            cursorEl.style.transition = 'all 0.1s ease';
            cursorEl.style.border = isDrawing 
                ? `2px solid ${user.color}`
                : '2px solid rgba(0, 0, 0, 0.5)';

            // Add animated dot indicator
            const dot = document.createElement('span');
            dot.style.display = 'inline-block';
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = user.color;
            dot.style.marginRight = '6px';
            dot.style.verticalAlign = 'middle';
            if (isDrawing) {
                dot.style.animation = 'pulse 1.5s ease-in-out infinite';
            }
            cursorEl.appendChild(dot);

            // Add user name
            const nameEl = document.createElement('span');
            nameEl.textContent = user.name || `User ${userId.slice(0, 6)}`;
            cursorEl.appendChild(nameEl);

            // Add drawing indicator if user is drawing
            if (isDrawing) {
                const drawingIndicator = document.createElement('span');
                drawingIndicator.style.marginLeft = '4px';
                drawingIndicator.style.fontSize = '10px';
                drawingIndicator.style.opacity = '0.9';
                drawingIndicator.textContent = '✏️';
                cursorEl.appendChild(drawingIndicator);
            }

            cursorsContainerRef.current.appendChild(cursorEl);
        });
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    background: 'white',
                    display: 'block',
                    cursor: 'crosshair'
                }}
            />
            <div
                ref={cursorsContainerRef}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    zIndex: 1000
                }}
            />
        </div>
    );
});

Canvas.displayName = 'Canvas';
