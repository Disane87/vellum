# Product Requirements Document: IMAP Mail Client

## 1. Produktvision
Ein moderner, sicherer Web-basierter E-Mail-Client, der sich über IMAP/SMTP mit beliebigen Mailservern verbindet. Zielgruppe: Einzelnutzer, die eine datenschutzfreundliche Alternative zu Webmail-Diensten suchen.

## 2. Kernfunktionen

### 2.1 Account-Management
- Mehrere IMAP/SMTP-Accounts konfigurieren
- Verbindungstest bei Einrichtung
- OAuth2-Support für Gmail und Outlook (spätere Phase)
- Farbcodierung pro Account

### 2.2 Mailbox/Ordner-Verwaltung
- Hierarchische Ordnerstruktur anzeigen (Tree)
- Ordner erstellen, umbenennen, löschen
- Spezial-Ordner erkennen (Inbox, Sent, Drafts, Trash, Junk, Archive)
- Ungelesene Nachrichten als Badge anzeigen
- Ordner subscriben/unsubscriben

### 2.3 Nachrichten lesen
- Paginierte Nachrichtenliste mit Vorschau (Subject, From, Date, Preview)
- Vollständige Nachricht anzeigen (HTML sanitized + Plain-Text Fallback)
- Anhänge anzeigen und herunterladen
- Inline-Bilder korrekt darstellen (über Proxy)
- Nachrichten als gelesen/ungelesen markieren
- Nachrichten mit Stern/Flag versehen
- Nachrichten löschen (→ Papierkorb, aus Papierkorb → endgültig)
- Nachrichten verschieben zwischen Ordnern
- Nachrichten kopieren

### 2.4 Nachrichten senden
- Neue Nachricht verfassen (To, CC, BCC, Subject, Body)
- Antworten (Reply, Reply All)
- Weiterleiten (mit Original-Anhängen)
- Anhänge hinzufügen (Drag & Drop + Datei-Dialog)
- Rich-Text-Editor (Basis: Bold, Italic, Listen, Links)
- Entwürfe speichern und bearbeiten

### 2.5 Suche
- Schnellsuche (Cmd/Ctrl+K) über alle Felder
- Erweiterte Suche: Von, An, Betreff, Body, Datum, Anhang, Flags
- Suchergebnisse als Nachrichtenliste

### 2.6 Echtzeit-Updates
- Neue Nachrichten sofort anzeigen (IMAP IDLE → WebSocket)
- Ungelesen-Zähler automatisch aktualisieren
- Verbindungsstatus anzeigen

## 3. UI/UX-Anforderungen

### 3.1 Layout
Klassisches 3-Panel-Layout:
- **Links**: Sidebar (220px) — Account-Liste, Ordner-Baum
- **Mitte**: Nachrichtenliste (~35%) — Paginiert, selektierbar
- **Rechts**: Nachrichtenansicht (Rest) — Header, Body, Anhänge
- Panels per Drag resizable (ZardUI Resizable)
- Composer als Dialog/Sheet (Gmail-ähnlich)

### 3.2 Design-System
- ZardUI-Komponenten als Basis
- Dark Mode als Default
- Geist-ähnliche Typografie (clean, minimal)
- Lucide Icons konsistent einsetzen
- Loading States: Skeleton-Komponenten
- Empty States: ZardUI Empty
- Feedback: ZardUI Toast für alle Aktionen

### 3.3 Keyboard Shortcuts
| Shortcut | Aktion |
|----------|--------|
| Cmd+N | Neue Nachricht |
| Cmd+K | Suche |
| R | Antworten |
| A | Allen antworten |
| F | Weiterleiten |
| E | Archivieren |
| # | Löschen |
| J/K | Nächste/Vorherige Nachricht |
| Cmd+Enter | Senden |

## 4. Architektur

### 4.1 Backend API
REST API unter `/api/v1/`:
- `GET/POST/PUT/DELETE /accounts` — Account CRUD
- `GET/POST/PUT/DELETE /accounts/:id/mailboxes` — Mailbox Ops
- `GET/POST/DELETE /accounts/:id/mailboxes/:path/messages` — Message Ops
- `POST /accounts/:id/send` — E-Mail senden
- `POST /accounts/:id/search` — Suche
- `WS /ws` — Echtzeit-Events

### 4.2 Datenmodelle
Geteilte TypeScript-Interfaces in `@imap-mail/shared`:
- `Account`, `ImapConfig`, `SmtpConfig`, `AuthCredentials`
- `Mailbox`, `MailboxRole`
- `MessageEnvelope`, `MessageFull`, `MessageFlag`
- `Attachment`, `Address`
- `ComposeMessage`, `ComposeAttachment`
- `SearchQuery`, `SearchResult`
- `WsEvent`, `WsEventType`

### 4.3 State Management
Signal-basiert (Angular Signals):
- `AccountState` — Accounts, aktiver Account
- `MailboxState` — Mailboxes, aktive Mailbox
- `MessageState` — Nachrichtenliste, Selektion, Paginierung
- `UiState` — Sidebar, Composer, Theme, Search

## 5. Sicherheitsanforderungen
- Credentials AES-256-GCM verschlüsselt speichern
- HTML-Emails server-seitig sanitizen (XSS-Schutz)
- Externe Bilder nur über Backend-Proxy laden (Tracking-Schutz)
- CORS auf Frontend-Origin beschränkt
- Rate Limiting: 100 req/min API, 10 req/min Send
- CSP Headers konfiguriert

## 6. Testanforderungen
- **Coverage-Ziel**: 100% (Lines, Branches, Functions, Statements)
- **Backend**: Vitest — Unit Tests für Services + Routes, Mocked ImapFlow/Nodemailer
- **Frontend**: Jest — Unit Tests für Components, Services, State, Pipes
- **E2E**: Playwright — 10 Szenarien (Setup, Read, Compose, Reply, Delete, Move, Search, Folders, Realtime, Flags)
- TDD: Tests vor Implementation schreiben

## 7. Nicht-funktionale Anforderungen
- Nachrichtenliste: < 500ms Ladezeit für 50 Nachrichten
- Composer öffnet in < 200ms
- WebSocket-Reconnect mit Exponential Backoff
- Virtual Scrolling für > 500 Nachrichten
- Responsive: Funktional ab 768px Breite
