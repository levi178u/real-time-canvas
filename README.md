# Collaborative Canvas - Real-Time Multi-User Drawing Application

A real-time collaborative drawing application where multiple users can draw simultaneously on a shared canvas with instant synchronization.

## Features

### Core Features
-  **Real-time Drawing**: See other users' drawings as they draw (not after they finish)
-  **Drawing Tools**: Brush and eraser with customizable colors and stroke width
-  **User Indicators**: See where other users are currently drawing with cursor positions
-  **Global Undo/Redo**: Undo and redo operations work across all users
-  **User Management**: See who's online and assign unique colors to users
-  **Room System**: Create multiple isolated canvas rooms
-  **Mobile Support**: Touch events for mobile devices
-  **Latency Tracking**: Real-time latency measurement

### Technical Highlights
- **React 18**: Modern React with hooks for state management
- **HTML5 Canvas**: Raw Canvas API for drawing operations
- **WebSocket Communication**: Real-time bidirectional communication using Socket.io
- **Vite**: Fast build tool for development and production
- **Optimized Rendering**: Path optimization and efficient canvas operations
- **Conflict Resolution**: Handles simultaneous drawing from multiple users
- **State Synchronization**: Maintains consistent canvas state across all clients

##  Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd real-time-canvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development Mode** (Recommended for development)
   ```bash
   # Start backend server
   npm start
   
   # In another terminal, start frontend dev server
   npm run dev
   ```
   Then open `http://localhost:5173` in your browser (Vite dev server)

4. **Production Mode**
   ```bash
   # Build React app
   npm run build
   
   # Start server (serves built React app)
   npm start
   ```
   Then open `http://localhost:3000` in your browser

The application should now be running!

##  Usage

### Basic Drawing

1. **Select a tool**: Choose between Brush or Eraser from the toolbar
2. **Choose a color**: Click the color picker to select a color
3. **Adjust stroke width**: Use the slider to set the stroke width (1-40px)
4. **Start drawing**: Click and drag on the canvas to draw

### Collaborative Features

1. **Join a room**: Enter a room name and click "Join Room" (default: "default")
2. **See other users**: Other users' cursors will appear on the canvas
3. **Real-time sync**: Watch as other users draw in real-time
4. **Undo/Redo**: Use the Undo/Redo buttons to modify the canvas (affects all users)
5. **Clear canvas**: Click Clear to clear the entire canvas (requires confirmation)

### Testing with Multiple Users

To test the collaborative features:

1. **Open multiple browser windows/tabs**
   - Open `http://localhost:3000` in multiple windows
   - Or share the URL with others on the same network

2. **Join the same room**
   - Enter the same room name in all windows
   - Click "Join Room" in each window

3. **Start drawing**
   - Draw in one window and watch it appear in others in real-time
   - See other users' cursors as they move
   - Test undo/redo across all users

### Mobile Testing

The application supports touch events for mobile devices:
- Open the application on a mobile device
- Use your finger to draw on the canvas
- All collaborative features work on mobile

##  Project Structure

```
collaborative-canvas/
├── client/                 # Client-side code
│   ├── index.html         # Main HTML file
│   ├── style.css          # Stylesheet
│   ├── canvas.js          # Canvas drawing logic
│   ├── websocket.js       # WebSocket client
│   └── main.js            # App initialization
├── server/                # Server-side code
│   ├── server.js          # Express + Socket.io server
│   ├── rooms.js           # Room management
│   └── drawing-state.js   # Canvas state management
├── package.json           # Dependencies and scripts
├── README.md              # This file
└── ARCHITECTURE.md        # Architecture documentation
```

##  Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)

Example:
```bash
PORT=3000 npm start
```

### Room Configuration

- Default room: "default"
- Room names are case-sensitive
- Rooms are created automatically when first user joins
- Rooms are deleted when all users leave

##  API Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed API documentation, including:
- WebSocket protocol
- Event specifications
- Data flow diagrams
- Performance optimizations

##  Testing

### Manual Testing

1. **Single User Testing**
   - Test all drawing tools
   - Test undo/redo
   - Test clear canvas
   - Test room switching

2. **Multi-User Testing**
   - Open multiple browser windows
   - Join the same room
   - Test simultaneous drawing
   - Test cursor tracking
   - Test undo/redo across users

3. **Network Testing**
   - Test with throttled network (Chrome DevTools)
   - Test reconnection after disconnection
   - Test with high latency

### Browser Compatibility

-  Chrome (recommended)
-  Firefox
-  Edge

##  Known Limitations

1. **No Persistence**: Canvas state is lost on server restart
2. **Linear Undo/Redo**: Cannot undo individual user actions separately
3. **No Authentication**: Anyone can join any room
4. **No Stroke Limits**: No limit on number of strokes (memory concern)
5. **No Compression**: Large drawings may cause performance issues
6. **Mobile Performance**: May struggle with complex drawings on mobile devices

##  Future Enhancements

- [ ] Persistence: Save canvas state to database
- [ ] Authentication: Add user authentication and authorization
- [ ] Stroke Limits: Implement stroke limits or archiving
- [ ] Compression: Compress stroke data for transmission
- [ ] Layer System: Add layers for complex drawings
- [ ] Shapes: Add shape tools (rectangle, circle, etc.)
- [ ] Text Tool: Add text annotation capability
- [ ] Image Support: Allow image uploads and drawing on images
- [ ] Export/Import: Export canvas as image or JSON
- [ ] History Timeline: Visual timeline of drawing history

##  Development

### Running in Development Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

### Code Style

- Use ES6+ JavaScript features
- Use meaningful variable and function names
- Add comments for complex logic
- Follow the existing code structure

### Adding New Features

1. **Client-side**: Add code to `client/` directory
2. **Server-side**: Add code to `server/` directory
3. **Update documentation**: Update README.md and ARCHITECTURE.md
4. **Test thoroughly**: Test with multiple users before committing

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

##  Acknowledgments

- Built with [Socket.io](https://socket.io/) for real-time communication
- Uses [Express](https://expressjs.com/) for the web server
- Canvas API for drawing operations

##  Learning Resources

- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Socket.io Documentation](https://socket.io/docs/)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

**Built with ❤️ by Anshuman**
