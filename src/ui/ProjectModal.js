/**
 * Modal Inspector for Security Projects
 */
export class ProjectModal {
  constructor({ container, onOpen = () => {}, onClose = () => {} }) {
    this.container = container;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.isOpen = false;

    this.bindGlobalEvents();
  }

  bindGlobalEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });
  }

  open(project) {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.container.setAttribute('aria-hidden', 'false');

    this.container.innerHTML = `
      <div class="modal-card">
        <button class="modal-close-btn" aria-label="Close modal">&times;</button>
        
        <div style="margin-bottom: 8px;">
          <span class="card-status ${project.status === 'production' ? 'production' : ''}">${project.badge}</span>
        </div>

        <h2 style="font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 14px; color: #fff;">${project.title}</h2>

        <p style="font-size: 0.95rem; line-height: 1.65; color: var(--text-secondary); margin-bottom: 24px;">
          ${project.fullDesc || project.shortDesc}
        </p>

        <div style="margin-bottom: 24px;">
          <h4 style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.1em;">
            Technologies & Security Vectors
          </h4>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${project.tags.map(t => `<span class="card-tag" style="background: rgba(0, 240, 255, 0.08); border-color: rgba(0, 240, 255, 0.25); color: #fff;">${t}</span>`).join('')}
          </div>
        </div>

        <div style="display: flex; gap: 14px; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
          ${project.github ? `
            <a href="${project.github}" target="_blank" rel="noopener noreferrer" class="btn-glass btn-glass-primary">
              <span>View Source on GitHub</span>
              <span>↗</span>
            </a>
          ` : ''}
          <button class="btn-glass modal-dismiss-btn">Close Inspector</button>
        </div>
      </div>
    `;

    const closeBtn = this.container.querySelector('.modal-close-btn');
    const dismissBtn = this.container.querySelector('.modal-dismiss-btn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (dismissBtn) dismissBtn.addEventListener('click', () => this.close());

    this.onOpen(project);
  }

  close() {
    this.isOpen = false;
    this.container.classList.add('hidden');
    this.container.setAttribute('aria-hidden', 'true');
    this.container.innerHTML = '';
    this.onClose();
  }
}
