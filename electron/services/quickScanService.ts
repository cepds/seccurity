import { createEvent } from "../../backend/db/repositories/eventsRepo";
import { logEvent } from "./logger";
import type { EventSeverity } from "../../shared/types";

export interface QuickScanResult {
  target: string;
  startedAt: string;
  finishedAt: string;
  createdEventIds: number[];
}

interface MockEventTemplate {
  offsetMs: number;
  source: string;
  type: string;
  target: string;
  severity: EventSeverity;
  payload: Record<string, unknown>;
}

function buildMockQuickScanEvents(target: string): MockEventTemplate[] {
  return [
    {
      offsetMs: 0,
      source: "quick-scan",
      type: "scan.started",
      target,
      severity: "info",
      payload: {
        scanner: "nmap-like",
        mode: "quick",
        command: `nmap -Pn -T4 ${target}`,
      },
    },
    {
      offsetMs: 300,
      source: "quick-scan",
      type: "host.discovered",
      target,
      severity: "low",
      payload: {
        state: "up",
        latency_ms: 11,
      },
    },
    {
      offsetMs: 700,
      source: "quick-scan",
      type: "port.open",
      target: `${target}:22`,
      severity: "medium",
      payload: {
        port: 22,
        protocol: "tcp",
        service: "ssh",
        state: "open",
      },
    },
    {
      offsetMs: 1100,
      source: "quick-scan",
      type: "port.open",
      target: `${target}:80`,
      severity: "medium",
      payload: {
        port: 80,
        protocol: "tcp",
        service: "http",
        state: "open",
      },
    },
    {
      offsetMs: 1500,
      source: "quick-scan",
      type: "service.detected",
      target: `${target}:80`,
      severity: "low",
      payload: {
        port: 80,
        banner: "nginx 1.24.0",
        tls: false,
      },
    },
    {
      offsetMs: 1900,
      source: "quick-scan",
      type: "scan.completed",
      target,
      severity: "info",
      payload: {
        scanned_ports: 1000,
        open_ports: [22, 80],
        duration_ms: 1900,
      },
    },
  ];
}

export function runQuickScan(target: string): QuickScanResult {
  const normalizedTarget = target.trim();
  if (!normalizedTarget) {
    throw new Error("O target do quick scan nao pode ficar vazio.");
  }

  const startedAt = new Date().toISOString();
  const mockEvents = buildMockQuickScanEvents(normalizedTarget);
  const createdEventIds = mockEvents.map((eventTemplate) => {
    const timestamp = new Date(new Date(startedAt).getTime() + eventTemplate.offsetMs).toISOString();

    const savedEvent = createEvent({
      timestamp,
      source: eventTemplate.source,
      type: eventTemplate.type,
      target: eventTemplate.target,
      severity: eventTemplate.severity,
      data_json: JSON.stringify({
        ...eventTemplate.payload,
        target: normalizedTarget,
      }),
    });

    return savedEvent.id;
  });

  const finishedAt = new Date(
    new Date(startedAt).getTime() + mockEvents.at(-1)!.offsetMs
  ).toISOString();

  logEvent("success", "quick-scan", "Quick scan mock finalizado e persistido em eventos.", {
    target: normalizedTarget,
    createdEventIds,
    startedAt,
    finishedAt,
  });

  return {
    target: normalizedTarget,
    startedAt,
    finishedAt,
    createdEventIds,
  };
}
