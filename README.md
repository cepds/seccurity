# APP AMOR

APP AMOR em stack premium com React, Vite, TypeScript, Framer Motion e Capacitor, mantendo pipeline de APK.

## Estrutura

- `src/app/`: bootstrap da aplicacao e navegacao por capitulos
- `src/components/`: blocos visuais reutilizaveis
- `src/sections/`: capitulos da experiencia
- `src/data/content.ts`: hero, quiz, galeria, timeline, memorias, promessas e textos finais
- `src/services/`: acesso isolado a storage, audio, countdown e browser APIs
- `src/styles/`: tokens, globals, layout e componentes base
- `public/assets/`: fotos finais tratadas por categoria (`hero`, `highlights`, `timeline`, `gallery`, `memories`)
- `scripts/prepare-photos.mjs`: prepara as fotos do ZIP em WebP
- `android/`: projeto Android do Capacitor
- `ios/`: projeto iOS do Capacitor
- `www/`: build web pronto para sync do Capacitor

## Comandos

- `npm run dev`: ambiente local com Vite
- `npm run lint`: verificacao com ESLint
- `npm run typecheck`: verificacao TypeScript strict
- `npm run build`: gera a pasta `www`
- `npm run photos:prepare`: converte e organiza as fotos em WebP
- `npm run cap:sync`: build web + sync do Capacitor
- `npm run android:open`: abre o projeto Android
- `npm run ios:open`: abre o projeto iOS
- `npm run apk:debug`: gera APK debug em `android/app/build/outputs/apk/debug/`
- `npm run apk:release`: gera APK release em `android/app/build/outputs/apk/release/`

## Fluxo recomendado

1. `npm install`
2. `npm run photos:prepare`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run build`
6. `npm run cap:sync`
7. `npm run apk:debug`

## Observacoes

- Execute tudo a partir de `apps/nossa-historia`.
- O countdown atual considera a data alvo em `src/data/content.ts`.
- O app valida memorias, datas e imagens antes de persistir no storage.
- Como o projeto esta no OneDrive, builds Android ainda podem sofrer lock de arquivos. Se isso acontecer, limpe `android/app/build` e `android/build` antes de rodar de novo.
