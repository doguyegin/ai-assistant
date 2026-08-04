"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";

type Handlers = Record<string, (payload: never) => void>;

export function useTenantSocket(
  tenantId: string | null,
  handlers: Handlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!tenantId) return;

    const socket: Socket = io(API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      socket.emit("join-tenant", tenantId);
    });

    const events = Object.keys(handlersRef.current);
    for (const event of events) {
      socket.on(event, (payload: unknown) => {
        const fn = handlersRef.current[event];
        if (fn) fn(payload as never);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [tenantId]);
}
