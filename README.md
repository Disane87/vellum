![GitHub](https://img.shields.io/github/license/Disane87/vellum)
![GitHub all releases](https://img.shields.io/github/downloads/Disane87/vellum/total)
![GitHub issues](https://img.shields.io/github/issues/Disane87/vellum)
![GitHub contributors](https://img.shields.io/github/contributors/Disane87/vellum)
[![semantic-release: conventionalcommits](https://img.shields.io/badge/semantic--release-conventionalcommits-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![Release](https://github.com/Disane87/vellum/actions/workflows/release.yml/badge.svg)](https://github.com/Disane87/vellum/actions/workflows/release.yml)

# ✉️ Vellum

A privacy-first desktop email client for IMAP/SMTP — built with Electron, Angular and NestJS. No cloud, no tracking, just your inbox. 📬

> [!NOTE]
> 🚧 **Vellum is in active development!** Things may change, break, or spontaneously improve. Star the repo to stay in the loop! ⭐

## ✨ What Can This Thing Do?

Glad you asked! Here's the good stuff:

- 📨 **Full IMAP/SMTP Support**: Connect any email account — Gmail, Outlook, Fastmail, self-hosted, you name it
- 🔒 **Privacy First**: Everything runs locally on your machine — no cloud sync, no telemetry, no nonsense
- ⚡ **Real-Time Updates**: IMAP IDLE keeps your inbox in sync without constant polling
- 🔐 **Encrypted Credentials**: AES-256-GCM encryption for stored account credentials
- 🖼️ **Safe HTML Rendering**: Server-side sanitization with external image proxying
- 📎 **Attachment Support**: View and download attachments with ease
- 🔍 **Full-Text Search**: Find that email you're looking for — fast
- ✍️ **Rich Composer**: Write emails with a proper rich-text editor (TipTap)
- 📁 **Mailbox Management**: Create, rename, delete folders — full control
- 🏷️ **Flags & Labels**: Star, mark as read/unread, flag for follow-up
- 🖥️ **Cross-Platform**: Runs on Windows, macOS, and Linux via Electron
- 🧵 **Conversation Threading**: Messages grouped by conversation (coming soon!)
- 💤 **Snooze**: Snooze emails to resurface later (coming soon!)

## 🏗️ Architecture

Vellum is a monorepo with three packages:

```
vellum/
├── 📦 packages/shared/    → @vellum/shared — TypeScript interfaces & utilities
├── 🖥️ backend/            → @vellum/backend — NestJS API server (IMAP/SMTP)
├── 🌐 frontend/           → @vellum/frontend — Angular app (UI)
└── ⚡ electron/           → Electron main process (desktop shell)
```

| Layer | Tech | Purpose |
|-------|------|---------|
| **Desktop** | Electron | Native window, OS integration |
| **Frontend** | Angular 21+, Tailwind CSS v4, Lucide Icons | Responsive UI with signals-based state |
| **Backend** | NestJS, ImapFlow, Nodemailer | IMAP/SMTP protocol handling, API |
| **Shared** | TypeScript | Type-safe contracts between frontend & backend |
| **Realtime** | WebSockets + IMAP IDLE | Push-based inbox updates |
| **Storage** | SQLite (better-sqlite3) | Local-only data persistence |

## 📦 Installation

### Download

Grab the latest release for your platform from the [Releases](https://github.com/Disane87/vellum/releases) page:

| Platform | Format |
|----------|--------|
| 🪟 Windows | `.exe` (NSIS installer) |
| 🍎 macOS | `.dmg` |
| 🐧 Linux | `.AppImage`, `.deb` |

### Build From Source

```bash
# Clone the repo
git clone https://github.com/Disane87/vellum.git
cd vellum

# Install all dependencies
npm install

# Build everything & package
npm run dist
```

## 🚀 Development

### Prerequisites

- Node.js 22+
- npm 10+

### Getting Started

```bash
# Install dependencies
npm install

# Start backend + frontend (web mode)
npm run dev

# Start with Electron shell
npm run dev:electron
```

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts backend (port 3000) + frontend (port 4200) |
| `npm run dev:electron` | Same as above + opens Electron window |
| `npm test` | Runs all tests (backend + frontend) |
| `npm run dist` | Builds everything and packages for current platform |
| `npm run dist:win` | Package for Windows |
| `npm run dist:mac` | Package for macOS |
| `npm run dist:linux` | Package for Linux |

> [!IMPORTANT]
> The frontend proxies API requests to the backend in dev mode via `proxy.conf.json`. Make sure the backend is running first!

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Angular 21+](https://angular.dev) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **UI Components** | [ZardUI](https://github.com/nicepage/ngzard) (@ngzard/ui), [Lucide Icons](https://lucide.dev) |
| **Editor** | [TipTap](https://tiptap.dev) |
| **Backend** | [NestJS](https://nestjs.com) |
| **IMAP** | [ImapFlow](https://github.com/postalsys/imapflow) |
| **SMTP** | [Nodemailer](https://nodemailer.com) |
| **Desktop** | [Electron](https://www.electronjs.org) |
| **Database** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| **Testing** | [Vitest](https://vitest.dev), [Playwright](https://playwright.dev) |
| **Release** | [semantic-release](https://github.com/semantic-release/semantic-release) |

## 🤝 Contributing

We love contributions! Whether it's fixing a typo, squashing a bug, or adding a cool new feature — every contribution matters! 🎉

Check out our [Contributing Guidelines](CONTRIBUTING.md) to get started.

**Quick start:**
1. Fork the repo
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes using [conventional commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request against `main`

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🔒 Security

Found a vulnerability? Please check our [Security Policy](SECURITY.md) for responsible disclosure guidelines.

## 💬 Community

- 🐛 **Bug Reports**: [Open an issue](https://github.com/Disane87/vellum/issues/new?labels=bug)
- ✨ **Feature Requests**: [Open an issue](https://github.com/Disane87/vellum/issues/new?labels=enhancement)
- 💬 **Questions**: [Start a discussion](https://github.com/Disane87/vellum/discussions)

---

<p align="center">
  Made with ❤️ and way too much ☕
</p>
