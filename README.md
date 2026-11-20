# Aria — AI Thinking Workspace

Deployment: https://quantiphi-vibe-codin-vqrd.bolt.host

Aria is a focused AI chat workspace built for the Quantiphi Vibe Coding Round brief.

## Included

- Scrollable assistant and user conversation view
- Character-by-character response streaming
- Searchable conversation history with durable Supabase persistence
- Professional, Casual, and Concise response tones
- Server-side chat function with OpenAI and Claude support
- Safe server fallback when no provider is available
- Prompt starters for shaping ideas, writing, and decisions
- Copy response feedback and keyboard shortcuts
- Responsive desktop and mobile layouts

## Backend flow

The browser sends each message and selected tone to the Supabase `chat` Edge Function. The function validates the request, applies the tone instruction, calls the configured AI provider when available, and returns a server-generated fallback when it is not. Conversation threads and messages are stored in Supabase with row-level security enabled.
