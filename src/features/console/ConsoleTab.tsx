import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatAbsoluteTimestamp } from "../../lib/format";
import type { TerminalOutputChunk, TerminalSessionInfo } from "../../../shared/types";
import styles from "./ConsoleTab.module.css";

interface ConsoleTabProps {
  terminalSession: TerminalSessionInfo | null;
  terminalOutput: TerminalOutputChunk[];
  isStartingTerminal: boolean;
  onInitializeTerminal: () => Promise<TerminalSessionInfo | null>;
  onSendCommand: (command: string) => Promise<void>;
  onClearOutput: () => void;
}

export function ConsoleTab({
  terminalSession,
  terminalOutput,
  isStartingTerminal,
  onInitializeTerminal,
  onSendCommand,
  onClearOutput,
}: ConsoleTabProps) {
  const [command, setCommand] = useState("");
  const outputViewportRef = useRef<HTMLDivElement | null>(null);

  const terminalText = useMemo(() => {
    return terminalOutput.map((chunk) => chunk.text).join("");
  }, [terminalOutput]);

  useEffect(() => {
    void onInitializeTerminal();
  }, [onInitializeTerminal]);

  useEffect(() => {
    const outputViewport = outputViewportRef.current;
    if (!outputViewport) {
      return;
    }

    outputViewport.scrollTop = outputViewport.scrollHeight;
  }, [terminalText]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCommand = command.trim();
    if (!normalizedCommand) {
      return;
    }

    await onSendCommand(normalizedCommand);
    setCommand("");
  }

  return (
    <section className={styles.consoleTab}>
      <header className={styles.header}>
        <div>
          <p className={styles.sectionLabel}>Console</p>
          <h2 className={styles.sectionTitle}>PowerShell local com streaming em tempo real</h2>
        </div>

        <div className={styles.sessionMeta}>
          <span className={styles.metaPill}>
            {isStartingTerminal
              ? "Inicializando"
              : terminalSession?.isActive
                ? "Conectado"
                : "Aguardando sessao"}
          </span>
          {terminalSession ? (
            <span className={styles.metaPill}>
              {terminalSession.shell} em {terminalSession.cwd}
            </span>
          ) : null}
          {terminalSession ? (
            <span className={styles.metaPill}>
              Desde {formatAbsoluteTimestamp(terminalSession.startedAt)}
            </span>
          ) : null}
        </div>
      </header>

      <div className={styles.consoleSurface}>
        <div className={styles.consoleToolbar}>
          <span className={styles.toolbarLabel}>Saida ao vivo</span>
          <button type="button" className={styles.ghostButton} onClick={onClearOutput}>
            Limpar
          </button>
        </div>

        <div ref={outputViewportRef} className={styles.outputViewport}>
          <pre className={styles.output}>{terminalText || "Aguardando saida do PowerShell..."}</pre>
        </div>
      </div>

      <form className={styles.commandBar} onSubmit={handleSubmit}>
        <input
          className={styles.commandInput}
          type="text"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Digite um comando PowerShell"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={isStartingTerminal || !command.trim()}
        >
          Executar
        </button>
      </form>
    </section>
  );
}
