# Architecture Documentation

## Overview

This collaborative canvas application enables multiple users to draw simultaneously on a shared canvas with real-time synchronization. The architecture is built using vanilla JavaScript (ES6 modules) on the frontend and Node.js with Socket.io on the backend.

## System Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client 1  │────────▶│             │◀────────│   Client 2  │
│  (Browser)  │         │   Server    │         │  (Browser)  │
└─────────────┘         │  (Node.js)  │         └─────────────┘
                        │  Socket.io  │
┌─────────────┐         │             │         ┌─────────────┐
│   Client 3  │────────▶│             │◀────────│   Client N  │
│  (Browser)  │         │             │         │  (Browser)  │
└─────────────┘         └─────────────┘         └─────────────┘
```

## Data Flow

### Drawing Event Flow

```
User Action (Mouse/Touch)
    ↓
CanvasManager.handleStart/Point/End()
    ↓
WebSocketManager.sendDrawStart/Point/End()
    ↓
Socket.io Client → Server
    ↓
Server: DrawingState.addStroke/Point()
    ↓
Server: Broadcast to other clients in room
    ↓
Remote Clients: CanvasManager.addRemoteStroke/Point()
    ↓
Canvas Rendering (real-time update)
```

### State Synchronization Flow

```
Client A draws → Server stores state → Broadcast to Clients B, C, D
    ↓
All clients maintain local canvas state
    ↓
On conflict: Server is source of truth
    ↓
