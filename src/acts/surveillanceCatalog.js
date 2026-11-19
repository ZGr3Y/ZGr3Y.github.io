/**
 * Surveillance Room 28-Monitor Technology Catalog & CRT Canvas Renderer
 * Maps Paolo Maria Scarlata's real security, cloud, systems, and full-stack toolchain
 * across the 4×7 curved CRT monitor wall in HarnessAct.
 */

export const SURVEILLANCE_TECHS = [
  // Row 0 — Cloud, Containers & DevOps
  {
    id: 'docker',
    name: 'DOCKER',
    category: 'CLOUD & INFRA',
    accent: '#0284c7',
    icon: 'docker',
    role: 'Containerized CTF vulnerability labs and isolated reproducible service environments.',
  },
  {
    id: 'docker-compose',
    name: 'COMPOSE',
    category: 'CLOUD & INFRA',
    accent: '#0369a1',
    icon: 'compose',
    role: 'Multi-service orchestration linking agents, RabbitMQ, SIEM cores, and labs.',
  },
  {
    id: 'kubernetes',
    name: 'KUBERNETES',
    category: 'CLOUD & INFRA',
    accent: '#2563eb',
    icon: 'kubernetes',
    role: 'Container orchestration architecture and cloud-native deployment manifests.',
  },
  {
    id: 'terraform',
    name: 'TERRAFORM',
    category: 'INFRASTRUCTURE AS CODE',
    accent: '#6d28d9',
    icon: 'terraform',
    role: 'Declarative Infrastructure as Code configuration for cloud deployments.',
  },
  {
    id: 'github-actions',
    name: 'GH ACTIONS',
    category: 'CI/CD AUTOMATION',
    accent: '#1d4ed8',
    icon: 'actions',
    role: 'Automated CI/CD build, test, and security verification workflows.',
  },
  {
    id: 'git',
    name: 'GIT',
    category: 'VERSION CONTROL',
    accent: '#dc2626',
    icon: 'git',
    role: 'Distributed version control across security labs and engineering projects.',
  },
  {
    id: 'github',
    name: 'GITHUB',
    category: 'SOURCE & COLLAB',
    accent: '#18181b',
    icon: 'github',
    role: 'Open-source security repositories, thesis PoCs, and collaborative workflows.',
  },

  // Row 1 — Security & Operating Systems
  {
    id: 'burp-suite',
    name: 'BURP SUITE',
    category: 'OFFENSIVE SECURITY',
    accent: '#ea580c',
    icon: 'burp',
    role: 'Web proxy interception, request tampering, and vulnerability testing.',
  },
  {
    id: 'wireshark',
    name: 'WIRESHARK',
    category: 'NETWORK SECURITY',
    accent: '#0e7490',
    icon: 'wireshark',
    role: 'Deep packet inspection and network traffic analysis for anomaly detection.',
  },
  {
    id: 'owasp',
    name: 'OWASP',
    category: 'APP SECURITY',
    accent: '#1e293b',
    icon: 'owasp',
    role: 'OWASP Top 10 & Testing Methodology for web security and defenses.',
  },
  {
    id: 'jwt',
    name: 'JWT',
    category: 'AUTH & EXPLOIT',
    accent: '#9333ea',
    icon: 'jwt',
    role: 'JSON Web Token signing security and JWK key-injection exploitation analysis.',
  },
  {
    id: 'arch-linux',
    name: 'ARCH LINUX',
    category: 'WORKSTATION OS',
    accent: '#0284c7',
    icon: 'arch',
    role: 'Primary hardened workstation OS for systems and security engineering.',
  },
  {
    id: 'debian',
    name: 'DEBIAN',
    category: 'SERVER LINUX',
    accent: '#9f1239',
    icon: 'debian',
    role: 'POSIX Linux server environments and containerized base distributions.',
  },
  {
    id: 'linux',
    name: 'LINUX',
    category: 'SYSTEMS OS',
    accent: '#b45309',
    icon: 'linux',
    role: 'POSIX systems administration, kernel permissions, and shell tooling.',
  },

  // Row 2 — Languages & Systems
  {
    id: 'python',
    name: 'PYTHON',
    category: 'PROGRAMMING',
    accent: '#2563eb',
    icon: 'python',
    role: 'Security automation scripting, fuzzing helpers, and CTF exploit PoCs.',
  },
  {
    id: 'java',
    name: 'JAVA',
    category: 'PROGRAMMING',
    accent: '#c2410c',
    icon: 'java',
    role: 'Java 21 object-oriented engineering for Sentinel Distributed SIEM.',
  },
  {
    id: 'go',
    name: 'GO',
    category: 'PROGRAMMING',
    accent: '#0891b2',
    icon: 'go',
    role: 'High-speed deterministic policy evaluation in SecurePolicy Chat.',
  },
  {
    id: 'javascript',
    name: 'JAVASCRIPT',
    category: 'PROGRAMMING',
    accent: '#ca8a04',
    icon: 'javascript',
    role: 'Browser WebGL interfaces, Express security labs, and full-stack tooling.',
  },
  {
    id: 'typescript',
    name: 'TYPESCRIPT',
    category: 'PROGRAMMING',
    accent: '#1d4ed8',
    icon: 'typescript',
    role: 'Type-safe telemetry dashboards and frontend state architectures.',
  },
  {
    id: 'c',
    name: 'C',
    category: 'SYSTEMS',
    accent: '#1e3a8a',
    icon: 'c',
    role: 'Low-level memory layout and systems programming foundations.',
  },
  {
    id: 'cpp',
    name: 'C++',
    category: 'SYSTEMS',
    accent: '#1d4ed8',
    icon: 'cpp',
    role: 'Systems-level engineering and performance-oriented computing.',
  },

  // Row 3 — Frameworks, Data & 3D
  {
    id: 'spring-boot',
    name: 'SPRING BOOT',
    category: 'BACKEND STACK',
    accent: '#3f8f29',
    icon: 'spring',
    role: 'Spring Boot 3 REST APIs, event consumers, and Resilience4j circuit breakers.',
  },
  {
    id: 'nodejs',
    name: 'NODE.JS',
    category: 'BACKEND STACK',
    accent: '#2f855a',
    icon: 'nodejs',
    role: 'Node.js 18 runtime powering isolated CTF challenge microservices.',
  },
  {
    id: 'express',
    name: 'EXPRESS',
    category: 'BACKEND API',
    accent: '#18181b',
    icon: 'express',
    role: 'Express 4 challenge APIs paired with custom WAF defense layers.',
  },
  {
    id: 'react',
    name: 'REACT',
    category: 'TELEMETRY UI',
    accent: '#0284c7',
    icon: 'react',
    role: 'Interactive SIEM telemetry dashboard for alerts, metrics, and replay.',
  },
  {
    id: 'postgresql',
    name: 'POSTGRESQL',
    category: 'DATA STORAGE',
    accent: '#2b5b84',
    icon: 'postgresql',
    role: 'Relational persistence for ingested security events and audit reports.',
  },
  {
    id: 'rabbitmq',
    name: 'RABBITMQ',
    category: 'EVENT BUS',
    accent: '#ea580c',
    icon: 'rabbitmq',
    role: 'Event-driven message broker decoupling log producers from SIEM detection.',
  },
  {
    id: 'threejs',
    name: 'THREE.JS',
    category: '3D WEBGL',
    accent: '#111827',
    icon: 'threejs',
    role: 'Custom WebGL scene orchestration, raycasting, and GPU-friendly rendering.',
  },
];

