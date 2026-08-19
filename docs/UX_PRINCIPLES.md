# FieldDoc UX Principles

FieldDoc is professional field software. It should feel fast, calm, legible outdoors, and trustworthy under pressure.

## Core Rules

1. Start with the job. Every photo, file, note, and report must have an obvious job context.
2. Keep capture one-handed. The primary action should be visible, stage-aware, and large enough for field use.
3. Say what happened. Successful saves, blocked actions, and sync outcomes need plain-language confirmation.
4. Never hide risk. Unsupported documents, sync conflicts, missing captions, and cloud gating must be visible before customer delivery.
5. Preserve originals. Original media and supporting files are immutable evidence; replacements create history instead of overwriting proof.
6. Work offline first. The mobile app must stay useful in airplane mode and explain when cloud actions are locked.
7. Make readiness explicit. Reports should show the next practical step, not a generic dashboard state.
8. Use restrained visual hierarchy. High contrast, large touch targets, quiet cards, and strong labels beat decorative UI.

## Tone

Use direct operational copy:

- "Job" instead of "project" in mobile workflow copy.
- "Proof Packet" for customer-facing report artifacts.
- "Back Up Now" for the complete cloud upload flow.
- "Saved on device" for local-first persistence.
- "Review preserved changes" for conflicts that were intentionally not overwritten.

## Accessibility Baseline

- Support dynamic text sizing without overlapping controls.
- Keep practical touch targets at least 44 pt high.
- Use visible state banners for success, warning, blocked, and error states.
- Avoid relying on color alone; every state needs text.
- Keep destructive actions explicit and reversible where the model allows it.
