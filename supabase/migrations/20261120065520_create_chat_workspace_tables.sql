/*
# Create Chat Workspace Storage

1. New Tables
- `chat_threads`
  - `id`: unique conversation identifier.
  - `title`: short label shown in the history sidebar.
  - `tone`: response style selected for the conversation.
  - `preview`: latest message preview for quick retrieval.
  - `created_at`: time the conversation started.
  - `updated_at`: time the conversation most recently changed.
- `chat_messages`
  - `id`: unique message identifier.
  - `thread_id`: conversation this message belongs to.
  - `role`: whether the message came from the user or assistant.
  - `content`: message text.
  - `created_at`: time the message was created.

2. Modified Tables
- None.

3. Security
- Row level security is enabled on both tables.
- This assessment workspace does not include sign-in, so anonymous and authenticated sessions can access the intentionally shared demo workspace.
- Separate SELECT, INSERT, UPDATE, and DELETE policies are created for each table.
- Grants are limited to the CRUD operations used by the chat workspace.

4. Important Notes
- Messages reference their parent thread and are removed automatically when a thread is removed.
- Indexes support fast history sorting and message loading.
- The tone constraint keeps saved conversation preferences within the supported response styles.
*/

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New conversation',
  tone text NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'concise')),
  preview text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_threads_updated_at_idx ON public.chat_threads (updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_thread_id_created_at_idx ON public.chat_messages (thread_id, created_at ASC);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read chat threads" ON public.chat_threads;
CREATE POLICY "Public can read chat threads" ON public.chat_threads FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can create chat threads" ON public.chat_threads;
CREATE POLICY "Public can create chat threads" ON public.chat_threads FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update chat threads" ON public.chat_threads;
CREATE POLICY "Public can update chat threads" ON public.chat_threads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete chat threads" ON public.chat_threads;
CREATE POLICY "Public can delete chat threads" ON public.chat_threads FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read chat messages" ON public.chat_messages;
CREATE POLICY "Public can read chat messages" ON public.chat_messages FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can create chat messages" ON public.chat_messages;
CREATE POLICY "Public can create chat messages" ON public.chat_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update chat messages" ON public.chat_messages;
CREATE POLICY "Public can update chat messages" ON public.chat_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete chat messages" ON public.chat_messages;
CREATE POLICY "Public can delete chat messages" ON public.chat_messages FOR DELETE TO anon, authenticated USING (true);
