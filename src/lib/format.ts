import type { ProviderKind, ToolCategory } from "../../shared/types";

const absoluteFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
});

export function formatAbsoluteTimestamp(value: string | null): string {
  if (!value) {
    return "Ainda nao executado";
  }

  return absoluteFormatter.format(new Date(value));
}

export function formatRelativeMinutes(value: string | null): string {
  if (!value) {
    return "sem historico";
  }

  const deltaMs = Date.now() - new Date(value).getTime();
  const deltaMinutes = Math.max(0, Math.round(deltaMs / 60000));

  if (deltaMinutes < 1) {
    return "agora";
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes} min`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  return `${deltaHours} h`;
}

export function formatToolCategory(category: ToolCategory): string {
  const labels: Record<ToolCategory, string> = {
    network: "Rede",
    "traffic-analysis": "Trafego",
    proxy: "Proxy",
    "process-inspection": "Processos",
    forensics: "Forense",
    "password-audit": "Auditoria de hash",
  };

  return labels[category];
}

export function formatProviderKind(kind: ProviderKind): string {
  const labels: Record<ProviderKind, string> = {
    ollama: "Ollama",
    "openai-compatible": "OpenAI-compatible",
  };

  return labels[kind];
}
