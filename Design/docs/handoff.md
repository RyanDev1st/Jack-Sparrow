# Handoff: Current Frontend State

## What Is Live Right Now
- Onboarding is route-based:
- `/` = orbital hero
- `/join` = keyboard join scene
- `/scan` = QR/check-in section
- The join interaction is the Spline keyboard itself, not a web button.
- Current join status copy is `NOT JOINED -> JOINED`.
- The scan page is now a zone confirmation / check-in UI, not the old placeholder dashboard.
- Admin map authoring now uses a richer route-composer model:
- one visual zone
- many location entries inside that zone
- many route sets per zone

## Where To Run It
- Use the `Design/` folder for this frontend.
- Run commands from: `c:\Users\admin\JS-Visual Audit\Design`
- Start dev server with: `npm run dev`
- Build with: `npm run build`
- Preview production build with: `npm run preview`
- Default local URL: `http://localhost:5173`
- `main/` is a separate app tree with its own dependencies and scripts. Do not assume it is the same frontend.

## Key Files
- `src/App.tsx`
- `src/components/OnboardingFlow.tsx`
- `src/components/SplineOrb.tsx`
- `src/components/QRCheckinStage.tsx`
- `src/components/SpaceBackground.tsx`
- `src/lib/spline-scenes.ts`
- `src/components/admin/MapSetWorkbench.tsx`
- `src/components/admin/MapSetManager.tsx`
- `src/components/admin/MapSetEditorModal.tsx`
- `src/lib/mapSetApi.ts`
- `src/pages/Hunt.tsx`

## Important Technical Truths
- Spline scene URLs are centralized in `src/lib/spline-scenes.ts`.
- Both the orb and keyboard scenes are warmed ahead of time to reduce cold-load delay.
- `SplineOrb.tsx` now supports `onPresented`, which is more reliable for join-screen handoff than load completion alone.
- The join loader only escalates after a short delay. Before that, a dark veil covers the screen so the route does not feel blank.
- Keyboard SFX fade currently uses `window.Howler` from the Spline runtime bundle. This is useful but fragile.
- Custom JS motion in onboarding is now frame-budgeted. The app intentionally skips frames in bespoke loops instead of trying to animate every display refresh.
- The shared background is no longer canvas-driven. It now uses CSS aurora layers, blink stars, and ash motes for lower overhead.
- The map-set model is no longer one-code-per-zone. Zones now hold multiple location entries plus multiple route-set combinations.
- Hunter generation now randomizes one route set per zone and stores:
- `assigned_map` for actual QR validation
- `assigned_clue_ids` for safe clue rendering on the player UI
- The scan page now renders clue descriptions and riddles from `assigned_clue_ids`, not from legacy `zone.locationCode` / `zone.riddle`.

## Open Issues / Risks
- `src/components/OnboardingFlow.tsx` is still too large and should be split.
- The biggest remaining performance cost is still the Spline runtime and scene complexity.
- `window.Howler` fade control remains a best-effort bridge, not a guaranteed public API.
- Real low-end mobile hardware verification is still recommended even though Chrome automation now passes.

## Recommended Next Moves
1. Split `OnboardingFlow.tsx` into stage-specific modules without changing behavior.
2. Audit and polish the admin verification surface now that the map authoring flow is structurally correct.
3. Decide whether the player map should visually mute non-assigned zones more aggressively when a route set is active.
4. If performance is still a problem on real devices, reduce Spline scene complexity before adding more frontend motion.
5. Use `docs/runbook.md` as the first-stop startup guide for any new agent joining the project.
