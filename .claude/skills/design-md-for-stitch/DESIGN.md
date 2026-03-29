# Design System: Project Jack Sparrow — Avant-Garde Tech
**Project ID:** 5857424907035517119

## 1. Visual Theme & Atmosphere

The interface embodies a **high-octane tactical tool wrapped in a surrealist art exhibition**. It merges the brutalist, rule-breaking layouts of avant-garde design (Gufram) with the hyper-polished, glowing utility of modern productivity tech (Huly) and the frictionless flow of elite fintech (Jeton).

The overall mood is **kinetic, deep, and highly responsive**. The UI must not feel like a flat web page — it is a layered, digital environment. Elements float in a deep space void, anchored only by glowing neon accents and heavy glassmorphic frosted panels. The atmosphere is tense but exciting, engineered for users who are physically moving and hunting in the real world.

**Key Characteristics:**
- Extreme Z-axis depth using heavy backdrop blurs and overlapping containers
- Asymmetrical, broken-grid layouts that defy standard mobile stacking
- High-contrast "shock" colors exclusively used for kinetic interactions
- Massive, structural typography that bleeds off the edges of the screen
- Tactile, physics-based micro-interactions for every user touchpoint

## 2. Color Palette & Roles

### Primary Foundation (The Void)
- **Abyssal Void Blue** (#07090F) — The absolute base background. Not pure black, but the deepest, most suffocating shade of blue. Every other element floats above it.
- **Liquid Aurora Gradient** (from #1A1B41 deep indigo to #291528 muted plum) — Atmospheric background lighting. Subtle, slow-moving radial gradients that bleed into the Abyssal Void, giving the screen a living, breathing quality.

### Accent & Interactive (The Flare)
- **High-Voltage Orange** (#FF5500) — The sole vibrant accent. Used strictly for primary actions (Begin Hunt, Scan QR), active states, and success pulses. It must visually "burn" against the dark background.
- **Electric Cyan** (#00E5FF) — Secondary accent used only for subtle system feedback (e.g., scanner actively scanning, minor data updates). Never used for primary CTAs.

### Typography & Structure
- **Starlight White** (#F8F9FA) — Primary text for major headlines and active data. Maximum contrast, absolute legibility.
- **Muted Slate** (#8B949E) — Secondary text for riddles, supporting data, and inactive states. Recessive without being invisible.

### Materials
- **Glass Border Edge** (rgba(255, 255, 255, 0.08)) — A razor-thin structural line used to catch "light" on the top and left edges of glass panels, creating a 3D bevel illusion.
- **Liquid Glass Panel** (rgba(15, 18, 25, 0.4) + backdrop-filter: blur(24px)) — The core container material. It is never opaque. All cards and containers use this specification.

## 3. Typography Rules

**Primary Display Font:** Clash Display _(fallback: Space Grotesk)_  
**Secondary Utility Font:** Inter _(fallback: Manrope)_  
**Character:** Clash Display brings structural authority and editorial tension. Inter brings precise, unambiguous legibility for data and utility text.

### Hierarchy & Weights
- **Display Headlines (H1):** Bold weight (700), ultra-tight letter-spacing (-0.04em), massive scale (3.5rem–5rem). Used for screen titles like "THE THRESHOLD" or "MANTRA". Must be large enough to physically overflow and overlap card containers.
- **Section Headers (H2):** Semi-bold weight (600), standard letter-spacing, 2rem–2.5rem size. Anchors distinct content zones.
- **The Cipher Text (Riddle Body):** Regular weight (400), geometric sans-serif, high line-height (1.6), 1.25rem size. Designed to be readable from arm's length while the user is physically in motion.
- **Utility Data:** Medium weight (500), mono-spaced or highly geometric, 0.875rem. Used for coordinates, session IDs, timestamps, and status markers. Precision over personality.

## 4. Component Stylings

### Buttons & Triggers
- **Shape:** Brutalist edges with slight rounding (4px/0.25rem radius). Not pill-shaped, not perfectly square.
- **Primary Action:** High-Voltage Orange (#FF5500) background, pure Starlight White text.
- **Padding:** Massive touch targets — 1.25rem vertical, 2.5rem horizontal — to account for users in motion.
- **Kinetic State:** On press/active, scale to 0.95 and intensify the outer glow (`box-shadow: 0 0 20px rgba(255, 85, 0, 0.4)`).

### Liquid Glass Cards
- **Corner Style:** Medium rounding (16px/1rem radius) — softened enough to feel digital, not clinical.
- **Material Execution:** Must combine `rgba(15, 18, 25, 0.4)` background with `backdrop-filter: blur(24px)`. Never use an opaque fill.
- **Border Treatment:** 1px top and left border using Glass Border Edge (`rgba(255, 255, 255, 0.08)`) to simulate 3D beveling.
- **Shadow:** Deep, diffused drop shadow (`0 20px 40px rgba(0,0,0,0.5)`) to elevate the card off the Aurora background.
- **Internal Padding:** 1.5rem–2rem to allow data to breathe within the glass environment.

### Inputs (The Threshold)
- **Style:** Understated and deeply embedded. Never use solid white or light backgrounds.
- **Background:** `rgba(0, 0, 0, 0.3)` inset inside a Liquid Glass Card.
- **Focus State:** Bottom border illuminates in High-Voltage Orange (#FF5500). The surrounding area dims slightly to focus attention.

## 5. Layout & Spatial Principles

### Whitespace & The Grid
- **Base Unit:** 8px for micro-spacing, 16px (1rem) for component padding.
- **Macro Spacing:** Use extreme margins (4rem–6rem) between distinct narrative/story sections to create dramatic pacing.
- **Asymmetry:** Do not stack elements in perfect vertical lines. Offset the X-axis. If a header is left-aligned, the corresponding Liquid Glass card should stretch toward the right margin.

### Z-Axis Stacking (Critical)
- Use negative margins (e.g., `margin-top: -2rem`) to force H1 typography to physically overlap Liquid Glass cards, breaking the bounding box and collapsing layers.
- Text must exist on a different Z-plane from the card it relates to — this creates the sensation of depth.

### Interaction & Feedback
- **Tactile Response:** Every touchable element must have a distinct state change. Nothing is static or emotionless.
- **Entrance Animations:** Elements do not simply appear — they fade and slide up along the Y-axis (`translateY(20px)` → `0`) smoothly over 400ms on page/section entry.

## 6. Design System Notes for Stitch Generation

When generating or refactoring views for Project Jack Sparrow, follow these exact prompting laws:

### Atmosphere Language
- **Use:** "High-octane tactical environment", "liquid glass overlapping massive typography", "deep space void with neon flares", "kinetic and layered digital environment"
- **Never Use:** "Clean corporate layout", "standard material design", "basic mobile app", "flat card", "minimal white background"

### Color References
Always use the exact descriptive names with hex codes:
- Base: "Abyssal Void Blue (#07090F)"
- Primary CTA: "High-Voltage Orange (#FF5500)"
- Feedback: "Electric Cyan (#00E5FF)"
- Text: "Starlight White (#F8F9FA)" or "Muted Slate (#8B949E)"
- Container: "Liquid Glass Panel (rgba(15, 18, 25, 0.4) + blur(24px))"

### Component Prompts
- "Create a card using the Liquid Glass Panel spec — semi-transparent dark background with 24px backdrop blur and a razor-thin top/left border edge highlight"
- "Design a primary button in High-Voltage Orange with brutalist 4px corner rounding and a glowing drop shadow on press"
- "Place the H1 title so it overlaps the top edge of the glass card below it, breaking out of the card's bounding box"

### Execution Checks
Before finalizing any generated screen, verify:
- ❌ Are any cards fully opaque? → Fail. Add `backdrop-filter: blur(24px)` and lower the opacity.
- ❌ Is the layout perfectly symmetrical? → Fail. Introduce X-axis offsets and margin asymmetry.
- ❌ Are all headers neatly contained inside cards? → Fail. Pull the H1 out to overlap the background and the card simultaneously.
- ❌ Are there any solid grey or white containers? → Fail. Replace with the Liquid Glass Panel specification.