# 🤝 Contribution Guidelines

Hey there! 👋 Thanks for considering contributing to Vellum! We're excited to have you here!

Whether you're fixing a typo, squashing a bug, or adding a cool new feature — every contribution matters! 🎉

## 🌟 New to Contributing? Start Here!

**First time contributing to open source? Welcome! 🎉**

We've got you covered with issues tagged as **"good first issue"** — these are perfect for getting started! They're:
- 🎯 Well-defined and focused
- 📚 Have clear acceptance criteria
- 💡 Include hints or guidance
- 🚀 Great learning opportunities

**How to find them:**
1. Go to [Issues](https://github.com/Disane87/vellum/issues)
2. Filter by label: `good first issue`
3. Pick one that interests you
4. Comment on the issue to let others know you're working on it
5. Follow the development workflow below

**Need help?** Don't hesitate to ask questions in the issue comments or open a discussion! We're here to help! 💪

### 🏷️ Issue Labels Explained

- **🐛 `bug`** — Something isn't working correctly
- **✨ `enhancement`** — New feature or request
- **📝 `documentation`** — Improvements or additions to documentation
- **🌟 `good first issue`** — Good for newcomers
- **🆘 `help wanted`** — Extra attention is needed
- **❓ `question`** — Further information is requested
- **🔄 `dependencies`** — Pull requests that update a dependency file
- **🚨 `priority: high`** — High priority issues
- **💥 `breaking change`** — Changes that break backward compatibility

## 💬 Commit Messages

We use [conventional commits](https://www.conventionalcommits.org/) — sounds fancy, but it's actually pretty simple!

**Examples:**
- `feat: add mailbox drag-and-drop reordering` 🆕
- `fix: resolve issue with attachment downloads` 🐛
- `docs: update README with new screenshots` 📝
- `refactor: improve IMAP connection pooling` 🔧

This helps our CI/CD pipeline automatically create releases and changelogs. Pretty cool, right? 🎉

## 🌿 Branching Strategy

Let's keep things organized! Here's how we handle branches:

- 🎯 **Merge your PR to `main`** — This is where all the magic happens!
- 🏷️ Releases are automated via [semantic-release](https://github.com/semantic-release/semantic-release)
- 🌿 Name your branches descriptively: `feat/thing`, `fix/bug-name`, `docs/update-readme`

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 22+ and **npm** 10+
- **Git** (obviously! 😄)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/Disane87/vellum.git
cd vellum

# Install all dependencies (root + workspaces)
npm install

# Start backend + frontend in dev mode
npm run dev

# Or start with Electron shell
npm run dev:electron
```

### 📁 Project Structure

Here's what goes where (so you don't get lost! 🗺️):

```
vellum/
├── packages/shared/           # @vellum/shared — TypeScript interfaces
│   └── src/
│       ├── models/            # Data models (Account, Message, Mailbox, etc.)
│       ├── enums/             # Enums (MailboxRole, MessageFlag, SortField)
│       └── utils/             # Shared utilities & validators
├── backend/                   # @vellum/backend — NestJS API server
│   ├── src/
│   │   ├── account/           # Account management (CRUD)
│   │   ├── imap/              # IMAP connection & service
│   │   ├── mailbox/           # Mailbox operations
│   │   ├── message/           # Message fetch, move, flag, attachments
│   │   ├── search/            # Full-text search
│   │   ├── send/              # SMTP sending
│   │   └── websocket/         # IMAP IDLE & real-time events
│   └── tests/                 # Vitest unit tests
├── frontend/                  # @vellum/frontend — Angular app
│   └── src/app/
│       ├── core/              # Services, state (signals), guards
│       ├── features/          # Feature components (composer, message-list, etc.)
│       └── shared/            # Pipes, utils, UI components
├── electron/                  # Electron main process
│   └── main.ts               # Window creation, backend lifecycle
└── .github/workflows/         # CI/CD (semantic-release + Electron builds)
```

### 🧪 Running Tests

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# Backend with coverage
cd backend && npm run test:cov
```

### 📦 Building

```bash
# Build everything (shared → backend → frontend → electron)
npm run build

# Package for your platform
npm run dist

# Platform-specific
npm run dist:win     # Windows (.exe)
npm run dist:mac     # macOS (.dmg)
npm run dist:linux   # Linux (.AppImage, .deb)
```

## 📋 General Guidelines

1. **Code Quality:**
   - Follow the project's existing patterns (Angular standalone components, signals, OnPush)
   - Keep it clean, readable, and well-typed — TypeScript strict mode is on! 💪
   - Use the shared package for any types needed by both frontend and backend

2. **Testing:**
   - Write tests for new features (TDD is encouraged!)
   - Run the full test suite before submitting a PR
   - Aim for high coverage — we're shooting for 100%! 🎯

3. **Documentation:**
   - Update the README if your change affects usage or setup
   - Document new API endpoints or services

4. **Issue Tracking:**
   - Reference issues in your commits: `feat: add dark mode (closes #42)`
   - Use keywords like `fixes` or `closes` followed by the issue number

5. **Code Reviews:**
   - Be responsive to feedback and make changes promptly
   - Review others' PRs if you have the expertise — constructive feedback is always welcome!

## 🎖️ Recognition

We value all contributions! Contributors will be:
- 📋 Listed on our GitHub contributors page
- 🏆 Mentioned in release notes for significant contributions
- ⭐ Credited in the changelog

## 💬 Community

- **Issues:** Report bugs and request features
- **Discussions:** Ask questions and share ideas
- **Pull Requests:** Submit your contributions

## Thank You!

Thank you for contributing and helping make Vellum better! Every contribution, no matter how small, makes a difference! 🙏✨
