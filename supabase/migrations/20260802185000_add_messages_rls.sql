-- Allow users to send messages (they must be the sender)
CREATE POLICY "Users can insert their own messages" ON public.messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Allow users to read messages they sent or received
CREATE POLICY "Users can view their messages" ON public.messages
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to update messages (e.g. marking as read)
CREATE POLICY "Users can update their messages" ON public.messages
FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
