-- Backfill QR tokens for existing gyms that don't have one
UPDATE public.gyms 
SET qr_token = gen_random_uuid()::text 
WHERE qr_token IS NULL;
