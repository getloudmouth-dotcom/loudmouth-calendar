import 'dotenv/config';
import { Sentry } from './api/_sentry.js';
import express from 'express';

const app = express();
app.use(express.json({ limit: '4mb' }));

function mount(method, route, file) {
  app[method](route, async (req, res) => {
    try {
      const { default: handler } = await import(file);
      return handler(req, res);
    } catch (e) {
      console.error(e);
      Sentry.captureException(e);
      res.status(500).json({ error: e.message || `${route} load failed` });
    }
  });
}

// Single-method routes
mount('get',  '/api/drive-thumb',                  './api/drive-thumb.js');
mount('post', '/api/export-pdf',                   './api/export-pdf.js');
mount('get',  '/api/export-data',                  './api/export-data.js');
mount('get',  '/api/export-content-plan-data',     './api/export-content-plan-data.js');
mount('post', '/api/export-content-plan-pdf',      './api/export-content-plan-pdf.js');
mount('post', '/api/export-content-plan-docx',     './api/export-content-plan-docx.js');
mount('post', '/api/invite-user',                  './api/invite-user.js');
mount('post', '/api/share-calendar',               './api/share-calendar.js');
mount('post', '/api/share-content-plan',           './api/share-content-plan.js');
mount('get',  '/api/get-content-plan-public',      './api/get-content-plan-public.js');
mount('post', '/api/update-content-plan-item',     './api/update-content-plan-item.js');
mount('post', '/api/delete-assets',                './api/delete-assets.js');
mount('post', '/api/delete-user',                  './api/delete-user.js');
mount('get',  '/api/pinterest-boards',             './api/pinterest-boards.js');
mount('get',  '/api/pinterest-board-url',          './api/pinterest-board-url.js');
mount('get',  '/api/billing/invoice-export-data',  './api/billing/invoice-export-data.js');

// HEAD warmup pings from CalendarBuilder/App (fetch with method:"HEAD" to spin up the function)
app.head('/api/export-pdf', (req, res) => res.status(200).end());

// Vercel dynamic route [id] — Express needs :id and a param->query bridge.
// Express 5 makes req.query a getter, so we redefine the property instead of assigning.
app.all('/api/billing/invoices/:id', async (req, res) => {
  try {
    const { default: handler } = await import('./api/billing/invoices/[id].js');
    Object.defineProperty(req, 'query', {
      value: { ...req.query, id: req.params.id },
      configurable: true,
    });
    return handler(req, res);
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message || '/api/billing/invoices/:id load failed' });
  }
});

// All-method routes — handlers gate on req.method. Covers billing (mixed methods),
// cron paths (Vercel sends GET), tracking pixels, and external webhooks.
const allMethodRoutes = [
  '/api/billing/clients',
  '/api/billing/invoices',
  '/api/billing/sync-clients',
  '/api/billing/sync-invoices',
  '/api/billing/reconcile-clients',
  '/api/billing/process-recurring',
  '/api/billing/send-invoice',
  '/api/billing/sms-optin',
  '/api/billing/sms-optin-confirm',
  '/api/billing/freshbooks-callback',
  '/api/billing/freshbooks-auth',
  '/api/billing/track-open',
  '/api/billing/webhooks/freshbooks',
  '/api/send-reminders',
  '/api/cloudinary-audit',
  '/api/twilio/voice',
  '/api/twilio/sms',
];
for (const route of allMethodRoutes) {
  mount('all', route, route.replace('/api/', './api/') + '.js');
}

app.listen(3001, () => console.log('API server running on port 3001'));
