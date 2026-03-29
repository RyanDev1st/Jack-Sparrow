# 🔍 Findings & Research: Treasure Hunt App
**Log all discoveries, API constraints, and research findings here.**

## General Discoveries
- **Design Inspiration & Components:** The primary sources for models, components, and UI/UX inspiration are 21st.dev, CodePen, ViewSource, and Spline.
- **AI Design Tools:** Google Stitch and Veo 3 will be used in conjunction. (Google Stitch API key is readily available).
- **Focus:** Complete focus on frontend UI/UX. Backend (Firebase/Supabase) is explicitly out of scope for the current design iteration.

## Current Frontend Architecture
- **Workspace confirmation:** The frontend that was actively designed and iterated in this workspace lives in `Design/`.
- **Separate app tree:** `main/` is also a React/Vite app, but it is a different tree with its own `package.json`. It should not be used to run the current designed frontend unless a separate integration task explicitly targets it.
- **App shape:** The app is now route-based, not a single hidden-stage page. Current onboarding routes are `/`, `/join`, and `/scan`, with `/admin` outside the onboarding flow.
- **Onboarding ownership:** `src/components/OnboardingFlow.tsx` still drives all onboarding stages, but it is currently oversized and acts as a high-risk integration file.
- **Scan page split:** The QR/check-in section has been extracted into `src/components/QRCheckinStage.tsx` and is lazy-loaded from the onboarding shell.
- **3D scenes:** Spline scenes are centralized through `src/lib/spline-scenes.ts` for scene URLs and preload warming.

## Run / Startup Findings
- **Working directory:** Run frontend commands from `c:\Users\admin\JS-Visual Audit\Design`.
- **Dev command:** `npm run dev`
- **Build command:** `npm run build`
- **Preview command:** `npm run preview`
- **Expected local URL:** Vite serves the frontend at `http://localhost:5173` by default.
- **Routes to verify:** `/`, `/join`, `/scan`, and `/admin`

## Spline Findings
- **Orb scene:** Home uses the orb Spline scene from `https://prod.spline.design/UlTAXQVdYQJtV66t/scene.splinecode`.
- **Join scene:** The keyboard join stage uses `https://prod.spline.design/3WH-0gGBL8jEqmW0/scene.splinecode`.
- **Eye bug root cause:** The orb eyes were disappearing because the app-side hide pass was hiding generic `Rectangle` objects that included the eye meshes. The fix was to stop name-based hiding and use specific object IDs.
- **Pointer handling:** Current implementation relies on native Spline canvas events with `setGlobalEvents(true)`. The old synthetic-window-pointer strategy documented earlier is no longer the source of truth.
- **Loader gating:** A pure `app.load()` completion signal was not enough for perceived readiness. The current approach uses a stronger `onPresented` handoff after load and fade, plus a delayed loader escalation.
- **Audio:** The Spline runtime bundle exposes Howler internally. Current sound fading uses `window.Howler` as a best-effort bridge. This is useful, but it is not a documented public Spline API and should be treated as fragile.

## Performance Findings
- **Largest cost:** The Spline runtime/physics bundles remain the heaviest part of the site by far.
- **Big win already made:** Eager loading of unrelated 3D content was removed. `SplineBot` is now lazy-loaded, and the scan stage is code-split.
- **Scene warming:** Orb and keyboard scenes are now preloaded with `fetch(..., { cache: "force-cache" })` to reduce cold-start stalls between onboarding pages.
- **Animation budgets:** Custom JS-driven onboarding motion is now frame-budgeted instead of running uncapped. Orbital ring motion, mobile fake-look motion, join zoom tween, and audio fade all skip frames intentionally to preserve responsiveness on weaker devices.
- **Background cost:** The old canvas-based ash renderer was removed. The current background uses CSS-driven blink stars, drift ashes, and aurora layers, which are materially cheaper than a full repainting canvas loop.
- **Remaining debt:** `OnboardingFlow.tsx` is still too large and tightly coupled. It should be modularized next, especially because the project rule says files should stay under 500 lines.

## UX Findings
- **Join copy:** The readable status language is back to `NOT JOINED -> JOINED`. Abstract phrasing like `Sigil Dormant` and mixed-language variants tested poorly.
- **Join interaction:** The keyboard itself is the interactable control. There is no web CTA button on the join page anymore.
- **Join camera entry:** The keyboard now enters from an exaggerated distant zoom and settles into the target framing with a smoother eased zoom arc. The current feel is intentionally “pop-in cinematic,” not an abrupt spawn.
- **Scan semantics:** QR is not a “main step” in the hunt story. It is a confirmation/check-in mechanic. The new scan UI reflects that by prioritizing zone confirmation, hunt sheet context, and final check-in.
- **Narrative framing:** The player experience should always read as `solve -> search -> confirm -> check-in`, not `scan-centric app flow`.

## Admin Map Composer Findings
- **Old problem:** The old admin map flow assumed one zone only had one `locationCode` and one `riddle`. That was too rigid for the actual treasure-hunt design because a single visual zone can contain multiple possible shelves/locations.
- **New mental model:** The cleaner structure is `Map -> Zone -> Location Entries -> Route Sets`.
- **Zone role:** A zone is now only the visual highlighted area on the map.
- **Location entry role:** A location entry now owns the actual QR location code, the physical description, and the riddle.
- **Route set role:** A route set is now an explicit combination of location entries inside one zone, such as `{1,2,3}` or `{1,3,4}`. This gives the admin control over valid combinations instead of hard-coding one path per zone.
- **Server assignment model:** The server now randomizes one route set per zone for each generated hunter session. The real assigned QR codes stay on the server for validation, while safe `assigned_clue_ids` are exposed to the frontend for rendering the correct clues without leaking the whole answer set.
- **Player-facing effect:** The scan page can now show only the active clue entries for that hunter’s current route selection, while still validating QR scans against the actual assigned location codes.
- **Why this is better:** This splits visual map editing from clue authoring and from randomized route logic. It is easier to manage, easier to reason about, and much closer to how the event actually works.

## Visual Direction Findings
- **Background direction:** The strongest version so far is darker and more abyssal, with the aurora acting as a restrained undercurrent instead of a dominant neon wash.
- **Star treatment:** The user preferred star-like blink motes to a pure ash drift field. The current background keeps both, with the star blinks doing most of the visual read.
- **Lighting balance:** Shrinking the aurora and lowering blob opacity improved scene depth around both Spline assets. Brighter background washes made the orb and keyboard feel flatter.

## Technical Constraints
- **Design Process:** The user will personally guide, request, and audit the design process.
- **Reporting:** Findings must be continuously documented in this file (`findings.md`) and final results reported on the web.
- **File Length (500 Lines):** A strict limit of 500 lines per code file is enforced. Files over this limit must be modularized into directories by component or functional group (e.g., `landingpage/hero.tsx`, `landingpage/footer.tsx`).
- **Reality check:** `src/components/OnboardingFlow.tsx` currently violates the 500-line rule and should be treated as active refactor debt for the next agent.

## Open Risks
- **Runtime ceiling:** Even after frontend tightening, the dominant cost is still the Spline runtime/scene complexity. Additional gains will come more from scene simplification than React-side tweaks.
- **Audio fade reliability:** If a future Spline/runtime upgrade stops exposing `window.Howler`, the current join SFX fade will silently stop working.
- **Refactor debt:** `src/components/OnboardingFlow.tsx` is still the highest-risk integration file and should be split before more feature work lands there.

