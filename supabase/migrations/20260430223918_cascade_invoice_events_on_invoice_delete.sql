alter table public.invoice_events
  drop constraint invoice_events_invoice_id_fkey;

alter table public.invoice_events
  add constraint invoice_events_invoice_id_fkey
  foreign key (invoice_id) references public.invoices(id) on delete cascade;
