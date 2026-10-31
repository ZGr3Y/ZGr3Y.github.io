# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: read ADRs that touch the area you are about to work in.

## File structure

Single-context repo:

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-spatial-station-architecture-with-threejs.md
│   └── 0002-cloud-native-light-theme-and-topology.md
└── src/
```

## Use the glossary's vocabulary

When naming domain concepts, use the terms defined in `GLOSSARY.md` (e.g. `Station`, `HUD`, `Cloud Mesh Topology`, `Cloud Card`, `Idle Damping`).
