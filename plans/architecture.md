# Architektur-Dokument

## Monorepo-Struktur

```
imap-mail/
├── package.json                    # npm Workspaces Root
├── tsconfig.base.json              # Shared TS Config
├── CLAUDE.md
│
├── packages/shared/                # @imap-mail/shared
│   └── src/models/                 # Alle geteilten Interfaces
│
├── backend/                        # @imap-mail/backend
│   ├── src/
│   │   ├── index.ts                # Fastify Bootstrap
│   │   ├── config/                 # env, cors, security
│   │   ├── plugins/                # auth, websocket, rate-limit
│   │   ├── routes/                 # account, mailbox, message, send, attachment, search
│   │   ├── services/               # imap, smtp, pool, credential, sanitizer, idle
│   │   ├── websocket/              # handler, events
│   │   └── utils/                  # mime, address-parser, error-handler
│   └── tests/
│       ├── unit/                   # services/ + routes/
│       ├── integration/            # imap-flow, smtp
│       └── mocks/                  # imap-flow.mock, nodemailer.mock
│
├── frontend/                       # @imap-mail/frontend
│   ├── src/app/
│   │   ├── core/
│   │   │   ├── services/           # api, account, mailbox, message, compose, search, attachment, websocket, notification
│   │   │   ├── state/              # account, mailbox, message, ui (Signal-basiert)
│   │   │   ├── interceptors/       # error
│   │   │   └── guards/             # account
│   │   ├── features/
│   │   │   ├── layout/             # shell, sidebar, toolbar, status-bar
│   │   │   ├── message-list/       # list, item, header, empty
│   │   │   ├── message-viewer/     # viewer, header, body, attachments, safe-html pipe
│   │   │   ├── composer/           # dialog, form, recipient-input, attachment-upload, editor
│   │   │   ├── search/             # search-bar, advanced-search
│   │   │   └── settings/           # settings, account-form, account-list
│   │   └── shared/
│   │       ├── components/         # confirm-dialog, loading-spinner, avatar
│   │       ├── pipes/              # relative-time, file-size, truncate
│   │       └── directives/         # autofocus
│   └── e2e/
│       ├── fixtures/
│       ├── pages/                  # Page Object Models
│       └── specs/                  # E2E Testszenarien
│
└── plans/                          # Planungsdokumente
```

## Backend-Architektur

### Request-Flow
```
Client → Fastify → Auth Plugin → Rate Limit → Route Handler → Service → ImapFlow/Nodemailer
                                                    ↓
                                            Connection Pool
                                                    ↓
                                              IMAP Server
```

### WebSocket-Flow
```
IMAP Server → IDLE Event → IdleService → WS Handler → Client
Client → subscribe_mailbox → WS Handler → IdleService → IMAP IDLE
```

### Schlüssel-Dienste
| Service | Verantwortung |
|---------|---------------|
| `ConnectionPoolService` | ImapFlow Connection Lifecycle (generic-pool) |
| `ImapService` | IMAP-Operationen (Wrapper um ImapFlow) |
| `SmtpService` | E-Mail senden via Nodemailer |
| `CredentialService` | AES-256-GCM Verschlüsselung |
| `SanitizerService` | HTML-Sanitization (sanitize-html) |
| `IdleService` | IMAP IDLE Monitoring, Event-Emission |

### Datenhaltung (v1)
- **Accounts**: JSON-Datei (`data/accounts.json`) — Credentials verschlüsselt
- **Nachrichten**: Direkt von IMAP gelesen (kein lokaler Cache in v1)
- **Kein Datenbank-Setup nötig** für Erstversion

## Frontend-Architektur

### State Management (Signals)
```
AccountState ─→ MailboxState ─→ MessageState
                                     ↑
                              WebSocketService
UiState (unabhängig)
```

Jeder State ist ein `@Injectable({ providedIn: 'root' })` mit `signal()` und `computed()`.
Keine Actions/Reducers/Effects — direkte Methodenaufrufe auf dem State.

### Komponenten-Hierarchie
```
AppComponent
└── ShellComponent (Resizable 3-Panel)
    ├── SidebarComponent
    │   ├── AccountListComponent
    │   └── FolderTreeComponent (ZardUI Tree)
    ├── MessageListComponent (ZardUI Table + Pagination)
    │   └── MessageListItemComponent
    └── MessageViewerComponent
        ├── MessageHeaderComponent
        ├── MessageBodyComponent
        └── AttachmentListComponent

ComposerDialogComponent (Overlay)
├── RecipientInputComponent (ZardUI Combobox)
├── EditorComponent
└── AttachmentUploadComponent

SearchBarComponent (ZardUI Command, Cmd+K)
AdvancedSearchComponent (ZardUI Dialog)
```

### Routing
```
/                    → Redirect zu /inbox
/:mailbox            → MessageListComponent
/:mailbox/:uid       → MessageViewerComponent
/settings            → SettingsComponent
/settings/account/new → AccountFormComponent
/settings/account/:id → AccountFormComponent
/setup               → AccountFormComponent (Ersteinrichtung)
```

## API-Endpunkte

### REST API (v1)

#### Accounts
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/v1/accounts` | Alle Accounts auflisten |
| POST | `/api/v1/accounts` | Account anlegen |
| GET | `/api/v1/accounts/:id` | Account Details |
| PUT | `/api/v1/accounts/:id` | Account aktualisieren |
| DELETE | `/api/v1/accounts/:id` | Account löschen |
| POST | `/api/v1/accounts/:id/test` | Verbindung testen |

#### Mailboxes
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/v1/accounts/:accountId/mailboxes` | Ordner-Baum |
| POST | `/api/v1/accounts/:accountId/mailboxes` | Ordner erstellen |
| PUT | `/api/v1/accounts/:accountId/mailboxes/:path` | Umbenennen |
| DELETE | `/api/v1/accounts/:accountId/mailboxes/:path` | Löschen |

#### Messages
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `.../:mailbox/messages` | Nachrichten (paginiert) |
| GET | `.../:mailbox/messages/:uid` | Einzelne Nachricht |
| DELETE | `.../:mailbox/messages/:uid` | Löschen |
| POST | `.../:mailbox/messages/move` | Verschieben |
| POST | `.../:mailbox/messages/copy` | Kopieren |
| POST | `.../:mailbox/messages/flags` | Flags setzen/entfernen |

#### Senden
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/v1/accounts/:id/send` | E-Mail senden |
| POST | `/api/v1/accounts/:id/drafts` | Entwurf speichern |
| PUT | `/api/v1/accounts/:id/drafts/:uid` | Entwurf aktualisieren |

#### Suche & Anhänge
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/v1/accounts/:id/search` | Suchen |
| GET | `.../:uid/attachments/:partId` | Anhang herunterladen |

### WebSocket Events
| Event (Server→Client) | Payload |
|----------------------|---------|
| `new_message` | MessageEnvelope |
| `message_deleted` | { uid } |
| `message_flags_changed` | { uid, flags } |
| `mailbox_updated` | { path, total, unseen } |
| `connection_status` | { connected, error? } |

| Event (Client→Server) | Payload |
|----------------------|---------|
| `subscribe_mailbox` | { path } |
| `unsubscribe_mailbox` | { path } |
| `ping` | {} |
