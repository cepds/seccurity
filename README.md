# SECCURITY

SECCURITY e uma shell desktop para operacoes locais de seguranca em Windows. O app combina uma interface React + Electron com persistencia em SQLite para organizar inventario de ferramentas, workspaces operacionais, sessoes, eventos, alertas e um console PowerShell integrado.

## Stack

- Electron + Vite + React + TypeScript
- `better-sqlite3` para persistencia local
- IPC entre renderer e main process para launchers, terminal e leitura do runtime
- `electron-builder` para empacotamento Windows

## Estrutura

- `src/app/`: shell do renderer, navegacao lateral e bootstrap da UI
- `src/features/`: telas de overview, apps, workspaces, sessions, alerts, events, console e logs
- `src/hooks/`: estado do desktop e sincronizacao do renderer com a API local
- `src/services/`: cliente IPC/browser preview usado pelo renderer
- `electron/`: main process, IPC, terminal, scans, launchers e servicos de runtime
- `backend/`: schema SQLite, paths e repositorios locais
- `shared/`: contratos de tipos e catalogo de ferramentas
- `build/`: assets de packaging

## Scripts

- `npm run dev`: sobe o renderer Vite, compila o processo Electron e abre o app desktop
- `npm run build`: gera `dist/` e `dist-electron/`
- `npm run dist`: empacota a aplicacao com `electron-builder`
- `npm run dist:win`: gera artefatos Windows
- `npm run lint`: executa ESLint
- `npm run typecheck`: executa o TypeScript no renderer
- `npm run typecheck:electron`: executa o TypeScript do main process
- `npm run rebuild:native`: recompila modulos nativos para a versao local do Electron
- `npm run sign:local`: aplica assinatura local para builds Windows

## Fluxo recomendado

1. `npm install`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm run dist:win`

## Estado atual

- A shell principal do SECCURITY esta em producao no renderer atual.
- O bootstrap oferece modo `browser-preview` quando o preload do Electron nao esta disponivel.
- O backend local persiste logs, eventos, sessoes, workspaces e alertas em SQLite.
- O modulo de updates ainda usa resposta mockada.

## Observacoes

- No PowerShell do Windows, se `npm` estiver bloqueado pela execution policy, use `npm.cmd`.
- O banco local e criado em `app.getPath("userData")/seccurity.db`.
- O repositorio ainda pode conter alguns artefatos historicos fora da shell principal; a aplicacao ativa descrita aqui e a desktop shell do SECCURITY.
