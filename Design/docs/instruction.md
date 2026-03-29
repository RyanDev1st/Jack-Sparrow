# Treasure Hunt Web App: Design Instructions

**Welcome to the Design Workspace.** This project is exclusively for designing the user interface and visual identity of the Treasure Hunt Web App. Do not implement core backend features here; focus on aesthetics, CSS, animations, and the UI layer.

## 1. Core Aesthetic: Deep Space Glassmorphism
The visual identity of this app relies on extreme depth, glassmorphism, and a luminous deep-space dark theme, accented with glowing "electric orange."

*   **No Flat Colors:** Every surface should have depth. Use radial gradients, drop shadows, and inset highlights.
*   **Layered Space:** Backgrounds utilize the nebula gradients and animated `StarParticles` / `SpaceBackground` defined in the project.
*   **Electric Orange Glow:** Primary actions and highlights should use `--orange-glow` and `text-glow-orange` to stand out.

## 2. Typography
*   **Display Font:** `Space Grotesk`. Use this strictly for large headings and numbers.
*   **Body Font:** `Inter`. Use this for all readable body text, buttons, and small UI labels.
*   *Rule:* Always add a subtle text-shadow (e.g., `text-glow-white`) to primary white text to make it blend into the space aesthetic.

## 3. Glassmorphism System
Use the global `.glass-panel` class from `index.css` instead of raw Tailwind classes.
*   **Depth:** The `.glass-panel` class already includes top-light highlights, bottom shadows, and inner gradients to simulate physical 3D glass.
*   **Hover States:** The class handles hover lifts and border glows automatically.
*   **Noise Overlay:** A `.noise-overlay` class sits on top of the app content (`App.tsx`) to give an organic texture.

## 4. Core Architecture & Components

### The Onboarding Flow (Home)
The onboarding flow is route-based and currently uses the same `<OnboardingFlow />` shell across three routes:
1.  **Orbital Stage:** Animated ring with interactive nodes for each step of the hunt.
2.  **Join Stage (`/join`):** Spline keyboard scene. The crest key is the actual interaction; there is no separate web CTA button.
3.  **Check-in Stage (`/scan`):** Zone confirmation / hunt-sheet UI. Treat QR as confirmation, not as the star of the narrative.

### Spline 3D Models
*   **Architecture:** We use `<SplineOrb />` as the full-viewport Spline wrapper.
*   **Canvas Behavior:** The Spline canvas keeps native pointer handling. Do not assume synthetic global pointer forwarding is still the correct solution.
*   **Scene Warmup:** Scene URLs are centralized in `src/lib/spline-scenes.ts`, and warm preloading is used so the orb and keyboard are less likely to cold-load during route switches.
*   **Presentation Handoff:** Join-screen loading should rely on a stronger “presented” handoff, not just raw `app.load()` completion, because load completion alone was too inconsistent perceptually.

### Liquid Glass Buttons
*   **Usage:** Use `<MetalButton variant="gold">` or a custom-styled `GlassBtn` that relies on `mix-blend-mode` and CSS shadows. Ensure buttons always have depth; avoid stark flat rectangles on dark backgrounds.

### Admin Dashboard
*   **PIN Gate:** Access is protected by a sleek 4-digit glassmorphism PIN entry (`PinGate`).
*   **Scrollable Sections:** The dashboard is divided into 7 distinct sections (`Mantra Check`, `Active Hunts`, etc.) wrapped in `GlassCard`s, navigable via a sticky right-side nav-dot menu.

## 5. Adding New Pages or Components
1.  Check `src/index.css` for existing CSS variables (`--bg-abyss`, `--orange-glow`, `--shadow-xl`, etc.) before creating custom colors.
2.  Use `lucide-react` for all UI icons.
3.  Ensure animations (e.g., breathing, floating, `framer-motion` layouts) are applied to interactive elements to make the UI feel "alive".
4.  Do not use generic utility classes if a rich CSS animation or gradient from `index.css` solves the problem better.
5.  Respect the project rule that files should stay under 500 lines. If a component grows beyond that, split it before extending it further.

## 6. Current Product Narrative
*   **Player Journey:** solve riddle -> narrow search ring -> confirm zone -> unlock final check-in.
*   **Join Copy:** Current join status language is `NOT JOINED -> JOINED`.
*   **Scan Semantics:** The scan page should feel like a professional event app surface, not a QR demo or developer dashboard.
