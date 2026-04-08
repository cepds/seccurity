export type NavigationTabId = "overview" | "apps" | "logs";

export type ToolId =
  | "nmap"
  | "wireshark"
  | "owasp-zap"
  | "process-hacker"
  | "forensix-studio"
  | "hashcat"
  | "john-the-ripper";

export type ToolCategory =
  | "network"
  | "traffic-analysis"
  | "proxy"
  | "process-inspection"
  | "forensics"
  | "password-audit";

export type LogLevel = "info" | "success" | "warn" | "error";
export type EventSeverity = "info" | "low" | "medium" | "high" | "critical";
export type ToolPathSource = "auto" | "manual" | "missing";
export type AppSessionStatus = "active" | "closed" | "failed";
export type WorkspaceLayoutMode = "manual" | "grid" | "focus";
export type WorkspaceWindowSlot = "manual" | "left" | "right" | "top" | "bottom" | "center";

export type ProviderKind = "ollama" | "openai-compatible";

export type ProviderStatus = "ready" | "configured" | "attention";

export type RuntimeMode = "desktop" | "browser-preview";

export type UpdateState = "current" | "available" | "mocked";

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  category: ToolCategory;
  executableNames: string[];
  commonPathTemplates: string[];
  versionCommand?: string[];
}

export interface DetectedTool {
  id: ToolId;
  name: string;
  description: string;
  category: ToolCategory;
  detected: boolean;
  executableName: string;
  autoDetectedPath: string | null;
  manualPath: string | null;
  installPath: string | null;
  pathSource: ToolPathSource;
  version: string | null;
  launchable: boolean;
  lastCheckedAt: string | null;
  lastLaunchedAt: string | null;
}

export interface AppLogEntry {
  id: number;
  level: LogLevel;
  scope: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface StandardizedEvent {
  id: number;
  timestamp: string;
  source: string;
  type: string;
  target: string;
  severity: EventSeverity;
  data: Record<string, unknown>;
}

export interface AppSession {
  id: string;
  toolId: ToolId;
  workspaceId: string | null;
  executablePath: string | null;
  launchSource: string;
  status: AppSessionStatus;
  startedAt: string;
  endedAt: string | null;
  pid: number | null;
  exitCode: number | null;
  metadata: Record<string, unknown> | null;
}

export interface WorkspaceAppAssignment {
  workspaceId: string;
  toolId: ToolId;
  enabled: boolean;
  launchOrder: number;
  windowSlot: WorkspaceWindowSlot;
}

export interface WorkspaceDefinition {
  id: string;
  name: string;
  description: string;
  layoutMode: WorkspaceLayoutMode;
  assignments: WorkspaceAppAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface AiProviderConfig {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  modelHint: string;
  status: ProviderStatus;
  notes: string;
}

export interface UpdateStatus {
  currentVersion: string;
  latestVersion: string;
  state: UpdateState;
  lastCheckedAt: string;
  note: string;
}

export interface AppOverview {
  appName: string;
  runtimeMode: RuntimeMode;
  osLabel: string;
  storageEngine: string;
  currentVersion: string;
  installedToolCount: number;
  totalToolCount: number;
  providerCount: number;
  activeSessionCount: number;
  workspaceCount: number;
  eventCount: number;
  lastScanAt: string | null;
  updateStatus: UpdateStatus;
  providers: AiProviderConfig[];
}

export interface DesktopBootstrap {
  overview: AppOverview;
  tools: DetectedTool[];
  logs: AppLogEntry[];
  sessions: AppSession[];
  workspaces: WorkspaceDefinition[];
  events: StandardizedEvent[];
}

export interface LaunchToolResult {
  ok: boolean;
  toolId: ToolId;
  message: string;
  sessionId?: string;
}

export interface SetToolExecutablePathResult {
  ok: boolean;
  tool: DetectedTool;
  message: string;
}

export interface OpenWorkspaceResult {
  ok: boolean;
  workspaceId: string;
  launchedCount: number;
  message: string;
}

export interface DesktopApi {
  bootstrap: () => Promise<DesktopBootstrap>;
  scanTools: () => Promise<DetectedTool[]>;
  launchTool: (toolId: ToolId) => Promise<LaunchToolResult>;
  setToolExecutablePath: (toolId: ToolId, executablePath: string | null) => Promise<SetToolExecutablePathResult>;
  getLogs: (limit?: number) => Promise<AppLogEntry[]>;
  getEvents: (limit?: number) => Promise<StandardizedEvent[]>;
  checkForUpdates: () => Promise<UpdateStatus>;
  launchWorkspace: (workspaceId: string) => Promise<OpenWorkspaceResult>;
}
