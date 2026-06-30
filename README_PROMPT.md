<!-- HOW TO USE: open a fresh Claude Code session in THIS folder, then paste this entire
file as your first message. PROJECT and NOTES below are pre-filled for this repo — edit the
NOTES if you want to add or correct anything. Delete this file (or .gitignore it) once your
README is done. This comment is for you, not the AI — the AI should start at "You are writing". -->

You are writing (or upgrading) the portfolio README for ONE project, in my established house style. The audience is recruiters and hiring managers who will spend 30-60 seconds scanning before deciding whether to open the code — optimize the top third for that scan, and reward the person who scrolls. You are running in the project's root folder.

PROJECT: FireGame

## Ground rules (read first)
- Describe what the project CAN AND WILL BE, not only what exists today. Several of my projects are half-baked (no frontend, half-implemented). Be honest about the current state, but frame the vision confidently — a short "Status" or "Roadmap" note is good. Never describe an unbuilt feature as if it works; mark anything aspirational clearly.
- Do NOT invent facts. If you can't verify something from the code (a metric, a deploy URL, an API behavior), omit it or leave a clearly-marked <!-- TODO --> for me. When unsure, ask me before writing.
- Write like a confident senior engineer, not a marketer: plain, direct, specific, first person. Pick the ONE or TWO genuinely clever things and dwell on them rather than describing everything evenly.

## Step 1 — Investigate before writing anything
Do NOT write a word until you've inspected the repo:
1. List the root dir; identify the project type (web app, CLI, library, mobile, ML, firmware, etc.).
2. Read EVERY manifest you can find — package.json, *.csproj, pyproject.toml, requirements.txt, Cargo.toml, go.mod, Gemfile, composer.json, pom.xml, build.gradle, *.sln, platformio.ini, etc. Extract the full list of languages, frameworks, libraries, and tooling — you need all of it for the badge wall.
3. Read the entry point and the 1-2 most substantial source files to learn what the code actually does, what works, and what's stubbed / TODO / planned.
4. Check deployment configs (vercel.json, netlify.toml, firebase.json, Dockerfile, fly.toml, .github/workflows, systemd units, cloud configs) — this tells you if there's a live deployment and whether a CI build badge applies.
5. Look for existing screenshots / GIFs / images (/assets, /docs, /public, /screenshots, /images, root) — reuse real ones instead of placeholders if they exist.
6. Skim `git log --oneline -20` and the first commit message for the original intent.
7. Read .env.example / config files to see what the project connects to.
8. Pin down the single most non-obvious / clever thing: a hard problem solved, or a surprising combination of libraries / hardware / APIs stitched together. (The breadth of stitched-together tech is part of the impression — make it legible later.)

Then give me a 4-6 line read of the project and ASK me, before writing:
- The one-sentence elevator pitch in MY OWN WORDS (what it is, why I built it) — use my phrasing as the seed for the hero so the README sounds like me.
- Is there a live demo URL? Do not invent one if I say no.
- Anything I want highlighted — a hard problem I solved, a design decision I'm proud of, a constraint I worked around (this seeds "What I learned").
- What's intended but not yet built (so the README can describe what it can and will be).
Wait for my answers if any are load-bearing.

## Step 2 — Write the README in this order (skip a section only if truly inapplicable)

