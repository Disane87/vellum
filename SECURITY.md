# 🔒 Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported |
| ------- | --------- |
| Latest  | ✅        |
| < Latest| ❌        |

We recommend always using the latest version to ensure you have all security patches.

## Reporting a Vulnerability

We take security seriously. If you've discovered a security vulnerability, we appreciate your help in disclosing it to us responsibly.

### 🚨 Please DO NOT:
- Open a public GitHub issue for security vulnerabilities
- Discuss the vulnerability in public forums or social media

### ✅ Please DO:

**Report security vulnerabilities privately using one of these methods:**

1. **GitHub Security Advisories (Preferred)**
   - Go to https://github.com/Disane87/vellum/security/advisories
   - Click "Report a vulnerability"
   - Fill out the form with as much detail as possible

2. **Email**
   - Send an email to the maintainers via GitHub
   - Include "SECURITY" in the subject line

### 📝 What to Include

- **Description**: A clear description of the vulnerability
- **Impact**: What could an attacker do with this?
- **Reproduction Steps**: Step-by-step instructions
- **Affected Versions**: Which versions are affected?
- **Suggested Fix**: If you have ideas (optional)

### 🔄 What Happens Next?

1. **Acknowledgment**: We'll respond within 48 hours
2. **Assessment**: We'll investigate and assess severity
3. **Fix Development**: We'll work on a fix
4. **Disclosure**: Once fixed, we'll publish a security advisory and credit you (unless you prefer anonymity)

### ⏱️ Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Release**: Critical — ASAP, High — 2 weeks, Medium/Low — next release

## Security Considerations

Vellum stores email credentials locally using AES-256-GCM encryption. Here are some things to keep in mind:

- 🔐 **Credentials**: Encrypted at rest with AES-256-GCM
- 🖥️ **Local-only**: No cloud sync — your data stays on your machine
- 🌐 **External images**: Proxied through the backend to prevent tracking pixels
- 🧹 **HTML sanitization**: All email HTML is sanitized server-side before rendering
- 📡 **Network**: IMAP/SMTP connections use TLS when available

Thank you for helping keep Vellum and its users safe! 🙏
