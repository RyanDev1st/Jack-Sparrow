# Runbook: Design Frontend

## What This Is
- The active frontend that was designed and iterated in this workspace lives in `Design/`.
- It is a `React + TypeScript + Vite` app.
- The `main/` folder is a separate app tree. Do not use it to run this specific UI flow unless you are doing a separate integration task there.

## Where To Run Commands
- Open a terminal in:
- `c:\Users\admin\JS-Visual Audit\Design`

## Startup Commands
- Install dependencies if needed:
- `npm install`

- Start the local dev server:
- `npm run dev`

- Build the production bundle:
- `npm run build`

- Preview the production build locally:
- `npm run preview`

## Expected Local URL
- Vite default dev URL:
- `http://localhost:5173`

## Live Routes
- `/` = landing / hero / orbital intro
- `/join` = keyboard join scene
- `/scan` = QR confirmation / check-in flow
- `/admin` = admin page

## Key Entry Files
- App bootstrap: `src/main.tsx`
- Router shell: `src/App.tsx`
- Main onboarding flow: `src/components/OnboardingFlow.tsx`
- Shared Spline wrapper: `src/components/SplineOrb.tsx`
- Shared background system: `src/components/SpaceBackground.tsx`
- Scan page surface: `src/components/QRCheckinStage.tsx`

## Important Notes
- The Spline scenes are pre-warmed from `src/lib/spline-scenes.ts`.
- The shared background is global and sits behind all routes.
- The current app is route-based, not a single-page hidden-stage prototype anymore.
- `OnboardingFlow.tsx` is still oversized and should be refactored before major new feature work lands there.

## Quick Verification Checklist
- Run `npm run dev` inside `Design/`.
- Open `http://localhost:5173`.
- Confirm the orb hero loads on `/`.
- Click the `Start` node and verify navigation to `/join`.
- Press the keyboard crest key and verify navigation flow toward `/scan`.
- Run `npm run build` before handing changes off.
