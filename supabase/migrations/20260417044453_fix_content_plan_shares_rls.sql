DROP POLICY IF EXISTS cps_owner ON content_plan_shares;

CREATE POLICY cps_owner ON content_plan_shares
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_plans
      WHERE content_plans.id = content_plan_shares.plan_id
        AND content_plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content_plans
      WHERE content_plans.id = content_plan_shares.plan_id
        AND content_plans.user_id = auth.uid()
    )
  );
