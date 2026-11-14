import * as THREE from 'three';

const PASSIVE_GESTURE_EVENTS = ['wheel', 'touchstart', 'touchmove'];

/**
 * Builds the accessible `.project-sheet` dialog overlay element for a Red Branch project.
 * Keeps wheel/touch scroll isolated to the sheet paper and lets Tab/Escape bubble to ExperiencesAct.
 */
export function createProjectSheet(project) {
  const sheet = document.createElement('article');
  sheet.className = 'project-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.setAttribute('aria-label', `${project.title} · project details`);

  const paper = document.createElement('div');
  paper.className = 'project-sheet__paper';

  if (project.status === 'wip') {
    const stamp = document.createElement('strong');
    stamp.className = 'project-sheet__stamp';
    stamp.textContent = 'WORK IN PROGRESS';
    paper.append(stamp);
  }

  const eyebrow = document.createElement('p');
  eyebrow.className = 'project-sheet__eyebrow';
  eyebrow.textContent = project.sheet?.eyebrow || project.badge;

  const title = document.createElement('h3');
  title.className = 'project-sheet__title';
  title.textContent = project.title;

  const summary = document.createElement('p');
  summary.className = 'project-sheet__summary';
  summary.textContent = project.sheet?.summary || project.shortDesc;

  const highlights = document.createElement('ul');
  highlights.className = 'project-sheet__highlights';
  (project.sheet?.highlights || []).forEach((text, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'project-sheet__number';
    number.textContent = String(index + 1).padStart(2, '0');
    const description = document.createElement('span');
    description.textContent = text;
    item.append(number, description);
    highlights.append(item);
  });

  const detail = document.createElement('p');
  detail.className = 'project-sheet__detail';
  detail.textContent = project.fullDesc;

  const stackLabel = document.createElement('p');
  stackLabel.className = 'project-sheet__stack-label';
  stackLabel.textContent = 'SELECTED STACK';

  const stack = document.createElement('ul');
  stack.className = 'project-sheet__stack';
  (project.tags || []).slice(0, 6).forEach(tag => {
    const item = document.createElement('li');
    item.textContent = tag;
    stack.append(item);
  });

  paper.append(eyebrow, title, summary, highlights, detail, stackLabel, stack);

  for (const type of PASSIVE_GESTURE_EVENTS) {
    sheet.addEventListener(type, event => event.stopPropagation(), { passive: true });
  }
  sheet.addEventListener('keydown', event => {
    if (event.key !== 'Escape' && event.key !== 'Tab') {
      event.stopPropagation();
    }
  });

  if (project.github) {
    const link = document.createElement('a');
    link.className = 'project-sheet__source';
    link.href = project.github;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'SOURCE ON GITHUB ↗';
    paper.append(link);
  }

  sheet.append(paper);
  return sheet;
}

/**
 * Projects an origami rig's bounds onto viewport coordinates and syncs the matching
 * `.project-sheet` CSS transform only when values actually change.
 */
export function syncProjectSheet(sheet, state, {
  selected,
  rig,
  camera,
  progress,
  viewportWidth,
  viewportHeight,
  scratch,
}) {
  if (state.hidden !== !selected) {
    sheet.hidden = !selected;
    state.hidden = !selected;
  }
  if (!selected) return;

  const opacity = THREE.MathUtils.smoothstep(progress, 0.86, 0.98);
  const opacityStr = String(opacity);
  const visibility = opacity > 0.01 ? 'visible' : 'hidden';
  const ariaHidden = String(opacity < 0.9);

  if (state.opacity !== opacityStr) {
    sheet.style.opacity = opacityStr;
    state.opacity = opacityStr;
  }
  if (state.visibility !== visibility) {
    sheet.style.visibility = visibility;
    state.visibility = visibility;
  }
  if (state.ariaHidden !== ariaHidden) {
    sheet.setAttribute('aria-hidden', ariaHidden);
    state.ariaHidden = ariaHidden;
  }

  const { center, left, right, top, bottom } = scratch;
  rig.root.localToWorld(center.set(0, 0, 0)).project(camera);
  rig.root.localToWorld(left.set(-1.55, 0, 0)).project(camera);
  rig.root.localToWorld(right.set(1.55, 0, 0)).project(camera);
  rig.root.localToWorld(top.set(0, 2.19, 0)).project(camera);
  rig.root.localToWorld(bottom.set(0, -2.19, 0)).project(camera);

  const halfW = viewportWidth * 0.5;
  const halfH = viewportHeight * 0.5;
  const cx = (center.x + 1) * halfW;
  const cy = (1 - center.y) * halfH;
  const lx = (left.x + 1) * halfW;
  const ly = (1 - left.y) * halfH;
  const rx = (right.x + 1) * halfW;
  const ry = (1 - right.y) * halfH;
  const tx = (top.x + 1) * halfW;
  const ty = (1 - top.y) * halfH;
  const bx = (bottom.x + 1) * halfW;
  const by = (1 - bottom.y) * halfH;

  const leftStr = `${cx}px`;
  const topStr = `${cy}px`;
  const widthStr = `${Math.hypot(rx - lx, ry - ly)}px`;
  const heightStr = `${Math.hypot(bx - tx, by - ty)}px`;
  const transformStr = `translate(-50%, -50%) rotate(${Math.atan2(ry - ly, rx - lx)}rad)`;

  if (state.left !== leftStr) {
    sheet.style.left = leftStr;
    state.left = leftStr;
  }
  if (state.top !== topStr) {
    sheet.style.top = topStr;
    state.top = topStr;
  }
  if (state.width !== widthStr) {
    sheet.style.width = widthStr;
    state.width = widthStr;
  }
  if (state.height !== heightStr) {
    sheet.style.height = heightStr;
    state.height = heightStr;
  }
  if (state.transform !== transformStr) {
    sheet.style.transform = transformStr;
    state.transform = transformStr;
  }
}
