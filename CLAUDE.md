# Vellum

## Projekt-Übersicht
Desktop E-Mail-Client (Electron) mit IMAP/SMTP, Angular Frontend und NestJS Backend.

## Tech Stack
- **Frontend**: Angular 21+, Tailwind CSS v4, ZardUI (@ngzard/ui), Lucide Icons
- **Backend**: NestJS, ImapFlow, Nodemailer, mailparser
- **Desktop**: Electron
- **Shared Types**: npm Workspace `@vellum/shared`
- **Testing**: Vitest (Backend + Frontend), Playwright (E2E)
- **Realtime**: WebSockets via @nestjs/websockets + IMAP IDLE

## Monorepo-Struktur
```
packages/shared/  - Geteilte TypeScript-Interfaces
backend/          - Fastify API Server
frontend/         - Angular App
```

## Befehle
```bash
# Installation
npm install                     # Root + alle Workspaces

# Backend
cd backend && npm run dev       # Dev Server (Port 3000)
cd backend && npm test          # Vitest Tests
cd backend && npm run test:cov  # Coverage Report

# Frontend
cd frontend && ng serve         # Dev Server (Port 4200)
cd frontend && npm test         # Jest Tests
cd frontend && npx playwright test  # E2E Tests

# Shared
cd packages/shared && npm run build  # Types kompilieren
```

## Konventionen
- Angular: Standalone Components, Signals, OnPush Change Detection
- State Management: Signal-basiert (kein NgRx)
- API: REST unter `/api/v1/`, WebSocket unter `/api/v1/ws`
- Tests zuerst schreiben (TDD), 100% Coverage-Ziel
- HTML-Emails werden server-seitig sanitized (sanitize-html)
- Credentials werden AES-256-GCM verschlüsselt gespeichert
- Externe Bilder in Emails werden über Backend-Proxy geladen

## Wichtige Dateien
- `packages/shared/src/models/` - Alle Datenmodelle
- `backend/src/imap/imap.service.ts` - IMAP-Kernlogik
- `backend/src/send/smtp.service.ts` - SMTP-Sendelogik
- `frontend/src/app/features/layout/shell.component.ts` - Haupt-Layout
- `frontend/src/app/core/state/` - Signal-basierter State
- `electron/main.ts` - Electron Main Process
