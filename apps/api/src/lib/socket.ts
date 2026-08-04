import type { Server } from "socket.io";

let io: Server | null = null;

export function setIo(server: Server) {
  io = server;
}

export function getIo() {
  return io;
}

export function emitToTenant(tenantId: string, event: string, payload: unknown) {
  io?.to(`tenant:${tenantId}`).emit(event, payload);
}
