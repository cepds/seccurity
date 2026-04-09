export type NavigationTabId =
  | "overview"
  | "apps"
  | "workspaces"
  | "sessions"
  | "alerts"
  | "events"
  | "console"
  | "logs";

export type ToolId =
  | "nmap"
  | "wireshark"
  | "owasp-zap"
  | "process-hacker"
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
export type ToolPathSource = "auto" | "manual" | "registry" | "where" | "common" | "missing";
export type AppSessionStatus = "active" | "closed" | "failed";
export type WorkspaceSessionStatus = "active" | "finished" | "failed";
export type WorkspaceLayoutMode = "manual" | "grid" | "focus";
export type WorkspaceWindowSlot = "manual" | "left" | "right" | "top" | "bottom" | "center";

export type ProviderKind = "ollama" | "openai-compatible";

export type ProviderStatus = "ready" | "configured" | "attention";

export type RuntimeMode = "desktop" | "browser-preview";

export type UpdateState = "current" | "available" | "mocked";
export type TerminalOutputStream = "stdout" | "stderr" | "system";

export interface FeatureAvailability {
  enabled: boolean;
  reason: string | null;
}

export interface AppFeatureSet {
  console: FeatureAvailability;
}

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  category: ToolCategory;
  executableNames: string[];
  commonPathTemplates: string[];
  registryDisplayNames?: string[];
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

export interface WorkspaceSession {
  id: string;
  name: string;
  workspaceId: string | null;
  workspaceName: string | null;
  status: WorkspaceSessionStatus;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}

export interface AlertRecord {
  id: number;
  timestamp: string;
  title: string;
  severity: EventSeverity;
  source: string;
  relatedEventIds: number[];
  data: Record<string, unknown>;
  createdAt: string;
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
  alertCount: number;
  lastScanAt: string | null;
  updateStatus: UpdateStatus;
  providers: AiProviderConfig[];
  features: AppFeatureSet;
}

export interface DesktopBootstrap {
  overview: AppOverview;
  tools: DetectedTool[];
  logs: AppLogEntry[];
  sessions: AppSession[];
  workspaceSessions: WorkspaceSession[];
  workspaces: WorkspaceDefinition[];
  alerts: AlertRecord[];
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

export interface ToolSaveInput {
  toolId: ToolId;
  executablePath: string | null;
}

export interface ToolBrowseResult {
  canceled: boolean;
  executablePath: string | null;
}

export interface WorkspaceCreateInput {
  name: string;
  description?: string;
}

export interface WorkspaceUpdateInput {
  workspaceId: string;
  name: string;
}

export interface WorkspaceAssignmentUpdateInput {
  workspaceId: string;
  toolId: ToolId;
  enabled: boolean;
  launchOrder: number;
  windowSlot: WorkspaceWindowSlot;
}

export interface OpenWorkspaceResult {
  ok: boolean;
  workspaceId: string;
  sessionId?: string;
  alertCount?: number;
  launchedCount: number;
  message: string;
}

export interface FinishWorkspaceSessionResult {
  session: WorkspaceSession;
  alertCount: number;
  message: string;
}

export interface SessionReportSnapshot {
  session: WorkspaceSession;
  alerts: AlertRecord[];
  events: StandardizedEvent[];
  generatedAt: string;
}

export interface TerminalSessionInfo {
  id: string;
  shell: string;
  cwd: string;
  startedAt: string;
  isActive: boolean;
}

export interface TerminalOutputChunk {
  sessionId: string;
  text: string;
  stream: TerminalOutputStream;
  timestamp: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  exitCode: number;
  signal: number | null;
  timestamp: string;
}

export interface DesktopApi {
  bootstrap: () => Promise<DesktopBootstrap>;
  listTools: () => Promise<DetectedTool[]>;
  getToolIcon: (executablePath: string | null) => Promise<string | null>;
  saveTool: (input: ToolSaveInput) => Promise<SetToolExecutablePathResult>;
  browseToolExecutablePath: (toolId: ToolId) => Promise<ToolBrowseResult>;
  listWorkspaces: () => Promise<WorkspaceDefinition[]>;
  listWorkspaceSessions: () => Promise<WorkspaceSession[]>;
  finishWorkspaceSession: (sessionId: string) => Promise<FinishWorkspaceSessionResult>;
  listAlerts: () => Promise<AlertRecord[]>;
  createWorkspace: (input: WorkspaceCreateInput) => Promise<WorkspaceDefinition>;
  updateWorkspace: (input: WorkspaceUpdateInput) => Promise<WorkspaceDefinition>;
  updateWorkspaceAssignment: (
    input: WorkspaceAssignmentUpdateInput
  ) => Promise<WorkspaceDefinition>;
  scanTools: () => Promise<DetectedTool[]>;
  launchTool: (toolId: ToolId) => Promise<LaunchToolResult>;
  setToolExecutablePath: (toolId: ToolId, executablePath: string | null) => Promise<SetToolExecutablePathResult>;
  getLogs: (limit?: number) => Promise<AppLogEntry[]>;
  getEvents: (limit?: number) => Promise<StandardizedEvent[]>;
  checkForUpdates: () => Promise<UpdateStatus>;
  launchWorkspace: (workspaceId: string) => Promise<OpenWorkspaceResult>;
  createTerminalSession: (cwd?: string) => Promise<TerminalSessionInfo>;
  writeToTerminal: (sessionId: string, data: string) => Promise<void>;
  stopTerminalSession: (sessionId: string) => Promise<void>;
  onTerminalOutput: (listener: (chunk: TerminalOutputChunk) => void) => () => void;
  onTerminalExit: (listener: (event: TerminalExitEvent) => void) => () => void;
}
