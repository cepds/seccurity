import type { UpdateStatus } from "../../shared/types";

export function getMockUpdateStatus(currentVersion: string): UpdateStatus {
  const checkedAt = new Date().toISOString();

  return {
    currentVersion,
    latestVersion: currentVersion,
    state: "mocked",
    lastCheckedAt: checkedAt,
    note: "Status de update mockado para a fase inicial. Endpoint real entra depois.",
  };
}
