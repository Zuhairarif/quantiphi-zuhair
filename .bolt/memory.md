# Project memory

## Product intent & audience

- AI chat application built for the Quantiphi <> AMU 2027 Hiring Vibe Coding Round; evaluated against a rubric emphasizing full-feature completeness, production quality, and frontend/backend separation.
- End users interact with a conversational AI assistant with selectable response tones and persistent chat history.

## Brand personality & voice

- Production-grade, polished, professional — "beautiful, not cookie cutter."
- Tone is user-selectable in the chat (a product feature), distinct from the app's own UI voice.

## Visual design & UX direction

- Vite + React + Tailwind CSS; Lucide React icons only.
- `@/` path alias for all project imports (maps to `src/`).
- Live character-by-character streaming presentation for responses; preserved across refactor.
- Extra usability features layered on top of core chat: prompt starters, searchable threads, copy-to-clipboard feedback, keyboard shortcuts.
- Build must pass production build, lint, and type checks cleanly.

## Decisions, constraints & rationale

- All response generation, validation, and business logic moved server-side (Supabase edge function) per rubric; frontend handles presentation and interaction only.
- Server endpoint supports OpenAI and Claude providers when keys are available, with a durable server-side fallback so the app stays fully usable without provider keys.
- Tone is passed to the server as an instruction; tone-specific system prompts live server-side.
- CORS and input validation handled in the server function.
- Chat history persistence and streaming UX preserved from earlier iterations — final pass is additive, not a rewrite.
- Meaningful, incremental Git commits required by the assessment; timestamps verified post-deadline.

## Open questions & assumptions

- Rubric scoring weights are inferred from the assessment email; exact evaluation criteria not fully visible.
- AI provider keys may or may not be present at evaluation; fallback must remain functional.
- Supabase function deployment is assumed active and accessible for final verification.