-- Drop content_creators (replaced by profiles table)
DROP TABLE IF EXISTS public.content_creators;

-- Drop user_tool_access (RBAC handled entirely by role_tool_defaults, never populated)
DROP TABLE IF EXISTS public.user_tool_access;

-- Drop portfolio tables (no portfolio feature built, 0 real rows)
DROP TABLE IF EXISTS public.portfolio_items;
DROP TABLE IF EXISTS public.portfolio_categories;

-- Drop service_catalog (never populated; FK from invoice_line_items is nullable, drop constraint first)
ALTER TABLE public.invoice_line_items DROP CONSTRAINT IF EXISTS invoice_line_items_service_catalog_id_fkey;
DROP TABLE IF EXISTS public.service_catalog;
