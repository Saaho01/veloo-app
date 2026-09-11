import { io, Socket } from "socket.io-client";

export type SignalPayload = Record<string, unknown>;

export type SignalingEvent =
  | "presence:update"
  | "call:incoming"
  | "call:accepted"
  | "call:rejected"
  | "call:ended"
  | "call:peer-left"
  | "rtc:offer"
  | "rtc:answer"
  | "rtc:ice-candidate"
  | "rtc:renegotiate";

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || "http://localhost:4000";

/**
 * Thin wrapper around the Socket.IO client. Keeping this isolated means the
 * WebRTC/call logic never touches transport details directly, and the whole
 * transport can be swapped (e.g. for a raw WebSocket) without touching UI
 * or peer-connection code.
 */
export class SignalingClient {
  private socket: Socket | null = null;

  connect(userId: string, displayName: string): Socket {
    if (this.socket?.connected) return this.socket;
    this.socket = io(SIGNALING_URL, {
      auth: { userId, displayName },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get isConnected() {
    return !!this.socket?.connected;
  }

  on(event: SignalingEvent, handler: (payload: any) => void) {
    this.socket?.on(event, handler);
  }

  off(event: SignalingEvent, handler?: (payload: any) => void) {
    this.socket?.off(event, handler);
  }

  emit(event: string, payload: SignalPayload) {
    if (!this.socket?.connected) {
      console.warn(`[signaling] tried to emit "${event}" while disconnected`);
      return;
    }
    this.socket.emit(event, payload);
  }
}

export const signalingClient = new SignalingClient();
