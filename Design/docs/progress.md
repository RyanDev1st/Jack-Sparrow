# 📈 Progress Log: Treasure Hunt App
**Log all executed tasks, errors, tests, and results here.**

## System Initialization
- **Action:** Initialized B.L.A.S.T. project memory (`task_plan.md`, `findings.md`, `progress.md`, `claude.md`, `gemini.md`).
- **Result:** Success.
- **Next Steps:** Await user answers for Discovery Questions (located in `claude.md`).

## Blueprint Approval
- **Action:** User provided Discovery answers. Processed into `gemini.md` schema, `findings.md` constraints, and `claude.md`.
- **Result:** Blueprint approved by User.
- **Next Steps:** Transition to UI/UX execution. Await user's specific design request to begin coding components.

## Constraint Update (Strict Modularity)
- **Action:** Enforced user's new constraint: All code files must be under 500 lines. Files over this threshold must be split into logical subdirectories (e.g., `feature/hero.tsx`, `feature/body.tsx`). Documented in `gemini.md` and `findings.md`.
- **Result:** System rules updated successfully.
- **Next Steps:** Await user's specific design request to begin UI/UX execution.

## Hero Orb Audit & Repair
- **Action:** Audited the active hero route and Spline integration instead of assuming the cursor logic was at fault.
- **Finding:** The orb eyes were being hidden by the app-side object hide list after scene load.
- **Change:** Updated `src/components/SplineOrb.tsx` to prefer object-ID hiding and stop removing the eye meshes.
- **Result:** Eyes remain visible after load while preserving the current FOV/background behavior.

## Orbital Hero Polish
- **Action:** Improved the orbital ring presentation and interaction feel.
- **Change:** Strengthened orbital ring contrast, improved node hover/pulse states, and ensured orbital UI elements still participate in the orb’s look-at behavior.
- **Result:** The hero feels more alive and readable without rewriting the core scene setup.

## Bubble / Yarn Iterations
- **Action:** Multiple passes were made on the orb speech bubble attachment and timing.
- **Change:** Reworked bubble anchoring, left/right attachment logic, and randomized message timing so bubbles feel less repetitive.
- **Result:** Bubble placement improved, though this area remained visually sensitive and may still need more art direction.

## Routing & Mobile Compatibility
- **Action:** Converted the onboarding sequence into proper routes.
- **Change:** Added `/`, `/join`, and `/scan` routes, with browser back/forward behavior handled by `react-router-dom`.
- **Change:** Improved mobile sizing using `100svh`-aware layout and responsive scale logic.
- **Result:** Navigation now behaves like real pages and is more stable on mobile browser chrome.

## Join Screen Redesign
- **Action:** Replaced the old glass panel/toggle idea with the Spline keyboard join flow.
- **Change:** The keyboard scene became the dominant join object. The crest key is now the actual interactable trigger.
- **Change:** Status copy was returned to `NOT JOINED -> JOINED`.
- **Result:** Join now reads as a branded scene transition rather than a generic web form.

## Join Loader, Preload, and Audio Handoff
- **Action:** Optimized the join transition for UX and performance.
- **Change:** Added `src/lib/spline-scenes.ts` to centralize scene URLs and preload warming.
- **Change:** App now warms both the orb scene and keyboard scene ahead of time.
- **Change:** `SplineOrb.tsx` now exposes an `onPresented` callback so the join page can wait for a stronger presented state rather than relying on raw load completion.
- **Change:** Join loader now escalates after a short delay instead of always appearing immediately. A dark veil covers the route before the full loader appears, so the user does not land on a blank page.
- **Change:** Keyboard SFX now fades down before the route switch and restores after the scan page settles, using the runtime’s exposed Howler object as a best-effort bridge.
- **Result:** The join transition is materially smoother and no longer carries the previous multi-second dead delay.

## QR / Check-in Section Redesign
- **Action:** Re-audited the scan page against the actual app concept provided by the user.
- **Finding:** The old three-card QR dashboard looked like a placeholder demo and incorrectly treated QR as a core “step.”
- **Change:** Added `src/components/QRCheckinStage.tsx` and lazy-loaded it from onboarding.
- **Change:** The new layout emphasizes:
- zone confirmation scanner surface
- assigned hunt sheet context
- zone board
- run status
- final check-in destination
- **Change:** Progress wording now reads like a hunt flow instead of a QR flow.
- **Result:** The scan page is now substantially closer to an event-ready check-in experience.

## Performance Optimization Pass
- **Action:** Reduced avoidable startup and rendering cost.
- **Change:** `SplineBot` is now lazy-loaded instead of being bundled into the initial onboarding startup path.
- **Change:** The unstable canvas ash renderer was removed and replaced with a CSS-driven background system.
- **Change:** Heavy scan content is now code-split behind a lazy boundary.
- **Result:** Production build still contains large Spline/runtime chunks, but the main app bootstrap chunk is much smaller and onboarding no longer pays for unrelated 3D upfront.

