# 🏛️ Project Constitution: Treasure Hunt App
> **LAW:** If logic changes, update the architecture SOPs before updating the code. Only update this file when a schema changes, a rule is added, or architecture is modified.

## Data Schemas
### Input Shape
```json
{
  "request_type": "ui_ux_design",
  "guidance": "user_directed",
  "resources": ["21stdev", "codepen", "viewsource", "spline", "veo3", "google_stitch"]
}
```

### Output (Delivery Payload) Shape
```json
{
  "frontend_code": "high_quality_implementation",
  "review_platform": "web_browser",
  "documentation_updates": ["../docs/findings.md"],
  "final_report": "results_summary"
}
```

## Behavioral Rules
- **Quality Over Conversation:** Focus on high-quality code. Minimize unnecessary explanations and conversation.
- **Reliability > Speed:** Prioritize reliability over speed.
- **No Guessing:** Never guess at business logic.
- **Deterministic Approach:** LLMs are probabilistic; business logic must be deterministic.
- **Fail Gracefully (Self-Annealing):** Analyze stack trace -> Patch script in `tools/` -> Test -> Update Architecture (`architecture/`).

## Architectural Invariants (The A.N.T. 3-Layer Architecture)
- **500-Line Limit (Strict Modularity):** All code files must remain under 500 lines to maintain readability, flexibility, and integratability. Files exceeding this limit must be split into logical subfiles within a dedicated directory (e.g., `landingpage/hero.tsx`, `landingpage/body.tsx`, `landingpage/footer.tsx`). This applies universally to both UI components and backend logic sets.
- **Layer 1: Architecture (`architecture/`)** -> Technical SOPs in Markdown defining goals, tool logic, and edge cases.
- **Layer 2: Navigation** -> Reasoning layer to route data between SOPs and Tools. No complex tasks performed by the agent itself; delegate to tools.
- **Layer 3: Tools (`tools/`)** -> Deterministic Python scripts. Atomic and testable. Secrets in `.env`. Intermediates in `.tmp/`.

## Maintenance Log
- **[System Initialization]:** B.L.A.S.T. protocol enacted. Discovery phase completed.
- **[Update]:** Added strict 500-line modular file constraint to Architectural Invariants.
- **[Update]:** Migrated memory files to `.claude/`, `.codex/`, `.gemini/`, and `docs/` to isolate identities per protocol and remove clutter from the root config area without breaking `npm run dev`.
