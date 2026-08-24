# Slidely — Plan

## Positioning

> "Create a presentation in 5 minutes on your phone."

- Not a PowerPoint editor. A mobile-first presentation builder.
- Target: **all college students**, with templates per field (Law, Medical, Engineering, MBA, BCA/MCA) — not law students only.
- Core advantage without AI: **exceptional mobile UX + high-quality templates**.
- Stronger with AI: auto-generated slide structure from a topic/headings.

## MVP Scope

1. Choose subject
2. Choose template
3. Add headings
4. Auto-generate slide structure
5. Edit text
6. Export to PPTX/PDF

## Suggested Phases

### Phase 1 — Foundation
- [x] App shell (Expo Router screens: Home, Create, Editor, Export)
- [x] Subject selector (hardcoded list + field templates)
- [x] Template picker with preview

### Phase 2 — Core flow
- [x] Heading input → auto slide structure generator (local logic first)
- [x] Slide editor (text edit per slide, add/remove/reorder slides)

### Phase 3 — Export & polish
- [x] Export to PPTX (client-side generator)
- [x] Export to PDF
- [x] Mobile UX polish, offline-first

### Phase 4 — AI (post-MVP)
- [x] AI slide generation from topic
- [x] AI content suggestions / outline expansion

## Constraints / Notes

- Occasional-use product → monetize per export, credits, or premium templates (not subscription-first).
- Keep dependency set minimal; reuse `expo` primitives (expo-image, expo-haptics) already installed.
- Verify each phase with `npm run lint`.
- AI is pluggable: set `EXPO_PUBLIC_AI_BASE_URL`, `EXPO_PUBLIC_AI_API_KEY`, `EXPO_PUBLIC_AI_MODEL` to enable an OpenAI-compatible provider; otherwise the offline outline/content generators are used.

## Ratings Reference

- Market: ⭐⭐⭐⭐⭐
- Competition: ⭐⭐⭐
- Monetization: ⭐⭐⭐⭐
- MVP difficulty: ⭐⭐⭐
- Startup potential: ⭐⭐⭐⭐
