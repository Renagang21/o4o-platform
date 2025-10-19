import { Server as SocketServer } from 'socket.io';
interface SessionEventData {
    userId: string;
    event: 'created' | 'removed' | 'logout_all' | 'refreshed';
    sessionId?: string;
    timestamp: number;
}
export declare class WebSocketSessionSync {
    private io;
    private userSockets;
    private sessionSubscriber;
    constructor(io: SocketServer);
    private setupRedisSubscriber;
    private setupSocketHandlers;
    private handleSessionEvent;
    private addUserSocket;
    private removeUserSocket;
    broadcastSessionEvent(userId: string, event: SessionEventData['event'], sessionId?: string): void;
    destroy(): Promise<void>;
}
export {};
//# sourceMappingURL=sessionSync.d.ts.map