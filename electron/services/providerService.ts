import { getDatabase } from "./database";
import type { AiProviderConfig } from "../../shared/types";

const defaultProviders: AiProviderConfig[] = [
  {
    id: "ollama-local",
    name: "Ollama Local",
    kind: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    modelHint: "llama3.1 / qwen / mistral",
    status: "configured",
    notes: "Pronto para conectar modelos locais via API HTTP do Ollama.",
  },
  {
    id: "openai-compatible",
    name: "OpenAI-compatible",
    kind: "openai-compatible",
    baseUrl: "http://127.0.0.1:4000/v1",
    modelHint: "gpt-4o-mini, mistral, llama.cpp gateway",
    status: "attention",
    notes: "Camada generica para provedores compatíveis com a API /v1/chat/completions.",
  },
];

export function syncProviderRegistry(): void {
  const database = getDatabase();
  const statement = database.prepare(`
    INSERT INTO ai_providers (id, name, kind, base_url, model_hint, status, notes, updated_at)
    VALUES (@id, @name, @kind, @baseUrl, @modelHint, @status, @notes, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      kind = excluded.kind,
      base_url = excluded.base_url,
      model_hint = excluded.model_hint,
      status = excluded.status,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  const updatedAt = new Date().toISOString();
  const transaction = database.transaction((providers: AiProviderConfig[]) => {
    providers.forEach((provider) => {
      statement.run({
        ...provider,
        updatedAt,
      });
    });
  });

  transaction(defaultProviders);
}

export function listProviders(): AiProviderConfig[] {
  const database = getDatabase();
  const rows = database
    .prepare(
      `
        SELECT id, name, kind, base_url, model_hint, status, notes
        FROM ai_providers
        ORDER BY name ASC
      `
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      kind: row.kind as AiProviderConfig["kind"],
      baseUrl: String(row.base_url),
      modelHint: String(row.model_hint),
      status: row.status as AiProviderConfig["status"],
      notes: String(row.notes),
    }));
}
