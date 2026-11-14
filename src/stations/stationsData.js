/**
 * Cloud-Native Spatial Stations & Portfolio Data
 * Paolo Maria Scarlata (ZGr3Y)
 */

export const STATIONS = [
  {
    id: 'gateway',
    index: '01',
    name: 'GATEWAY',
    subtitle: 'CLOUD IDENTITY & INFRASTRUCTURE',
    camera: {
      position: { x: 0, y: 0, z: 16 },
      target: { x: 0, y: 0, z: 0 }
    },
    hero: {
      name: 'PAOLO MARIA SCARLATA',
      alias: 'ZGr3Y',
      role: 'Cloud Systems & Security Engineer',
      badge: 'SYSTEM ONLINE // CLOUD MESH PROTOCOL',
      bio: 'Engineering scalable cloud infrastructures, hardening distributed microservices, and researching deep application security. Focused on <strong>cloud-native architectures</strong>, container telemetry, and robust defense-in-depth mitigations.',
      actions: [
        { label: 'Download Curriculum Vitae', url: './resume_PaoloMariaScarlata.pdf', isDownload: true },
        { label: 'GitHub', url: 'https://github.com/ZGr3Y', isExternal: true }
      ]
    }
  },
  {
    id: 'lab',
    index: '02',
    name: 'LAB',
    subtitle: 'RESEARCH & EXPLOITATION ARTIFACTS',
    camera: {
      position: { x: 6, y: 3.5, z: 14.5 },
      target: { x: 1.5, y: 0.5, z: 0 }
    },
    projects: [
      {
        id: 'ctf-lab',
        title: 'CTF Vulnerability Lab',
        badge: "Bachelor's Thesis",
        status: 'production',
        shortDesc: 'Three isolated web-security challenges built for a bachelor’s-degree CTF.',
        fullDesc: 'Each challenge is an independent Node.js / Express service, packaged in a Docker container. Docker Compose starts the three services together on separate ports and connects them through a private bridge network. The JWT scenario signs tokens with RS256 but blindly trusts an embedded RSA JWK, allowing an attacker to supply their own signing key. The cryptography scenario exposes sensitive API data and uses MD5 for password hashing. These deliberately insecure implementations provide concrete examples for studying exploitation and the corresponding defensive controls.',
        tags: ['Node.js 18', 'Express 4', 'Docker', 'Docker Compose', 'JWT', 'Web Security'],
        github: 'https://github.com/ZGr3Y/CTF',
        sheet: {
          eyebrow: 'BACHELOR’S THESIS · SECURITY LAB',
          summary: 'Three intentionally vulnerable services let students practice exploitation and defensive mitigations in isolated Docker environments.',
          highlights: [
            'IDOR challenge paired with an Express WAF.',
            'JWT privilege escalation through an injected RSA JWK.',
            'Information disclosure and weak password cryptography.'
          ]
        }
      },
      {
        id: 'sentinel-siem',
        title: 'Sentinel Distributed SIEM',
        badge: 'Distributed Systems / EDA',
        status: 'production',
        shortDesc: 'Distributed SIEM for log ingestion, threat detection, and telemetry analysis.',
        fullDesc: 'The agent generates background traffic and structured attack events, with historical time-shifted replay available for repeatable scenarios. RabbitMQ separates event production from the detection core, which handles ingestion, idempotency, DoS and brute-force detection, and regex pattern matching. A separate REST API provides investigation endpoints, dashboard aggregates, and statistical reports. PostgreSQL stores the data, while the React and TypeScript dashboard presents the telemetry. Docker Compose brings up the infrastructure, backend services, simulator, and dashboard together; Resilience4j supplies rate limiting and circuit breakers.',
        tags: ['Java 21', 'Spring Boot 3', 'RabbitMQ', 'PostgreSQL', 'React', 'Resilience4j'],
        github: 'https://github.com/ZGr3Y/sentinel-distributed-siem',
        sheet: {
          eyebrow: 'DISTRIBUTED SECURITY · JAVA 21',
          summary: 'A modular pipeline ingests events through RabbitMQ, detects attack patterns, and exposes investigations through an API and React dashboard.',
          highlights: [
            'Separate agent, detection core, API, and shared modules.',
            'Simulated DoS, brute-force, and malicious-payload events.',
            'Idempotent processing and Resilience4j circuit breakers.'
          ]
        }
      },
      {
        id: 'securepolicy-chat',
        title: 'SecurePolicy Chat',
        badge: 'Work in Progress · MVP',
        status: 'wip',
        shortDesc: 'A local preflight that checks prompts against policy before they reach an external AI service.',
        fullDesc: 'Go evaluates a fixed policy profile and returns the IDs of matched rules. The deterministic path recognises selected credentials, token formats, and email addresses; hybrid mode adds semantic findings from a small model served locally by Ollama. Exact spans become typed placeholders, and the sanitised candidate is checked again before copying is enabled. Model-only findings produce REVIEW_REQUIRED, including when the model is unavailable or its response is invalid. This preflight flow processes prompts in memory without saving them to SQLite. It is an MVP with limited detection coverage, rather than a guarantee that all sensitive data has been removed. The repository also includes OpenAPI contracts, Docker Compose, and Kubernetes / Terraform deployment configuration.',
        tags: ['Go', 'Ollama', 'Docker Compose', 'OpenAPI', 'Kubernetes', 'Terraform'],
        github: 'https://github.com/ZGr3Y/SPC_SecurePolicyChat',
        sheet: {
          eyebrow: 'LOCAL AI SECURITY · GO',
          summary: 'A local web app checks a prompt against a fixed policy before it is sent to an external AI service.',
          highlights: [
            'Rules-only and hybrid modes with optional local Ollama analysis.',
            'Matched sensitive text is replaced with typed placeholders.',
            'Model-only findings require review; they cannot grant a pass.'
          ]
        }
      }
    ]
  },
  {
    id: 'arsenal',
    index: '03',
    name: 'ARSENAL',
    subtitle: 'TACTICAL DISCIPLINES & CLOUD STACK',
    camera: {
      position: { x: -6, y: -3.5, z: 14.5 },
      target: { x: -1.5, y: -0.5, z: 0 }
    },
    categories: [
      {
        title: 'Cloud & Infrastructure',
        icon: '☁️',
        color: 'var(--cloud-blue)',
        skills: ['Docker & Compose', 'Kubernetes Architecture', 'Linux POSIX Sysadmin', 'CI/CD Pipelines (GitHub Actions)', 'Terraform / IaC Basics', 'Microservices Networking']
      },
      {
        title: 'Offensive Security',
        icon: '⚔️',
        color: 'var(--cloud-red)',
        skills: ['OWASP Top 10', 'IDOR Analysis', 'JWT Exploit PoCs', 'WAF Evasion', 'Burp Suite Pro', 'Reconnaissance', 'Container Breakout PoCs']
      },
      {
        title: 'Defensive & Hardening',
        icon: '🛡️',
        color: 'var(--cloud-green)',
        skills: ['Zero-Trust Principles', 'RBAC / ABAC Systems', 'AES-256 Encryption', 'Secure Session Management', 'Input Sanitization', 'Audit Logging']
      },
      {
        title: 'Systems & Engineering',
        icon: '⚡',
        color: 'var(--cloud-yellow)',
        skills: ['Node.js & Express', 'TypeScript / JavaScript', 'Python Security Scripting', 'C / C++ Foundations', 'Three.js & WebGL', 'Git Version Control']
      }
    ]
  },
  {
    id: 'transmission',
    index: '04',
    name: 'TRANSMISSION',
    subtitle: 'SECURE NODE UPLINKS',
    camera: {
      position: { x: 0, y: 5.5, z: 15.5 },
      target: { x: 0, y: 0, z: 0 }
    },
    terminal: {
      hostname: 'zgr3y@cloud-node-01',
      commands: [
        { cmd: 'whoami', output: 'Paolo Maria Scarlata (ZGr3Y) — Cloud Systems & Security' },
        { cmd: 'kubectl get nodes -o wide', output: 'CLUSTER STATUS: READY // 4 TIERS OPERATIONAL' },
        { cmd: 'gpg --fingerprint ZGr3Y', output: 'B9A4 81CF 30E2 721A D5E9 443B 90C1 88FA 78B2 4E19' }
      ]
    },
    channels: [
      {
        title: 'GitHub Repositories',
        desc: 'Explore open-source security labs, thesis PoCs, and experiments.',
        url: 'https://github.com/ZGr3Y',
        icon: '🐙'
      },
      {
        title: 'Curriculum Vitae',
        desc: 'Download formal resume in PDF format (Paolo Maria Scarlata).',
        url: './resume_PaoloMariaScarlata.pdf',
        icon: '📄',
        isDownload: true
      },
      {
        title: 'Direct Communication',
        desc: 'Establish direct email contact (verify GPG fingerprint above for encrypted messages).',
        url: 'mailto:contact.zgr3y@gmail.com',
        icon: '📡'
      }
    ]
  }
];
