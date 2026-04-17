// Rejects all inbound voice calls — this number is SMS-only.
// Twilio calls this URL when someone dials the number.
export default function handler(req, res) {
  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This number cannot receive calls. Please hang up.</Say>
  <Hangup/>
</Response>`);
}
