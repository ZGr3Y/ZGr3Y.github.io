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
        { label: 'Explore Cloud Lab', targetStation: 1, primary: true },
        { label: 'Inspect Stack', targetStation: 2, primary: false },
        { label: 'Download CV', url: './resume_PaoloMariaScarlata.pdf', isDownload: true }
      ]
    }
  },
  {
    id: 'lab',
    index: '02',
    name: 'LAB',
    subtitle: 'RESEARCH & EXPLOITATION ARTIFACTS',
    camera: {
      position: { x: 22, y: 5, z: -12 },
      target: { x: 22, y: 0, z: -28 }
    },
    projects: [
      {
        id: 'ctf-lab',
        title: 'CTF Vulnerability Lab',
        badge: "Bachelor's Thesis",
        status: 'production',
        shortDesc: 'Offensive security training platform built with Docker and Node.js simulating real-world exploit chains.',
        fullDesc: 'Developed three isolated microservices simulating real-world vulnerabilities: IDOR with bypassable WAF, JWT Algorithm Confusion & Key Injection, and Weak Cryptographic PRNG seeds. Designed for students to practice exploitation and defensive mitigations in isolated Docker sandboxes.',
        tags: ['Docker', 'Node.js', 'IDOR', 'WAF Bypass', 'JWT Security', 'CTF'],
        github: 'https://github.com/ZGr3Y/CTF'
      },
      {
        id: 'broken-access-control',
        title: 'Broken Access Control & Mitigations',
        badge: 'Research Project',
        status: 'production',
        shortDesc: 'Deep study and proof-of-concept laboratory on the #1 OWASP Top 10 vulnerability.',
        fullDesc: 'A research project breaking down real-world Insecure Direct Object References (IDOR) and broken token authorization. Features dual codebases: an exploitable target demonstrating attack vectors, and a parallel Hardened version featuring strict RBAC validation, session signing, and AES-256 encryption.',
        tags: ['OWASP Top 10', 'Access Control', 'AES-256', 'Hardening', 'JWT PoC'],
        github: 'https://github.com/ZGr3Y/Broken-Access-Control'
      },
      {
        id: 'zero-trust-telemetry',
        title: 'Zero-Trust Kernel Telemetry',
        badge: 'Experimental Protocol',
        status: 'research',
        shortDesc: 'eBPF security probe monitoring anomalous container syscalls and privilege escalation.',
        fullDesc: 'Kernel-space telemetry probe utilizing Linux eBPF tracepoints to observe container execution trees, anomalous memory writes, and unexpected network socket binds in real time, detecting container breakout attempts without introducing user-space latency.',
        tags: ['eBPF', 'Rust', 'Linux Security', 'Syscall Tracing', 'Containers'],
        github: 'https://github.com/ZGr3Y'
      },
      {
        id: 'pqc-bench',
        title: 'Quantum-Resistant Key Exchange',
        badge: 'Cryptographic Bench',
        status: 'research',
        shortDesc: 'NIST Post-Quantum Cryptography benchmark testing ML-KEM lattice algorithms in WASM.',
        fullDesc: 'Benchmarking performance overhead and memory characteristics of post-quantum lattice-based key encapsulation algorithms (ML-KEM / Kyber) in browser and edge worker environments via WebAssembly, guaranteeing forward secrecy for future distributed systems.',
        tags: ['Post-Quantum', 'Lattice Crypto', 'WASM', 'Rust', 'Forward Secrecy'],
        github: 'https://github.com/ZGr3Y'
      }
    ]
  },
  {
    id: 'arsenal',
    index: '03',
    name: 'ARSENAL',
    subtitle: 'TACTICAL DISCIPLINES & CLOUD STACK',
    camera: {
      position: { x: -20, y: -10, z: -40 },
      target: { x: -20, y: -10, z: -60 }
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
      position: { x: 5, y: 20, z: -80 },
      target: { x: 5, y: 20, z: -100 }
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
