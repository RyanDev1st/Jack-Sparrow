# Project: Treasure Hunt Web App - Master Blueprint

## 1. Project Identity & Styling Constraints
- **Aesthetic:** Sea + Space (Minimalistic & High-Contrast).
- **Color Palette:** Absolute dark blue of deep space (Backgrounds), vibrant orange (Primary Actions/Breath effects), and translucent liquid glass/glassmorphism (UI Containers/Cards).
- **Strict Visual Bans:** NO teal, NO cyan, NO vampire tropes, NO red.
- **Animation Rules:** Do NOT saturate the page with pointless animations. Motion is strictly reserved for focus areas. Use subtle moving ash/stars in the deep background, and an 'orange breath' pulse exclusively on the main Call-to-Action buttons.
- **Design Philosophy:** Minimalistic. Highlight only the designs and elements that matter. Use visual weight to command attention where needed. 
- **Role:** You are an elite software engineer writing modular, scalable, highly readable code.

## 1.1 Project Identity & Styling Constraints (Addendum)
- **Animation Rules (The 'Alive' Interface):** - Every interactive element (buttons, cards, inputs) MUST have a subtle micro-interaction to feel tactile and alive (e.g., a slight `scale: 0.98` tap state, or a fluid hover lift).
  - STRICTLY AVOID distracting macro-effects (no heavy particle systems, screen shakes, or chaotic visual noise). Backgrounds can have slow, ambient movement (like distant stars/ashes).
  - **The Physics Constraint:** Use spring physics (via Framer Motion) for all interactions to simulate fluid, liquid-like reactivity. Do not use rigid, linear CSS transitions for interactive elements.
  - **The Performance Constraint:** To ensure 60FPS on budget mobile devices, you are ONLY allowed to animate `transform` (scale, x/y movement) and `opacity`. Never animate layout properties like width, height, or margins. 

## 2. Modularity & File Constraints (The 200-Line Trigger)
- **Modular Expansion:** You are encouraged to keep files concise. Once a file reaches ~200 lines, you MUST evaluate if logic can be extracted. 
- **The Split Protocol:** If a component or logic block is approaching the 200-line mark, proactively create a new modular file (e.g., move a large `useEffect` into a custom hook in `/hooks` or complex math into `/lib`).
- **The Flexibility Rule:** You may exceed 200 lines to maintain code integrity and readability. Do not sacrifice a complete feature just to hit a number.
- **The Absolute Ceiling:** Avoid exceeding 1000 lines at all costs. Any file reaching this size is an architectural failure and must be refactored immediately.
- **Naming Convention:** New files must be named modularly and placed in the correct hierarchy (e.g., `useMantraValidation.ts` instead of putting logic in `api.ts`).

The following hierarchy is purely suggestion. The decision lies within your own judgement. 
\`\`\`text
src/
├── app/                 # Routing only. Pages should be lean wrappers.
│   ├── page.tsx         # Landing page (Generate Mantra)
│   └── admin/           # Booth validation page
├── components/          # Visual building blocks
│   ├── ui/              # Dumb, reusable elements (Buttons, Inputs, Modals)
│   ├── scanner/         # Feature-specific: The in-app QR scanner logic
│   └── theme/           # Aqua theme wrappers, backgrounds
├── hooks/               # State and side-effects extracted from components
│   ├── useScanner.ts    # Manages camera state and QR payload extraction
│   └── useGameState.ts  # Manages the array of scanned nodes
├── lib/                 # The Engine Room (No React components here)
│   ├── db.ts            # Database initialization (Supabase/Firebase)
│   ├── validation.ts    # Logic to compare arrays (assigned vs. scanned)
│   └── utils.ts         # Formatting, string generators (Mantra creation)
└── types/               # TypeScript interfaces (Hunters, Nodes, Status)
---.env.local #our secrets
\`\`\`

## 4. The Development Workflow (How you must operate)
Whenever a new feature is requested, you must follow this 3-step protocol:

**Step 1: The Blueprint Phase**
- Do NOT write code yet. 
- Output a brief plan detailing which files will be created or modified, what functions will be written, and how they fit into the folder hierarchy. 

**Step 2: The Approval Phase**
- Wait for my approval on your blueprint. If I request changes, revise the plan.

**Step 3: The Execution Phase**
- Write the code. Keep it modular. 
- After outputting a block of code, provide a brief, concise description of its usage and syntax. 
- If algorithms are used, state the Big O Time Complexity `O(n)` and briefly mention if a more efficient approach exists.

## 5. Security & Exploits
- **Scanner Rule:** The QR scanner must ONLY process raw text strings. It must not execute URLs or redirect the browser. 
- **Validation Rule:** All status changes (`HUNTING` -> `FINISHED` -> `CLAIMED`) must be verified on the backend. The frontend cannot be trusted to declare a winner.


## 6. Update:
- Always update the hierarchy of our codebase. Have a brief description of what each file is for so next agents can read and understand the context. Sole objective is transferability. 