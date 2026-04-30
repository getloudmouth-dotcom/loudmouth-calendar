import 'dotenv/config';
import express from 'express';
import sharp from 'sharp';

const app = express();
app.use(express.json({ limit: '4mb' }));

app.get('/api/drive-thumb', async (req, res) => {
  const { fileId } = req.query;
  const auth = req.headers.authorization;

  if (!fileId || !auth) {
    return res.status(400).json({ error: 'Missing fileId or token' });
  }

  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: auth } }
    );
    if (!driveRes.ok) return res.status(driveRes.status).json({ error: 'Drive fetch failed' });

    const buffer = Buffer.from(await driveRes.arrayBuffer());
    const thumb = await sharp(buffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 78 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(thumb);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.head('/api/export-pdf', (req, res) => res.status(200).end());
app.post('/api/export-pdf', async (req, res) => {
  try {
    const { default: handler } = await import('./api/export-pdf.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'export-pdf load failed' });
  }
});
app.get('/api/export-data', async (req, res) => {
  try {
    const { default: handler } = await import('./api/export-data.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'export-data load failed' });
  }
});

app.get('/api/export-content-plan-data', async (req, res) => {
  try {
    const { default: handler } = await import('./api/export-content-plan-data.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'export-content-plan-data load failed' });
  }
});

app.post('/api/export-content-plan-pdf', async (req, res) => {
  try {
    const { default: handler } = await import('./api/export-content-plan-pdf.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'export-content-plan-pdf load failed' });
  }
});

app.post('/api/export-content-plan-docx', async (req, res) => {
  try {
    const { default: handler } = await import('./api/export-content-plan-docx.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'export-content-plan-docx load failed' });
  }
});

app.post('/api/invite-user', async (req, res) => {
  try {
    const { default: handler } = await import('./api/invite-user.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'invite-user load failed' });
  }
});

app.post('/api/share-calendar', async (req, res) => {
  try {
    const { default: handler } = await import('./api/share-calendar.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'share-calendar load failed' });
  }
});

app.post('/api/share-content-plan', async (req, res) => {
  try {
    const { default: handler } = await import('./api/share-content-plan.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'share-content-plan load failed' });
  }
});

app.get('/api/get-content-plan-public', async (req, res) => {
  try {
    const { default: handler } = await import('./api/get-content-plan-public.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'get-content-plan-public load failed' });
  }
});

app.post('/api/update-content-plan-item', async (req, res) => {
  try {
    const { default: handler } = await import('./api/update-content-plan-item.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'update-content-plan-item load failed' });
  }
});

app.post('/api/send-reminders', async (req, res) => {
  try {
    const { default: handler } = await import('./api/send-reminders.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'send-reminders load failed' });
  }
});

app.post('/api/delete-assets', async (req, res) => {
  try {
    const { default: handler } = await import('./api/delete-assets.js');
    return handler(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'delete-assets load failed' });
  }
});

// ── Billing routes (all methods — mirrors Vercel's file-based routing) ───────
const billingRoutes = [
  '/api/billing/clients',
  '/api/billing/invoices',
  '/api/billing/sync-clients',
  '/api/billing/sync-invoices',
  '/api/billing/process-recurring',
  '/api/billing/send-invoice',
  '/api/billing/sms-optin',
  '/api/billing/sms-optin-confirm',
  '/api/billing/freshbooks-callback',
];
for (const route of billingRoutes) {
  const file = route.replace('/api/', './api/') + '.js';
  app.all(route, async (req, res) => {
    try {
      const { default: handler } = await import(file);
      return handler(req, res);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || `${route} load failed` });
    }
  });
}

app.listen(3001, () => console.log('API server running on port 3001'));
