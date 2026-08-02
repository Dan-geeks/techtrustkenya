CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_read BOOLEAN DEFAULT false
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
    CREATE POLICY "Users can view their own messages" ON public.messages
        FOR SELECT
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

    DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
    CREATE POLICY "Users can insert messages" ON public.messages
        FOR INSERT
        WITH CHECK (auth.uid() = sender_id);

    DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
    CREATE POLICY "Users can update their received messages" ON public.messages
        FOR UPDATE
        USING (auth.uid() = receiver_id)
        WITH CHECK (auth.uid() = receiver_id);
END $$;