New client joins → Server sends complete canvas state
```

## WebSocket Protocol

### Client → Server Events

#### `join-room`
Join or switch to a room.

```javascript
socket.emit('join-room', roomId, userInfo)
// userInfo: { name: string, color: string }
```

#### `draw-start`
Initiate a new stroke.

```javascript
socket.emit('draw-start', {
    strokeId: string,    // Unique stroke identifier
    x: number,           // Starting X coordinate
    y: number,           // Starting Y coordinate
    color: string,       // Stroke color (hex)
    width: number,       // Stroke width in pixels
    tool: string         // 'brush' or 'eraser'
})
```

#### `draw-point`
Add a point to an ongoing stroke.

```javascript
socket.emit('draw-point', {
    strokeId: string,    // Stroke identifier
    x: number,           // Point X coordinate
    y: number            // Point Y coordinate
})
```

#### `draw-end`
Complete a stroke.

```javascript
socket.emit('draw-end', {
    strokeId: string     // Stroke identifier
})
```

#### `cursor-move`
Update cursor position for other users.

```javascript
socket.emit('cursor-move', {
    x: number,           // Cursor X coordinate
    y: number            // Cursor Y coordinate
})
```

#### `undo`
Request undo of last stroke.

```javascript
socket.emit('undo')
```

#### `redo`
Request redo of last undone stroke.

```javascript
socket.emit('redo')
```

#### `clear-canvas`
Clear the entire canvas.

```javascript
socket.emit('clear-canvas')
```

#### `ping`
Latency measurement (callback-based).

```javascript
socket.emit('ping', (callback) => {
    // Server responds immediately
})
```

### Server → Client Events

#### `canvas-state`
Initial canvas state when joining a room.

```javascript
socket.on('canvas-state', (data) => {
    data.strokes: Array<Stroke>  // All existing strokes
    data.history: Array<string>   // Stroke IDs in order
})
```

#### `draw-start`
Remote user started drawing.

```javascript
socket.on('draw-start', (data) => {
    data.strokeId: string
    data.userId: string
    data.x: number
    data.y: number
    data.color: string
    data.width: number
    data.tool: string
})
```

#### `draw-point`
Remote user added a point.

```javascript
socket.on('draw-point', (data) => {
    data.strokeId: string
    data.userId: string
    data.x: number
    data.y: number
})
```

#### `draw-end`
Remote user finished a stroke.

```javascript
socket.on('draw-end', (data) => {
    data.strokeId: string
    data.userId: string
})
```

#### `cursor-move`
Remote user cursor movement.

```javascript
socket.on('cursor-move', (data) => {
    data.userId: string
    data.x: number
    data.y: number
})
```

#### `undo`
Stroke was undone by any user.

```javascript
socket.on('undo', (data) => {
    data.strokeId: string  // ID of undone stroke
    data.userId: string    // User who performed undo
})
```

#### `redo`
Stroke was redone by any user.

```javascript
socket.on('redo', (data) => {
    data.strokeId: string  // ID of redone stroke
    data.stroke: Stroke    // Complete stroke data
    data.userId: string    // User who performed redo
})
```

#### `clear-canvas`
Canvas was cleared.

```javascript
socket.on('clear-canvas', (data) => {
    data.userId: string  // User who cleared canvas
})
```

#### `user-joined`
A user joined the room.

```javascript
socket.on('user-joined', (data) => {
    data.userId: string
    data.name: string
    data.color: string
})
```

#### `user-left`
A user left the room.

```javascript
socket.on('user-left', (data) => {
    data.userId: string
})
```

#### `users-updated`
Updated list of users in the room.

```javascript
socket.on('users-updated', (users) => {
    users: Array<{
        id: string
        name: string
        color: string
        socketId: string
    }>
})
```

## Undo/Redo Strategy

### Global Undo/Redo Implementation

The undo/redo system maintains a global operation history across all users:

1. **Server-Side State Management**:
   - `DrawingState` maintains two stacks:
     - `history`: Array of stroke IDs in creation order
     - `undoStack`: Array of undone stroke IDs
   
2. **Undo Operation**:
   - User requests undo → Server pops last stroke from `history`
   - Stroke ID is pushed to `undoStack`
   - Server broadcasts undo event to all clients
   - All clients remove the stroke from their canvas

3. **Redo Operation**:
   - User requests redo → Server pops stroke from `undoStack`
   - Stroke ID is pushed back to `history`
   - Server broadcasts redo event with complete stroke data
   - All clients restore the stroke to their canvas

4. **Conflict Resolution**:
   - When a new stroke is created, the `undoStack` is cleared
   - This ensures linear history - you can't redo after new drawing
   - Last-write-wins for simultaneous operations (server processes in order)

### Limitations

- **Linear History**: Undo/redo is global and linear, not per-user
- **No Branching**: Cannot undo individual user actions separately
- **New Stroke Clears Redo**: Drawing a new stroke clears the redo stack

## Conflict Resolution

### Simultaneous Drawing

1. **Event Ordering**: Server processes events in the order received
2. **Stroke Isolation**: Each stroke has a unique ID, preventing conflicts
3. **Point Merging**: Points are added sequentially to strokes
4. **Last-Write-Wins**: If two users modify the same area, both strokes are preserved

### Network Latency Handling

1. **Optimistic Rendering**: Local drawing appears immediately
2. **Server Confirmation**: Server validates and broadcasts events
3. **State Reconciliation**: On reconnection, server sends complete state
4. **Throttling**: Client-side throttling prevents event flooding (16ms = ~60fps)

## Performance Decisions

### Canvas Optimization

1. **Path Optimization**:
   - Points are only added if they're far enough from the previous point
   - Distance threshold: `width * 0.3` (adaptive based on stroke width)
   - Reduces number of points for smooth curves

2. **Rendering Strategy**:
   - **Real-time**: Draw segments as points arrive (throttled to 60fps)
   - **Full Redraw**: Only when needed (undo, redo, clear, resize)
   - **Quadratic Curves**: Used for smooth stroke rendering

3. **Device Pixel Ratio**:
   - Canvas is scaled by device pixel ratio for crisp rendering
   - Coordinates are stored in CSS pixels for consistency
   - Context is scaled internally for high-DPI displays

### Network Optimization

1. **Event Batching**: Points are sent individually for real-time sync
2. **Throttling**: Cursor movement is throttled to prevent flooding
3. **Compression**: Socket.io handles message compression automatically
4. **Room Isolation**: Events are only broadcast within the same room

### Memory Management

1. **Stroke Storage**: Strokes are stored as objects with point arrays
2. **Map Data Structure**: O(1) lookup for strokes by ID
3. **Ordered Array**: Stroke order maintained separately for rendering
4. **Cleanup**: Strokes are removed on undo, but kept in undo stack for redo

## Room Management

### Room System

- **Room Isolation**: Each room has its own drawing state
- **User Assignment**: Users are assigned unique colors per room
- **State Persistence**: Room state persists while at least one user is connected
- **Auto-Cleanup**: Rooms are deleted when empty (no users)

### User Management

- **Color Assignment**: Users are assigned colors from a predefined palette
- **User Tracking**: Server tracks users by socket ID
- **Disconnect Handling**: Users are removed on disconnect
- **Reconnection**: Reconnecting users get a new socket ID (treated as new user)

## Security Considerations

1. **No Authentication**: Currently no user authentication (as per requirements)
2. **Input Validation**: Server validates stroke data (coordinates, colors, etc.)
3. **Room Isolation**: Users can only affect their current room
4. **Rate Limiting**: Client-side throttling prevents abuse (can be enhanced server-side)

## Scalability Considerations

### Current Limitations

1. **In-Memory Storage**: State is stored in memory (lost on server restart)
2. **Single Server**: No horizontal scaling support
3. **No Persistence**: Canvas state is not persisted to database

### Potential Improvements

1. **Redis Backend**: Store room state in Redis for multi-server support
2. **Database Persistence**: Save canvas state to database for persistence
3. **Load Balancing**: Use Socket.io Redis adapter for multi-server
4. **CDN**: Serve static files from CDN
5. **Compression**: Implement stroke data compression for large drawings
6. **Lazy Loading**: Load canvas state incrementally for large drawings

## Error Handling

### Client-Side

1. **Connection Errors**: Automatic reconnection with exponential backoff
2. **Canvas Errors**: Graceful degradation if canvas operations fail
3. **Network Errors**: Queue events when offline, sync on reconnect

### Server-Side

1. **Invalid Events**: Server validates all incoming events
2. **Room Errors**: Default to 'default' room if room doesn't exist
3. **State Errors**: Server recreates room state if corrupted

## Testing Strategy

### Manual Testing

1. **Multi-User Testing**: Open multiple browser windows/tabs
2. **Network Simulation**: Test with throttled network (Chrome DevTools)
3. **Cross-Browser**: Test in Chrome, Firefox, Safari
4. **Mobile Testing**: Test touch events on mobile devices

### Automated Testing (Future)

1. **Unit Tests**: Test CanvasManager, DrawingState, RoomManager
2. **Integration Tests**: Test WebSocket communication
3. **Load Tests**: Test with multiple concurrent users
4. **E2E Tests**: Test complete user workflows

## Limitations

1. **No Persistence**: Canvas state is lost on server restart
2. **Linear Undo/Redo**: Cannot undo individual user actions
3. **No Authentication**: Anyone can join any room
4. **No Stroke Limits**: No limit on number of strokes (memory concern)
5. **No Compression**: Large drawings may cause performance issues
6. **Mobile Performance**: May struggle with complex drawings on mobile devices

## Future Improvements

1. **User Authentication** - Add login/user profiles
2. **Keyboard Shortcuts** - Add Ctrl+Z, Ctrl+Y, etc.
3. **Shape Tools** - Rectangle, circle, line drawing
4. **Layers** - Support for layer management
5. **Export** - Save canvas as image
6. **Chat** - Add text chat feature
7. **Analytics** - Track usage and performance
8. **Mobile** - Optimize for touch devices
8. **Image Support**: Allow image uploads and drawing on images
9. **Export/Import**: Export canvas as image or JSON
10. **History Timeline**: Visual timeline of drawing history



