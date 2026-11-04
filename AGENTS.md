# AGENTS.md — Working Agreements for Antigravity & Pair Programming

This document defines the working agreements, pace, and interaction style for agents operating in this repository.

## 1. No Auto-Pilot: User Drives the Framework
- **Never advance past a step on your own initiative.** Do not start coding, branching, or merging without explicit user confirmation.
- **User is the MITM Gatekeeper:** Treat the user as an active Man-in-the-Middle (MITM) controller. Any procedure, file creation, architectural shift, or transition to a new seam MUST be explicitly vetted and authorized by the user before execution. Never batch decisions or rush ahead.
- **Close the Vertical Slice Before Advancing:** Complete and integrate the current slice end-to-end (wired to the DOM/canvas and verified on screen) before designing subsequent abstractions or writing new test files. Never introduce anticipatory or speculative architecture. In an already-navigable spatial canvas, maintain DOM stability by rendering minimal semantic placeholders (`hidden=""`) for unbuilt stations so layout and accessibility invariants remain valid across navigation.
- **Strict TDD Micro-Step Pacing (Never Combine RED & GREEN in One Turn):**
  - **Phase RED**: Write **only** the failing test, run the test runner, present the failing error message to the user, and **STOP the turn immediately**.
  - **User Gatekeeping**: Await explicit user authorization before writing *any* implementation code.
  - **Phase GREEN**: Write **only** the minimal implementation required to satisfy the test, run the test runner to prove it passes, present the passing result to the user, and **STOP the turn immediately**.
  - Under no circumstances may an agent write a failing test and its implementation in a single shot/turn.
- **Merge Gatekeeping:** Never urge, prompt, or suggest merging a PR. Present CI check results and review findings objectively, then stop and await the user's explicit instructions. The user alone determines when all automated checks and reviewers (including external bots like Codex) are satisfied before merging.
- **Coach the user:** At each stage, clearly name the next step in the Matt Pocock flow and instruct the user on which slash command/skill to type (e.g. `/implement`, `/tdd`, `/code-review`, `/pr`). The user must invoke the command so they learn and internalize the framework.

## 2. Total Code & Test Transparency
- **Explain before and after:** Never write or modify files silently. Always explain in plain, accessible terms what each file does, why it is needed, and what each test asserts.
- **Demystify the tooling:** Explain concepts like DOM, ARIA, CI/CD, test runners, and Three.js mechanics whenever they are introduced or modified.

## 3. Git & GitHub Guardrails
- **Main is sacred:** Never commit directly to `main`. All changes go through dedicated feature branches (`feat/issue-<number>-<slug>`).
- **Conventional Commits:** Write clean, atomic commits (`feat:`, `test:`, `ci:`, `docs:`, `refactor:`) referencing the issue number.
- **Pull Request workflow & Codex Review Loop:** Open PRs using the formal PR template. Immediately after opening a PR (and after pushing any subsequent fix commit), the agent MUST:
  1. Trigger bot review by commenting `@codex review` on the pull request.
  2. Wait for Codex to complete its evaluation.
  3. Thoroughly analyze any findings (P1/P2/P3), implement the required fixes in dedicated atomic commits, and push.
  4. Re-trigger `@codex review` and repeat the loop until Codex explicitly confirms no major issues remain ("Didn't find any major issues" or 👍).
  5. Ensure all GitHub Actions CI checks are 100% green before presenting the PR to the user for the merge decision.

## Agent skills

### Issue tracker
Issues and specs for this repo live on GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs
Single-context layout (root GLOSSARY.md and docs/adr/). See `docs/agents/domain.md`.

### Coding standards
Standards enforced during code review. See `CODING_STANDARDS.md`.


