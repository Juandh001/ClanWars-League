-- =============================================
-- MIGRATION 010: Admin Can Update Profiles Policy
-- =============================================
-- Allows admins to update any user profile (for adjusting warrior points)

-- Add policy for admins to update any profile
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
