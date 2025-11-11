import { useState } from 'react';

export function Toolbar({ 
    tool, 
    color, 
    width, 
    onToolChange, 
    onColorChange, 
    onWidthChange, 
    onUndo, 
    onRedo, 
    onClear,
    roomId,
    onRoomChange,
    onJoinRoom,
    latency
}) {
    const [localRoomId, setLocalRoomId] = useState(roomId || 'default');

    return (
        <aside style={{
            width: '260px',
            padding: '12px',
            background: '#fff',
            borderRight: '1px solid #e6e9ee',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <div>
                <label>
                    Tool:
                    <select value={tool} onChange={(e) => onToolChange(e.target.value)} style={{ width: '100%', marginTop: '4px' }}>
                        <option value="brush">Brush</option>
                        <option value="eraser">Eraser</option>
                    </select>
                </label>
            </div>

            <div>
                <label>
                    Color:
                    <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => onColorChange(e.target.value)}
                        style={{ width: '100%', height: '40px', marginTop: '4px' }}
                    />
                </label>
            </div>

            <div>
                <label>
                    Width: {width}
                    <input 
                        type="range" 
                        min="1" 
                        max="40" 
                        value={width} 
                        onChange={(e) => onWidthChange(parseInt(e.target.value))}
                        style={{ width: '100%', marginTop: '4px' }}
                    />
                </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={onUndo}>Undo</button>
                <button onClick={onRedo}>Redo</button>
                <button onClick={onClear}>Clear</button>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e6e9ee' }}>
                <label>
                    Room:
                    <input 
                        type="text" 
                        value={localRoomId} 
                        onChange={(e) => setLocalRoomId(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                onJoinRoom(localRoomId);
                            }
                        }}
                        style={{ width: '100%', marginTop: '4px', padding: '4px' }}
                    />
                </label>
                <button 
                    onClick={() => onJoinRoom(localRoomId)}
                    style={{ width: '100%', marginTop: '8px' }}
                >
                    Join Room
                </button>
            </div>

            <div style={{ fontSize: '13px', color: '#666' }}>
                Latency: {Math.round(latency)} ms
            </div>
        </aside>
    );
}


