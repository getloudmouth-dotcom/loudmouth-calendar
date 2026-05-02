CREATE TABLE IF NOT EXISTS public.clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated USING (true);
