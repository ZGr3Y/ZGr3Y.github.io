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
        shortDesc: 'Offensive security training platform built with Docker and Node.js simulating real-world exploit chains.',
        fullDesc: 'Developed three isolated microservices simulating real-world vulnerabilities: IDOR with bypassable WAF, JWT Algorithm Confusion & Key Injection, and Weak Cryptographic PRNG seeds. Designed for students to practice exploitation and defensive mitigations in isolated Docker sandboxes.',
        tags: ['Docker', 'Node.js', 'Express', 'IDOR', 'JWT Security', 'WAF Bypass'],
        github: 'https://github.com/ZGr3Y/CTF'
      },
      {
        id: 'sentinel-siem',
        title: 'Sentinel Distributed SIEM',
        badge: 'Distributed Systems / EDA',
        status: 'production',
        shortDesc: 'Distributed event-driven SIEM for real-time log ingestion, threat detection, and telemetry analytics.',
        fullDesc: 'Enterprise-grade SIEM platform leveraging Java 21, Spring Boot 3, and RabbitMQ to buffer and process high-throughput log streams. Features real-time attack pattern detection (DoS, Brute Force), circuit breakers with Resilience4j, and an interactive React telemetry dashboard.',
        tags: ['Java 21', 'Spring Boot 3', 'RabbitMQ', 'PostgreSQL', 'React', 'Resilience4j'],
        github: 'https://github.com/ZGr3Y/sentinel-distributed-siem'
      },
      {
        id: 'work-in-progress',
        title: 'Work in Progress',
        badge: 'Active Development',
        status: 'wip',
        shortDesc: 'Upcoming cloud-native security research module in active design and hardening.',
        fullDesc: 'Next-generation cloud infrastructure and security research under active implementation.',
        tags: ['Cloud Security', 'Research', 'In Progress'],
        github: null
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
        title: 'Encrypted Contact',
        desc: 'Establish secure communications or inquire for engineering opportunities.',
        url: 'mailto:contact.zgr3y@gmail.com',
        icon: '📡'
      }
    ]
  }
];
