export class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.userColors = [
            '#f54952',
            '#753bbd',
            '#009944',
            '#f5a201',
            '#ff5883',
            '#00bcd4',
            '#9c27b0',
            '#ff9800',
        ];
        this.colorIndex = 0;
    }
    addUser(roomId, socketId, userInfo) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map());
        }
        const room = this.rooms.get(roomId);
        // Assign color if not provided
        const color = userInfo?.color || this.getNextColor();
        const name = userInfo?.name || `User ${socketId.slice(0, 6)}`;
        const user = {
            id: socketId,
            name,
            color,
            socketId,
        };
        room.set(socketId, user);
        return user;
    }
    removeUser(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(socketId);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }
    }
    getUsers(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return [];
        return Array.from(room.values());
    }
    getUser(roomId, socketId) {
        const room = this.rooms.get(roomId);
        return room?.get(socketId);
    }
    getNextColor() {
        const color = this.userColors[this.colorIndex % this.userColors.length];
        this.colorIndex++;
        return color;
    }
    getUserCount(roomId) {
        const room = this.rooms.get(roomId);
        return room ? room.size : 0;
    }
}
