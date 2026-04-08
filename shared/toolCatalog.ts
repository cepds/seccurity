import type { ToolDefinition } from "./types";

export const toolCatalog: ToolDefinition[] = [
  {
    id: "nmap",
    name: "Nmap",
    description: "Scanner de rede e inventario de hosts para verificacao local.",
    category: "network",
    executableNames: ["nmap.exe"],
    commonPathTemplates: [
      "{programFiles}\\Nmap\\nmap.exe",
      "{programFilesX86}\\Nmap\\nmap.exe",
      "{tools}\\Nmap\\nmap.exe",
    ],
    versionCommand: ["--version"],
  },
  {
    id: "wireshark",
    name: "Wireshark",
    description: "Analise de trafego, captura local e inspecao de pacotes.",
    category: "traffic-analysis",
    executableNames: ["Wireshark.exe"],
    commonPathTemplates: [
      "{programFiles}\\Wireshark\\Wireshark.exe",
      "{programFilesX86}\\Wireshark\\Wireshark.exe",
    ],
    versionCommand: ["--version"],
  },
  {
    id: "owasp-zap",
    name: "OWASP ZAP",
    description: "Proxy local para analise de aplicacoes web e testes autenticados.",
    category: "proxy",
    executableNames: ["ZAP.exe", "zap.exe"],
    commonPathTemplates: [
      "{programFiles}\\OWASP\\Zed Attack Proxy\\ZAP.exe",
      "{programFiles}\\ZAP\\Zed Attack Proxy\\ZAP.exe",
      "{programFilesX86}\\OWASP\\Zed Attack Proxy\\ZAP.exe",
    ],
    versionCommand: ["-version"],
  },
  {
    id: "process-hacker",
    name: "Process Hacker",
    description: "Inspecao de processos, handles e servicos em ambiente Windows.",
    category: "process-inspection",
    executableNames: ["ProcessHacker.exe"],
    commonPathTemplates: [
      "{programFiles}\\Process Hacker 2\\ProcessHacker.exe",
      "{programFiles}\\Process Hacker\\ProcessHacker.exe",
      "{programFilesX86}\\Process Hacker 2\\ProcessHacker.exe",
      "{programFilesX86}\\Process Hacker\\ProcessHacker.exe",
    ],
  },
  {
    id: "forensix-studio",
    name: "ForensiX Studio",
    description: "Coleta e triagem local para fluxos de forense digital.",
    category: "forensics",
    executableNames: ["ForensiX Studio.exe", "ForensiXStudio.exe"],
    commonPathTemplates: [
      "{programFiles}\\ForensiX Studio\\ForensiX Studio.exe",
      "{programFiles}\\ForensiX Studio\\ForensiXStudio.exe",
      "{programFilesX86}\\ForensiX Studio\\ForensiX Studio.exe",
    ],
  },
  {
    id: "hashcat",
    name: "Hashcat",
    description: "Motor local para auditoria de hashes com aceleracao por GPU.",
    category: "password-audit",
    executableNames: ["hashcat.exe"],
    commonPathTemplates: [
      "{tools}\\hashcat\\hashcat.exe",
      "{userProfile}\\tools\\hashcat\\hashcat.exe",
      "{downloads}\\hashcat\\hashcat.exe",
    ],
    versionCommand: ["--version"],
  },
  {
    id: "john-the-ripper",
    name: "John the Ripper",
    description: "Auditoria local de credenciais e hashes para validacao interna.",
    category: "password-audit",
    executableNames: ["john.exe"],
    commonPathTemplates: [
      "{tools}\\john\\run\\john.exe",
      "{userProfile}\\tools\\john\\run\\john.exe",
      "{downloads}\\john\\run\\john.exe",
      "{downloads}\\john-the-ripper\\run\\john.exe",
    ],
    versionCommand: ["--version"],
  },
];
