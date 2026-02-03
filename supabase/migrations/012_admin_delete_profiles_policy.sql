-- =============================================
-- MIGRATION 012: Admin Can Delete Profiles Policy
-- =============================================
-- Allows admins to delete any user profile

-- Add policy for admins to delete any profile
CREATE POLICY "Admins can delete any profile"
ON profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
