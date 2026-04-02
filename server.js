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

app.listen(3001, () => console.log('API server running on port 3001'));