## Spline Stability Repair
- **Action:** Re-audited the latest unstable onboarding changes directly in Chrome.
- **Finding:** The black/dull Spline background regression came from the recent wrapper path, not from the scene assets alone.
- **Change:** Restored transparent scene compositing in `src/components/SplineOrb.tsx` with a runtime background override and removed the unstable manual canvas-init path.
- **Result:** The orb and keyboard scenes are transparent again over the shared site background.

## Frontend Frame Budget Pass
- **Action:** Tightened the custom JS animation loops instead of letting them run uncapped.
- **Change:** Added explicit frame budgets for:
- orbital ring RAF motion
- mobile fake-look cursor motion
- join zoom tween
- SFX fade curves
- **Result:** The app now intentionally skips intermediate frames in its custom loops while preserving the motion language, which improves consistency on weaker devices.

## Final Visual Smoothening
- **Action:** Did a final pass on the onboarding visual feel.
- **Change:** The keyboard pop-in now starts from a more distant entry zoom and eases into the target framing with a smoother quintic zoom arc.
- **Change:** The shared background was redesigned darker, with a smaller aurora, deeper vignette, and a restored star-blink layer over the ash field.
- **Change:** Lighting balance was reduced so the background supports the Spline assets instead of competing with them.
- **Result:** The onboarding flow now reads darker, calmer, and more dimensional while staying visually alive.

## Verification
- **Build:** `npm run build` passes after the latest onboarding and scan changes.
- **Local server:** `http://localhost:5173` responded successfully.
- **Browser automation:** Verified in headed Chrome via Playwright on:
- `/`
- `/join`
- `/scan`
- **Result:** Current hero, join, and scan routes render with transparent Spline scenes and the updated shared background. Remaining console warnings are Spline/Three shader warnings, not app errors.

## Workspace Confirmation & Runbook
- **Action:** Re-scanned the workspace to confirm which folder now owns the integrated frontend.
- **Finding:** `Design/` is the active frontend app that contains the designed onboarding, join, scan, and admin routes. `main/` is a separate app tree and should not be used for this frontend by default.
- **Change:** Added `docs/runbook.md` with exact startup commands, routes, key files, and verification steps.
- **Verification:** Ran `npm run build` from `c:\Users\admin\JS-Visual Audit\Design` successfully.
- **Result:** The handoff path is now explicit: open a terminal in `Design/`, run `npm run dev`, and use `http://localhost:5173`.

## Admin Map Flow Redesign
- **Action:** Re-audited the admin map-input flow against the real treasure-hunt rules.
- **Finding:** The old admin tooling was too flat. It only supported one QR code and one riddle per zone, which could not represent multiple possible location combinations inside the same visual map zone.
- **Change:** Replaced the old editor path with a unified `MapSetWorkbench` used by both create and edit flows.
- **Change:** Zones now support:
- circle or oval geometry
- multiple location entries
- multiple route sets per zone
- **Change:** Each location entry now has:
- QR location code
- location description
- riddle text
- **Change:** Each route set can now include any combination of those location entries, which makes `{1,2,3}`, `{1,3,4}`, and `{3,4}` style variants possible inside the same zone.
- **Result:** The admin flow now matches the actual game logic instead of forcing the design into a one-zone/one-code model.

## Hunt Assignment & Scan Sync
- **Action:** Updated the assignment pipeline so the frontend and backend honor the new route-set structure.
- **Change:** The server now randomizes one route set per zone when generating a hunter session.
- **Change:** Hunter records now store both:
- `assigned_map` = real QR location codes for validation
- `assigned_clue_ids` = safe clue entry IDs for player-facing rendering
- **Change:** The scan page now reads the assigned clue IDs and only shows the active location descriptions and riddles for that user’s selected route set.
- **Change:** QR validation still checks the real location codes on the server, so gameplay flexibility increased without weakening validation.
- **Result:** Admin-authored map sets now drive the actual player hunt sheet correctly.

## Latest Build Check
- **Action:** Ran `npm run build` after the admin flow redesign and hunt assignment rewrite.
- **Result:** Build passes successfully.

## Current Blockers / Next Work
- **Refactor debt:** `src/components/OnboardingFlow.tsx` still needs to be split to satisfy the project’s 500-line file rule.
- **Visual signoff:** Lower-end real-device verification is still useful, especially for mobile feel and keyboard click responsiveness.
- **Next product area:** QR/check-in flow can now be iterated visually, then the admin verification section should be brought in line with the same narrative quality.
