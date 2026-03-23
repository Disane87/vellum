# IMAP Mail Client

## Projekt-Übersicht
Vollständiger Web-basierter IMAP/SMTP E-Mail-Client mit Angular Frontend und Fastify Backend.

## Tech Stack
- **Frontend**: Angular 19+, Tailwind CSS v4, ZardUI (@ngzard/ui), Lucide Icons
- **Backend**: Fastify, ImapFlow, Nodemailer, mailparser
- **Shared Types**: npm Workspace `@imap-mail/shared`
- **Testing**: Vitest (Backend), Jest (Frontend Unit), Playwright (E2E)
- **Realtime**: WebSockets via @fastify/websocket + IMAP IDLE

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
- `backend/src/services/imap.service.ts` - IMAP-Kernlogik
- `backend/src/services/smtp.service.ts` - SMTP-Sendelogik
- `frontend/src/app/features/layout/shell.component.ts` - Haupt-Layout
- `frontend/src/app/core/state/` - Signal-basierter State
