import sharp from "sharp";

export default async function handler(req, res) {
  const { fileId } = req.query;
  const auth = req.headers.authorization;

  if (!fileId || !auth) {
    return res.status(400).json({ error: "Missing fileId or token" });
  }

  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: auth } }
    );

    if (!driveRes.ok) {
      return res.status(driveRes.status).json({ error: "Drive fetch failed" });
    }

    const buffer = Buffer.from(await driveRes.arrayBuffer());
    const thumb = await sharp(buffer)
      .resize(400, 400, { fit: "cover", position: "centre" })
      .jpeg({ quality: 78 })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.send(thumb);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}