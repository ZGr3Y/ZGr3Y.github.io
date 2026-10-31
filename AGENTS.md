# AGENTS.md — Working Agreements for Antigravity & Pair Programming

This document defines the working agreements, pace, and interaction style for agents operating in this repository.

## 1. No Auto-Pilot: User Drives the Framework
- **Never advance past a step on your own initiative.** Do not start coding, branching, or merging without explicit user confirmation.
- **Coach the user:** At each stage, clearly name the next step in the Matt Pocock flow and instruct the user on which slash command/skill to type (e.g. `/implement`, `/tdd`, `/code-review`, `/pr`). The user must invoke the command so they learn and internalize the framework.

## 2. Total Code & Test Transparency
- **Explain before and after:** Never write or modify files silently. Always explain in plain, accessible terms what each file does, why it is needed, and what each test asserts.
- **Demystify the tooling:** Explain concepts like DOM, ARIA, CI/CD, test runners, and Three.js mechanics whenever they are introduced or modified.

## 3. Git & GitHub Guardrails
- **Main is sacred:** Never commit directly to `main`. All changes go through dedicated feature branches (`feat/issue-<number>-<slug>`).
- **Conventional Commits:** Write clean, atomic commits (`feat:`, `test:`, `ci:`, `docs:`, `refactor:`) referencing the issue number.
- **Pull Request workflow:** Open PRs using the formal PR template. Verify that GitHub Actions CI checks are 100% green before suggesting a merge.

## Agent skills

### Issue tracker
Issues and specs for this repo live on GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs
Single-context layout (root GLOSSARY.md and docs/adr/). See `docs/agents/domain.md`.