const SCREEN_W = 512;
const SCREEN_H = 374;

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPolygon(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function drawHexagon(ctx, cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  drawPolygon(ctx, pts);
}

function drawSvgPath(ctx, d, cx, cy, size, fill, stroke = null, strokeWidth = 1.5) {
  if (typeof Path2D !== 'function') return;
  const path = new Path2D(d);
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke(path);
  }
  ctx.restore();
}

function drawIcon(ctx, icon, accent, cx, cy, size) {
  const r = size * 0.48;
  switch (icon) {
    case 'docker': {
      // Stacked containers
      ctx.fillStyle = '#0284c7';
      const cw = size * 0.14;
      const ch = size * 0.12;
      const gap = size * 0.025;
      const baseX = cx - size * 0.27;
      const baseY = cy - size * 0.06;
      const boxes = [
        [0, 0], [1, 0], [2, 0], [3, 0],
        [1, -1], [2, -1], [3, -1],
        [2, -2],
      ];
      for (const [col, row] of boxes) {
        ctx.fillRect(baseX + col * (cw + gap), baseY + row * (ch + gap), cw, ch);
      }
      // Whale silhouette
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.38, cy + size * 0.09);
      ctx.lineTo(cx + size * 0.24, cy + size * 0.09);
      ctx.quadraticCurveTo(cx + size * 0.34, cy - size * 0.02, cx + size * 0.42, cy + size * 0.01);
      ctx.quadraticCurveTo(cx + size * 0.44, cy + size * 0.10, cx + size * 0.36, cy + size * 0.14);
      ctx.quadraticCurveTo(cx + size * 0.24, cy + size * 0.34, cx - size * 0.06, cy + size * 0.34);
      ctx.quadraticCurveTo(cx - size * 0.36, cy + size * 0.34, cx - size * 0.38, cy + size * 0.09);
      ctx.closePath();
      ctx.fill();
      // Whale eye
      ctx.fillStyle = '#f8f5dc';
      ctx.beginPath();
      ctx.arc(cx + size * 0.14, cy + size * 0.21, size * 0.025, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'compose': {
      // Three linked isometric containers in a triangle
      const drawCube = (x, y, s, topCol, leftCol, rightCol) => {
        const dx = s * 0.866;
        const dy = s * 0.5;
        ctx.fillStyle = topCol;
        drawPolygon(ctx, [[x, y - s], [x + dx, y - dy], [x, y], [x - dx, y - dy]]);
        ctx.fill();
        ctx.fillStyle = leftCol;
        drawPolygon(ctx, [[x - dx, y - dy], [x, y], [x, y + s], [x - dx, y + dy]]);
        ctx.fill();
        ctx.fillStyle = rightCol;
        drawPolygon(ctx, [[x + dx, y - dy], [x + dx, y + dy], [x, y + s], [x, y]]);
        ctx.fill();
      };
      const cs = size * 0.17;
      drawCube(cx, cy - size * 0.22, cs, '#38bdf8', '#0284c7', '#0369a1');
      drawCube(cx - size * 0.21, cy + size * 0.16, cs, '#38bdf8', '#0284c7', '#0369a1');
      drawCube(cx + size * 0.21, cy + size * 0.16, cs, '#38bdf8', '#0284c7', '#0369a1');
      break;
    }

    case 'kubernetes': {
      // 7-sided Kubernetes wheel
      const sides = 7;
      const pts = [];
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
        pts.push([cx + r * 0.96 * Math.cos(a), cy + r * 0.96 * Math.sin(a)]);
      }
      ctx.fillStyle = '#2563eb';
      drawPolygon(ctx, pts);
      ctx.fill();
      ctx.strokeStyle = '#f8f5dc';
      ctx.lineWidth = size * 0.065;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * 0.78 * Math.cos(a), cy + r * 0.78 * Math.sin(a));
        ctx.stroke();
      }
      ctx.fillStyle = '#f8f5dc';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'terraform': {
      // 4 isometric blocks forming T
      const w = size * 0.21;
      const h = size * 0.24;
      const sk = size * 0.12;
      const gap = size * 0.04;
      const block = (bx, by, col) => {
        ctx.fillStyle = col;
        drawPolygon(ctx, [
          [bx, by],
          [bx + w, by + sk],
          [bx + w, by + sk + h],
          [bx, by + h],
        ]);
        ctx.fill();
      };
      block(cx - w * 1.5 - gap, cy - h * 1.25, '#7c3aed');
      block(cx - w * 0.5, cy - h * 0.75, '#7c3aed');
      block(cx - w * 0.5, cy + h * 0.25 + gap, '#7c3aed');
      // Right-hand reversed slant block
      const rx = cx + w * 0.5 + gap;
      const ry = cy - h * 0.75 + sk;
      ctx.fillStyle = '#4c1d95';
      drawPolygon(ctx, [
        [rx, ry],
        [rx + w, ry - sk],
        [rx + w, ry - sk + h],
        [rx, ry + h],
      ]);
      ctx.fill();
      break;
    }

    case 'actions': {
      // GitHub Actions blue circle + play triangle + orbital nodes
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f8f5dc';
      ctx.lineWidth = size * 0.055;
      ctx.beginPath();
      ctx.arc(cx - size * 0.04, cy, r * 0.50, -0.8, 2.3);
      ctx.stroke();
      // Play triangle
      ctx.fillStyle = '#f8f5dc';
      drawPolygon(ctx, [
        [cx - size * 0.08, cy - size * 0.14],
        [cx + size * 0.14, cy],
        [cx - size * 0.08, cy + size * 0.14],
      ]);
      ctx.fill();
      // Accent ring nodes
      for (const [nx, ny] of [[0.26, -0.25], [0.28, 0.24]]) {
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.arc(cx + size * nx, cy + size * ny, size * 0.075, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'git': {
      // Tilted orange diamond + branch & 3 dots
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#e04527';
      const s = size * 0.66;
      drawRoundedRect(ctx, -s / 2, -s / 2, s, s, size * 0.1);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#f8f5dc';
      ctx.lineWidth = size * 0.065;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.14, cy - size * 0.22);
      ctx.lineTo(cx, cy - size * 0.08);
      ctx.lineTo(cx, cy + size * 0.22);
      ctx.moveTo(cx, cy - size * 0.08);
      ctx.lineTo(cx + size * 0.17, cy + size * 0.08);
      ctx.stroke();
      ctx.fillStyle = '#f8f5dc';
      for (const [dx, dy] of [[0, -0.08], [0, 0.22], [0.17, 0.08]]) {
        ctx.beginPath();
        ctx.arc(cx + dx * size, cy + dy * size, size * 0.072, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'github': {
      drawSvgPath(
        ctx,
        'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
        cx,
        cy,
        size * 0.9,
        '#18181b'
      );
      break;
    }

    case 'burp': {
      // PortSwigger Burp Suite orange circle/square with vertical bar + opposing proxy arrows
      ctx.fillStyle = '#ea580c';
      drawRoundedRect(ctx, cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8, size * 0.16);
      ctx.fill();
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = size * 0.085;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Center vertical line
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.62);
      ctx.lineTo(cx, cy + r * 0.62);
      ctx.stroke();
      // Left-pointing top chevron + right-pointing bottom chevron
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.06, cy - r * 0.42);
      ctx.lineTo(cx - r * 0.48, cy - r * 0.12);
      ctx.lineTo(cx - r * 0.06, cy + r * 0.06);
      ctx.moveTo(cx + r * 0.06, cy - r * 0.06);
      ctx.lineTo(cx + r * 0.48, cy + r * 0.12);
      ctx.lineTo(cx + r * 0.06, cy + r * 0.42);
      ctx.stroke();
      break;
    }

    case 'wireshark': {
      // Deep teal rounded badge with curved shark fin & water wave
      ctx.fillStyle = '#0e7490';
      drawRoundedRect(ctx, cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8, size * 0.18);
      ctx.fill();
      ctx.fillStyle = '#ecfeff';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.68, cy + r * 0.34);
      ctx.lineTo(cx - r * 0.25, cy + r * 0.34);
      ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.46, cx + r * 0.40, cy - r * 0.56);
      ctx.quadraticCurveTo(cx + r * 0.12, cy - r * 0.08, cx + r * 0.28, cy + r * 0.34);
      ctx.lineTo(cx + r * 0.68, cy + r * 0.34);
      ctx.lineTo(cx + r * 0.68, cy + r * 0.48);
      ctx.lineTo(cx - r * 0.68, cy + r * 0.48);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'owasp': {
      // Dark security shield with stylized wasp-wing V + lock dot
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.95);
      ctx.lineTo(cx + r * 0.85, cy - r * 0.62);
      ctx.quadraticCurveTo(cx + r * 0.82, cy + r * 0.45, cx, cy + r * 0.96);
      ctx.quadraticCurveTo(cx - r * 0.82, cy + r * 0.45, cx - r * 0.85, cy - r * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f8f5dc';
      ctx.lineWidth = size * 0.07;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.46, cy - r * 0.22);
      ctx.lineTo(cx, cy + r * 0.42);
      ctx.lineTo(cx + r * 0.46, cy - r * 0.22);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.34, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'jwt': {
      // 6-spoked double-chevron JWT starburst
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
      ctx.fill();
      const colors = ['#38bdf8', '#fb015b', '#d63aff', '#38bdf8', '#fb015b', '#d63aff'];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.fillStyle = colors[i];
        ctx.fillRect(-size * 0.045, -r * 0.72, size * 0.09, r * 0.46);
        ctx.restore();
      }
      ctx.fillStyle = '#f8f5dc';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'arch': {
      drawSvgPath(
        ctx,
        'M12 1.5 C10.9 4.2 10.2 5.9 9.0 8.5 C9.8 9.3 10.7 10.2 12.2 11.3 C10.6 10.6 9.5 10.0 8.6 9.2 C7.0 12.6 4.5 17.5 1.5 22.5 C5.0 20.5 7.7 19.3 10.2 18.8 C10.1 18.3 10.0 17.7 10.0 17.1 C10.0 15.0 11.1 13.4 12.4 13.5 C13.7 13.6 14.7 15.2 14.6 17.3 C14.6 17.8 14.5 18.3 14.4 18.8 C16.9 19.3 19.5 20.5 22.5 22.5 C21.8 21.2 21.2 20.0 20.6 18.9 C19.7 18.2 18.8 17.3 16.9 16.3 C18.2 16.6 19.1 17.0 19.8 17.4 C15.2 8.8 14.7 7.6 12 1.5 Z',
        cx,
        cy,
        size * 0.92,
        '#0284c7'
      );
      break;
    }

    case 'debian': {
      // Spiral swirl in crimson
      ctx.strokeStyle = '#a80030';
      ctx.lineWidth = size * 0.085;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 3.1; t += 0.1) {
        const rad = size * 0.04 + (t / (Math.PI * 3.1)) * r * 0.85;
        const x = cx + rad * Math.cos(t - 0.5);
        const y = cy + rad * Math.sin(t - 0.5);
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    }

    case 'linux': {
      // Stylized Tux penguin head/body silhouette
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(cx, cy + size * 0.06, r * 0.62, r * 0.80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.44, r * 0.44, 0, Math.PI * 2);
      ctx.fill();
      // White belly
      ctx.fillStyle = '#faf8ea';
      ctx.beginPath();
      ctx.ellipse(cx, cy + size * 0.12, r * 0.40, r * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      for (const ex of [-0.15, 0.15]) {
        ctx.beginPath();
        ctx.arc(cx + r * ex, cy - r * 0.50, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(cx + r * ex, cy - r * 0.50, r * 0.055, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#faf8ea';
      }
      // Golden beak & feet
      ctx.fillStyle = '#d97706';
      drawPolygon(ctx, [[cx - r * 0.22, cy - r * 0.34], [cx + r * 0.22, cy - r * 0.34], [cx, cy - r * 0.14]]);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.32, cy + r * 0.78, r * 0.26, r * 0.12, -0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + r * 0.32, cy + r * 0.78, r * 0.26, r * 0.12, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'python': {
      drawSvgPath(
        ctx,
        'M11.9 2C7.4 2 7.7 4 7.7 4l.01 2.1h4.3v.6H6s-3-.3-3 4.3 2.6 4.4 2.6 4.4h1.6v-2.1s-.1-2.6 2.5-2.6h4.3s2.4.1 2.4-2.4V4.5S16.8 2 11.9 2zm-2.4 1.5a.8.8 0 110 1.6.8.8 0 010-1.6z',
        cx,
        cy,
        size * 0.9,
        '#2b5b84'
      );
      drawSvgPath(
        ctx,
        'M12.1 22c4.5 0 4.2-2 4.2-2l-.01-2.1h-4.3v-.6H18s3 .3 3-4.3-2.6-4.4-2.6-4.4h-1.6v2.1s.1 2.6-2.5 2.6H10s-2.4-.1-2.4 2.4v3.8S7.2 22 12.1 22zm2.4-1.5a.8.8 0 110-1.6.8.8 0 010 1.6z',
        cx,
        cy,
        size * 0.9,
        '#d97706'
      );
      break;
    }

    case 'java': {
      // Steaming cup + saucer
      ctx.fillStyle = '#0369a1';
      drawRoundedRect(ctx, cx - r * 0.48, cy - r * 0.10, r * 0.90, r * 0.72, size * 0.08);
      ctx.fill();
      // Cup handle
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = size * 0.065;
      ctx.beginPath();
      ctx.arc(cx + r * 0.42, cy + r * 0.22, r * 0.22, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // Saucer
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.04, cy + r * 0.74, r * 0.72, r * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      // Steam wisps
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = size * 0.06;
      ctx.lineCap = 'round';
      for (const sx of [-0.18, 0.04]) {
        ctx.beginPath();
        ctx.moveTo(cx + r * sx, cy - r * 0.24);
        ctx.quadraticCurveTo(cx + r * (sx - 0.14), cy - r * 0.48, cx + r * (sx + 0.08), cy - r * 0.74);
        ctx.stroke();
      }
      break;
    }

    case 'go': {
      ctx.fillStyle = '#0891b2';
      drawRoundedRect(ctx, cx - r * 0.95, cy - r * 0.65, r * 1.9, r * 1.3, size * 0.16);
      ctx.fill();
      ctx.fillStyle = '#f8f5dc';
      ctx.font = `900 ${Math.round(size * 0.56)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GO', cx, cy + size * 0.03);
      break;
    }

    case 'javascript': {
      ctx.fillStyle = '#f7df1e';
      drawRoundedRect(ctx, cx - r * 0.88, cy - r * 0.88, r * 1.76, r * 1.76, size * 0.1);
      ctx.fill();
      ctx.strokeStyle = '#181806';
      ctx.lineWidth = size * 0.05;
      ctx.stroke();
      ctx.fillStyle = '#181806';
      ctx.font = `900 ${Math.round(size * 0.52)}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('JS', cx + r * 0.72, cy + r * 0.78);
      break;
    }

    case 'typescript': {
      ctx.fillStyle = '#1d4ed8';
      drawRoundedRect(ctx, cx - r * 0.88, cy - r * 0.88, r * 1.76, r * 1.76, size * 0.1);
      ctx.fill();
      ctx.fillStyle = '#f8f5dc';
      ctx.font = `900 ${Math.round(size * 0.52)}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('TS', cx + r * 0.72, cy + r * 0.78);
      break;
    }

    case 'c': {
      ctx.fillStyle = '#1e3a8a';
      drawHexagon(ctx, cx, cy, r * 0.94);
      ctx.fill();
      ctx.fillStyle = '#f8f5dc';
      ctx.font = `900 ${Math.round(size * 0.58)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', cx, cy + size * 0.03);
      break;
    }

    case 'cpp': {
      ctx.fillStyle = '#1d4ed8';
      drawHexagon(ctx, cx, cy, r * 0.94);
      ctx.fill();
      ctx.fillStyle = '#f8f5dc';
      ctx.font = `900 ${Math.round(size * 0.40)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C++', cx, cy + size * 0.03);
      break;
    }

    case 'spring': {
      ctx.fillStyle = '#4d9a2a';
      drawHexagon(ctx, cx, cy, r * 0.94);
      ctx.fill();
      // White leaf inside hexagon
      ctx.fillStyle = '#f8f5dc';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.45, cy + r * 0.42);
      ctx.quadraticCurveTo(cx - r * 0.42, cy - r * 0.42, cx + r * 0.48, cy - r * 0.42);
      ctx.quadraticCurveTo(cx + r * 0.42, cy + r * 0.45, cx - r * 0.45, cy + r * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4d9a2a';
      ctx.lineWidth = size * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.40, cy + r * 0.38);
      ctx.quadraticCurveTo(cx, cy, cx + r * 0.34, cy - r * 0.28);
      ctx.stroke();
      break;
    }

    case 'nodejs': {
      ctx.fillStyle = '#2f855a';
      drawHexagon(ctx, cx, cy, r * 0.94);
      ctx.fill();
      ctx.fillStyle = '#f8f5dc';
      ctx.font = `900 ${Math.round(size * 0.34)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NODE', cx, cy + size * 0.02);
      break;
    }

    case 'express': {
      ctx.fillStyle = '#18181b';
      drawRoundedRect(ctx, cx - r * 0.92, cy - r * 0.65, r * 1.84, r * 1.3, size * 0.16);
      ctx.fill();
      ctx.fillStyle = '#f8f5dc';
      ctx.font = `700 ${Math.round(size * 0.48)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ex', cx, cy + size * 0.02);
      break;
    }

    case 'react': {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = size * 0.06;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((Math.PI / 3) * i);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.94, r * 0.36, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'postgresql': {
      // Slonik elephant silhouette
      ctx.fillStyle = '#2b5b84';
      // Ears + head
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.36, cy - r * 0.12, r * 0.44, r * 0.56, -0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + r * 0.36, cy - r * 0.12, r * 0.44, r * 0.56, 0.25, 0, Math.PI * 2);
      ctx.arc(cx, cy - r * 0.20, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
      // Trunk
      ctx.strokeStyle = '#2b5b84';
      ctx.lineWidth = size * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.08);
      ctx.quadraticCurveTo(cx + r * 0.02, cy + r * 0.72, cx + r * 0.34, cy + r * 0.68);
      ctx.stroke();
      // Eyes
      ctx.fillStyle = '#f8f5dc';
      ctx.beginPath();
      ctx.arc(cx - r * 0.16, cy - r * 0.22, r * 0.08, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.16, cy - r * 0.22, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'rabbitmq': {
      ctx.fillStyle = '#ea580c';
      drawRoundedRect(ctx, cx - r * 0.88, cy - r * 0.88, r * 1.76, r * 1.76, size * 0.16);
      ctx.fill();
      // White rabbit silhouette
      ctx.fillStyle = '#fff7ed';
      drawRoundedRect(ctx, cx - r * 0.46, cy - r * 0.62, r * 0.22, r * 0.72, size * 0.05);
      ctx.fill();
      drawRoundedRect(ctx, cx - r * 0.08, cy - r * 0.62, r * 0.22, r * 0.72, size * 0.05);
      ctx.fill();
      drawRoundedRect(ctx, cx - r * 0.46, cy - r * 0.04, r * 0.96, r * 0.64, size * 0.09);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(cx + r * 0.26, cy + r * 0.28, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'threejs': {
      // Classic Three.js subdivided triangle wireframe
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = size * 0.05;
      ctx.lineJoin = 'round';
      const tri = (ax, ay, bx, by, cx0, cy0, depth) => {
        if (depth === 0) {
          drawPolygon(ctx, [[ax, ay], [bx, by], [cx0, cy0]]);
          ctx.stroke();
          return;
        }
        const abx = (ax + bx) / 2, aby = (ay + by) / 2;
        const bcx = (bx + cx0) / 2, bcy = (by + cy0) / 2;
        const cax = (cx0 + ax) / 2, cay = (cy0 + ay) / 2;
        tri(ax, ay, abx, aby, cax, cay, depth - 1);
        tri(abx, aby, bx, by, bcx, bcy, depth - 1);
        tri(cax, cay, bcx, bcy, cx0, cy0, depth - 1);
        tri(abx, aby, bcx, bcy, cax, cay, depth - 1);
      };
      const top = [cx - r * 0.15, cy - r * 0.88];
      const right = [cx + r * 0.88, cy + r * 0.25];
      const bot = [cx - r * 0.68, cy + r * 0.82];
      tri(top[0], top[1], right[0], right[1], bot[0], bot[1], 2);
      break;
    }

    default:
      break;
  }
}

/**
 * Renders one technology CRT monitor texture onto the provided 2D canvas.
 * Synchronous (no async image decoding) so textures upload cleanly on frame 1.
 */
export function drawMonitorScreenCanvas(canvas, tech, _index = 0, { verticalBias = 0, active = false } = {}) {
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;

  // Luminous warm ivory-amber CRT glow matching the surveillance room lightmap
  const bgGrad = ctx.createRadialGradient(
    SCREEN_W * 0.5,
    SCREEN_H * 0.44,
    SCREEN_W * 0.08,
    SCREEN_W * 0.5,
    SCREEN_H * 0.5,
    SCREEN_W * 0.68
  );
  bgGrad.addColorStop(0, active ? '#ffffff' : '#fcf9df');
  bgGrad.addColorStop(0.72, active ? '#f7f3c8' : '#eee9a9');
  bgGrad.addColorStop(0.92, active ? '#dfd882' : '#c8c064');
  bgGrad.addColorStop(1, active ? '#9b9433' : '#6c681e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // Subtle horizontal CRT scanlines
  ctx.fillStyle = active ? 'rgba(28, 27, 4, 0.035)' : 'rgba(28, 27, 4, 0.05)';
  for (let y = 0; y < SCREEN_H; y += 6) {
    ctx.fillRect(0, y, SCREEN_W, 2);
  }

  // Active monitor perimeter reticle & subtle corner highlight inside the bezel
  if (active) {
    const padX = 34;
    const padY = 28;
    const w = SCREEN_W - padX * 2;
    const h = SCREEN_H - padY * 2;
    ctx.save();
    ctx.strokeStyle = tech.accent || '#38bdf8';
    ctx.lineWidth = 8;
    drawRoundedRect(ctx, padX, padY, w, h, 24);
    ctx.stroke();
    ctx.restore();
  }

  // Large hero technology logo filling the CRT screen, nudged up on steeply tilted top monitors
  const iconY = SCREEN_H * (0.395 - verticalBias * 0.90);
  const baseSize = active ? 286 : 268;
  const iconSize = Math.round(baseSize * (1 - verticalBias * 0.42));
  drawIcon(ctx, tech.icon, tech.accent, SCREEN_W * 0.5, iconY, iconSize);

  // Crisp high-contrast technology label tucked cleanly beneath the icon
  const labelY = SCREEN_H * (0.785 - verticalBias * 1.50);
  ctx.fillStyle = active ? (tech.accent === '#18181b' || tech.accent === '#111827' ? '#181806' : tech.accent) : '#181806';
  ctx.font = '800 34px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tech.name, SCREEN_W * 0.5, labelY, SCREEN_W * 0.72);
}

/**
 * Draws a compact crisp icon onto a small HUD badge canvas using the same vector renderer.
 */
export function drawTechBadgeCanvas(canvas, tech) {
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext?.('2d');
  if (!ctx || !tech) return;
  ctx.clearRect(0, 0, size, size);
  drawIcon(ctx, tech.icon, tech.accent, size * 0.5, size * 0.5, size * 0.88);
}
