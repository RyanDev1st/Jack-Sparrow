# 📋 Task Plan: Treasure Hunt App

## Current UI Build Status
- [x] Route the onboarding flow into real pages (`/`, `/join`, `/scan`).
- [x] Restore the orb eyes without breaking FOV/background compositing.
- [x] Make the keyboard itself the join interaction.
- [x] Replace the old join panel/toggle concept with the keyboard-led join scene.
- [x] Add join-scene warming/preload support.
- [x] Add a safer join loader handoff so the route does not feel blank.
- [x] Redesign the scan section into a zone confirmation / check-in interface.
- [x] Improve general startup performance with lazy loading and lighter background rendering.
- [ ] Split `src/components/OnboardingFlow.tsx` under the 500-line project rule.
- [ ] Run live desktop/mobile signoff on join loader, keyboard feel, and scan spacing.
- [ ] Continue the next audit pass on the QR/check-in flow and then the admin verification flow.

## Phase 1: B - Blueprint (Vision & Logic)
- [x] Answer the 5 Discovery Questions (North Star, Integrations, Source of Truth, Delivery Payload, Behavioral Rules).
- [x] Define JSON Data Schema (Input/Output shapes) in `gemini.md`.
- [x] Research: Search repos and databases for helpful resources, and populate `findings.md`.
- [x] **HALT:** Await approved Blueprint before writing tools.

## Phase 2: L - Link (Connectivity)
- [ ] Setup API keys and secrets in `.env`.
- [ ] Build minimal handshake scripts in `tools/` to verify external services.
- [ ] Verify `Link` is unbroken before proceeding to full logic.

## Phase 3: A - Architect (The 3-Layer Build)
- [ ] **Layer 1 (Architecture):** Write Technical SOPs in `architecture/` (goals, inputs, tool logic, edge cases). 
- [ ] **Layer 2 (Navigation):** Set up routing of data between SOPs and Tools.
- [ ] **Layer 3 (Tools):** Build atomic, deterministic Python scripts in `tools/`. Use `.tmp/` for intermediate file operations.

## Phase 4: S - Stylize (Refinement & UI)
- [ ] **Payload Refinement:** Format all outputs (Slack blocks, Notion layouts, Email HTML) for professional delivery.
- [ ] **UI/UX:** Apply clean CSS/HTML, intuitive layouts, and glassmorphism.
- [ ] **Feedback:** Present stylized results to user for review.

## Phase 5: T - Trigger (Deployment)
- [ ] **Cloud Transfer:** Move finalized logic from local testing to the production cloud environment.
- [ ] **Automation:** Set up execution triggers (Cron jobs, Webhooks, or Listeners).
- [ ] **Documentation:** Finalize Maintenance Log in `gemini.md`.

## Immediate Next Agent Tasks
- [ ] Break `OnboardingFlow.tsx` into route/stage-specific modules while preserving current behavior.
- [ ] Audit the join loader visually on slow loads and mobile browsers.
- [ ] Verify the keyboard SFX fade behavior in a real browser session.
- [ ] Continue refining the scan/check-in page layout now that the placeholder dashboard is gone.
- [ ] Decide whether the scan page needs a completion modal prototype for the “all zones solved -> check-in table” flow.
