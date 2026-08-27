CREATE POLICY "Users can create their own pending subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');