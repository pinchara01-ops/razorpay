import type { AuditEvent } from "@/lib/types";

let eventCounter = 0;

export function createAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  eventCounter += 1;
  return {
    id: `evt_${eventCounter.toString().padStart(4, "0")}`,
    timestamp: new Date().toISOString(),
    ...event
  };
}