1. HERO BLOCK
   - Project DISPLAY name as H1 (not the folder name).
   - One-line *italic* tagline directly underneath — specific, a little bold.
   - The badge wall (see Step 3).
   - 2-3 sentence description seeded from my elevator pitch: what it is, who it's for, what makes it interesting. No buzzwords.
   - Quick-links row: [Live Demo](url) · [How it works](#architecture) — omit any that don't exist.

2. DEMO / VISUAL PROOF (near the top — it sells first)
   - If real screenshots/GIFs already exist in the repo, use those paths. Otherwise insert:
       ![Demo](./assets/demo.gif)
       <!-- TODO: replace with a real demo.gif — show <the single best moment to capture>. 1200px wide max; Kap (Mac) / ScreenToGif (Windows) / LICEcap (cross-platform). -->
   - For CLI tools, suggest an asciinema cast as an alternative.
   - Leave a second placeholder near Features if the project has another UI surface worth showing.

3. ## Why this exists — 2-4 sentences. The problem, the motivation, the constraint that shaped it. Distinct from the hero ("what it is") — this is "why it needed to exist." Specific enough to separate a portfolio project from a tutorial clone. First person.

4. ## Features — 4-8 bullets, each a concrete capability with a **bold lead-in**. Lead with the verb or noun ("Real-time collaboration via WebSockets," not "Implements real-time collaboration").

5. ## Tech stack — grouped under subheadings (Frontend / Backend / Database / Infrastructure / Tooling, or Service / Input / AI / Audio / Hardware — whichever apply). Name each library and what it's for. Comprehensive; separate from the scannable badge wall up top.

6. ## Architecture — a Mermaid diagram of data flow / component relationships / request lifecycle. Make it genuinely visual: subgraphs to group components, distinct shapes for services vs data stores vs external APIs, labels on the non-obvious arrows, 5-15 nodes. THEN a 2-3 sentence paragraph that points at the single most non-obvious node and explains the clever bit ("the interesting part of this diagram is X, which does Y"). Include:
       <!-- Optional: replace the Mermaid diagram with a custom image (Excalidraw, draw.io, Figma export) for a more polished look -->
       <!-- ![Architecture](./assets/architecture.png) -->

7. ## Getting started — Prerequisites with specific versions (Node 18+, Python 3.11+, .NET 8). Install + run in 3-5 copy-pasteable commands DERIVED FROM the actual scripts (package.json / Makefile / etc.) — do not guess; this section must work as written. Note required env vars and point to .env.example (flag it as a TODO if missing). Show expected output where useful.

8. ## What I learned — 3-4 GENUINE, specific engineering insights (bold lead-in + 2-3 sentences), seeded from what I told you I'm proud of. Grounded and concrete ("Used a queue instead of polling to handle bursty X" beats "learned about scalability"). This is the highest-signal section for recruiters; spend real effort here. If the project is small enough that this would feel forced, draft it anyway and flag it as cuttable in the action items.

9. Optional closing *italic* Status/Roadmap note for WIP projects ("…what it can and will be").

## Step 3 — Badge rules
Build an exhaustive, scannable badge wall in the hero with shields.io, style=flat-square across all of them. Cover: every language; every major framework; notable libraries and tools (be generous — recruiters scan these); infrastructure (Docker/Vercel/Firebase/AWS/Azure) if used; a CI build-status badge if a workflow exists.
- Official-logo format: ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
- Libraries without an official badge: ![Name](https://img.shields.io/badge/Name-2D2D2D?style=flat-square) — use the brand color if you can find it, else neutral dark (2D2D2D).
- Group badges by category with a blank line between groups (Languages / Frameworks / Libraries / Infra) so the wall is scannable, not a wall of color.

## Step 4 — Tone & exclusions
- Plain, direct, specific, first person. Pick the one or two clever things and dwell on them.
- Real numbers where possible ("reduced bundle from 800KB to 240KB" beats "optimized performance").
- No buzzwords — no "revolutionary," "leveraging," "seamless," "cutting-edge." No "Made with love."
- No emojis in section headers (one or two elsewhere only if they add clarity).
- Do NOT add a table of contents, contributing, license, or code-of-conduct section.
- Code blocks must specify their language for syntax highlighting.
- Mark every spot where I should add a screenshot/gif with an HTML <!-- TODO: ... -->; reference an ./assets/ folder (gifs ≤1200px wide).

## Step 5 — Deliverable
Write the README as a single markdown file at the repo root. Then give me an ACTION ITEMS list:
(a) ASSET SHOT-LIST: every gif/screenshot to capture, where it goes, and exactly what each should show (this is where I, the human, pitch in).
(b) TODOs you flagged (missing .env.example, no live demo URL, claims left as <!-- TODO --> because you couldn't verify them).
(c) Judgment calls you made where you were uncertain.
(d) Whether "What I learned" feels forced for this project and should be cut.

Begin by investigating the repo (Step 1), then ask me the Step 1 questions before writing.

PROJECT-SPECIFIC NOTES (from my playbook; may be incomplete — verify against the code):
**Code state:** mostly-complete · **README:** none → write
**Tagline:** *A browser platformer engine inspired by Donkey Kong — built from scratch on Rapier 2D physics + Three.js, with a fully decoupled engine/game split.*

Three playable levels, three barrel-enemy AIs (rolling/bouncing/seeking), ladders, teleporters, tuned jump "feel" profiles, loaded from GLB level files.

- **Why it exists:** A portfolio piece showcasing clean game architecture — the physics/rendering engine knows zero of the game's assets; everything is pluggable via registries and factories.
- **The cool part:** Rapier 2D kinematic character controller using shapecasting (no jitter/clip bugs, with coyote-time + jump-buffering); declarative contact-rule registry (physics dispatches, game handles — no entity-type checks in physics); zero-allocation hot path; seeded RNG (1337) for reproducible playtests.
- **Recruiter hook:** Engine/game separation across 28 TS files + multiple ground-up refactors (visible in git) — proves the ability to untangle tight coupling into clean layers.
- **Badges:** TypeScript, Vue 3, Three.js, Rapier2D, Vite, Firebase
- **Tech stack:** TypeScript, Three.js 0.162, Rapier2D 0.14, Vue 3, Vite, Tailwind; Firebase Hosting; Draco compression
- **Diagrams/visuals:** Mermaid: Experience singleton → Physics/Camera/Input/Resources/Debug + GameDirector → entities; player state machine (Idle↔Run↔Jump↔Fall↔Climb)
- **🎥 You film this:** Player jumping a rolling barrel mid-stride; seeking barrel + rolling barrel running two AIs at once; debug overlay (F3) showing physics wireframes + shapecasts
- **Sections:** canonical + **Level design workflow** (GLB format + Shapr3D/Blender export), **Feel profiles & tuning** (DK vs Celeste)
