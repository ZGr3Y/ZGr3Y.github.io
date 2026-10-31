/**
 * Spatial Stations Configuration & Portfolio Data
 * Paolo Maria Scarlata (ZGr3Y)
 */

export const STATIONS = [
  {
    id: 'gateway',
    index: '01',
    name: 'GATEWAY',
    subtitle: 'IDENTITY & ACCESS POINT',
    camera: {
      position: { x: 0, y: 0, z: 15 },
      target: { x: 0, y: 0, z: 0 }
    },
    hero: {
      name: 'PAOLO MARIA SCARLATA',
      alias: 'ZGr3Y',
      role: 'Web Security Researcher & Software Engineer',
      badge: 'SYSTEM ONLINE // 3D SPATIAL PROTOCOL',
      bio: 'Investigating complex application vulnerabilities, engineering resilient security architectures, and crafting modern spatial web experiences. Specialized in <strong>OWASP Top 10 research</strong>, offensive penetration testing simulations, and robust application hardening.',
      actions: [
        { label: 'Enter Lab', targetStation: 1, primary: true },
        { label: 'View Arsenal', targetStation: 2, primary: false },
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
      position: { x: 24, y: 6, z: -10 },
      target: { x: 24, y: 0, z: -25 }
    },
    projects: [
      {
        id: 'ctf-lab',
        title: 'CTF Vulnerability Lab',
        badge: "Bachelor's Thesis",
        status: 'production',
        shortDesc: 'Offensive security training platform built with Docker and Node.js simulating real-world exploit chains.',
        fullDesc: 'Developed three isolated microservices simulating real-world vulnerabilities: IDOR with bypassable WAF, JWT Algorithm Confusion & Key Injection, and Weak Cryptographic prng seeds. Designed specifically for academic security students to master exploitation and reverse-engineering in a safe sandbox.',
        tags: ['Docker', 'Node.js', 'IDOR', 'WAF Bypass', 'JWT Security', 'CTF'],
        github: 'https://github.com/ZGr3Y/CTF'
      },
      {
        id: 'broken-access-control',
        title: 'Broken Access Control & Mitigations',
        badge: 'Research Project',
        status: 'production',
        shortDesc: 'Comprehensive study and proof-of-concept laboratory on the #1 OWASP Top 10 vulnerability.',
        fullDesc: 'A research project breaking down real-world Insecure Direct Object References (IDOR) and broken token-based authorization schemes. Includes dual codebase architectures: an exploitable target demonstrating attack surfaces, and a parallel Hardened version featuring strict RBAC validation, session signing, and AES-256 field encryption.',
        tags: ['OWASP Top 10', 'Access Control', 'AES-256', 'Hardening', 'JWT PoC'],
        github: 'https://github.com/ZGr3Y/Broken-Access-Control'
      },
      {
        id: 'zero-trust-telemetry',
        title: 'Zero-Trust Kernel Telemetry',
        badge: 'Experimental Protocol',
        status: 'research',
        shortDesc: 'Kernel-space eBPF security probe monitoring anomalous container syscalls and privilege escalation.',
        fullDesc: 'Exploratory probe utilizing Linux eBPF tracepoints to observe process execution trees, anomalous memory writes, and unexpected network socket binds in real time without injecting user-space latency. Provides automated alert heuristics for container breakout attempts.',
        tags: ['eBPF', 'Rust', 'Linux Security', 'Syscall Tracing', 'Containers'],
        github: 'https://github.com/ZGr3Y'
      },
      {
        id: 'pqc-bench',
        title: 'Quantum-Resistant Key Exchange',
        badge: 'Cryptographic Bench',
        status: 'research',
        shortDesc: 'NIST Post-Quantum Cryptography benchmark testing ML-KEM lattice algorithms in browser WASM.',
        fullDesc: 'Benchmarking performance overhead and memory characteristics of post-quantum lattice-based key encapsulation algorithms (ML-KEM / Kyber) in browser and edge worker environments via Rust WebAssembly modules, ensuring future-proof forward secrecy.',
        tags: ['Post-Quantum', 'Lattice Crypto', 'WASM', 'Rust', 'Forward Secrecy'],
        github: 'https://github.com/ZGr3Y'
      }
    ]
  },
  {
    id: 'arsenal',
    index: '03',
    name: 'ARSENAL',
    subtitle: 'TACTICAL CAPABILITIES & DISCIPLINES',
    camera: {
      position: { x: -22, y: -12, z: -45 },
      target: { x: -22, y: -12, z: -65 }
    },
    categories: [
      {
        title: 'Offensive Security',
        icon: '⚔️',
        skills: ['OWASP Top 10', 'IDOR Analysis', 'JWT Exploit PoCs', 'WAF Evasion', 'Burp Suite Pro', 'Reconnaissance', 'Docker Container Escapes', 'Network Pentesting']
      },
      {
        title: 'Defensive & Hardening',
        icon: '🛡️',
        skills: ['Zero-Trust Architecture', 'RBAC / ABAC Systems', 'AES-256 Encryption', 'Secure Session Management', 'Input Sanitization', 'CI/CD Security Scans', 'Threat Modeling']
      },
      {
        title: 'Engineering & Systems',
        icon: '⚡',
        skills: ['Node.js & Express', 'TypeScript / JavaScript', 'Python Security Scripting', 'C / C++ Foundations', 'Linux Sysadmin & POSIX', 'Docker & Compose', 'Git Version Control', 'REST & WebSockets']
      },
      {
        title: 'Creative & Frontend',
        icon: '💎',
        skills: ['Three.js & WebGL', 'Custom GLSL Shaders', 'Modern Glassmorphism UI', 'Optics & Post-Processing', 'Responsive Web Design', 'High-Performance 60FPS']
      }
    ]
  },
  {
    id: 'transmission',
    index: '04',
    name: 'TRANSMISSION',
    subtitle: 'COMMUNICATION & CHANNELS',
    camera: {
      position: { x: 6, y: 22, z: -85 },
      target: { x: 6, y: 22, z: -105 }
    },
    terminal: {
      hostname: 'zgr3y@sec-node-01',
      commands: [
        { cmd: 'whoami', output: 'Paolo Maria Scarlata (ZGr3Y) — Web Security Researcher' },
        { cmd: 'cat /etc/security/status', output: 'ALL NODES OPERATIONAL // DEFENSE-IN-DEPTH ACTIVE' },
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
        desc: 'Establish secure communications or inquire for security consulting.',
        url: 'mailto:contact.zgr3y@gmail.com',
        icon: '📡'
      }
    ]
  }
];
