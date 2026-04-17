// Auto-replies to any inbound SMS — this number is outbound-only.
// Twilio calls this URL when someone texts the number.
export default function handler(req, res) {
  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>This is an outbound-only SMS line for Loudmouth. Please do not reply to this number. To stop receiving messages, reply STOP.</Message>
</Response>`);
}
