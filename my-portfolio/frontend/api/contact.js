// frontend/api/contact.js
// Vercel serverless function:  POST /api/contact
//
// Receives the contact form and emails it to you through Resend, with the
// visitor's address as reply-to so you can answer straight from your inbox.
// The Resend API key lives ONLY in Vercel Environment Variables.
//
// Required Vercel env vars:
//   RESEND_API_KEY           your Resend key
//   CONTACT_RECEIVER_EMAIL   where messages are delivered
// Optional:
//   RESEND_FROM_EMAIL        defaults to onboarding@resend.dev (Resend sandbox)

const RESEND_URL = "https://api.resend.com/emails";

// Best-effort per-IP limit (a speed bump on a warm instance, not a guarantee).
const hits = new Map();
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

function tooManyRequests(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body || "{}");
  } catch (e) {
    return {};
  }
}

function buildHtml(name, email, subject, message) {
  const when = new Date().toUTCString();
  return `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f1f5f9;">
  <div style="background:#0f172a;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
    <div style="font-size:20px;font-weight:700;">New Portfolio Message</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${esc(when)}</div>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;">
    <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;">From</p>
    <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0f172a;">${esc(name)}</p>
    <p style="margin:0 0 16px;font-size:14px;"><a href="mailto:${esc(email)}" style="color:#3b82f6;">${esc(email)}</a></p>
    <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;">Subject</p>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">${esc(subject)}</p>
    <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;">Message</p>
    <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:16px 20px;font-size:15px;line-height:1.7;color:#334155;">
      ${esc(message).replace(/\n/g, "<br>")}
    </div>
  </div>
</div>`;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_RECEIVER_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("contact: RESEND_API_KEY or CONTACT_RECEIVER_EMAIL is not set");
    return res.status(500).json({ error: "Email service is not configured." });
  }

  const body = parseBody(req);

  // Honeypot: hidden field that only bots fill in.
  if (body.website) {
    return res.status(200).json({ success: true });
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = (forwarded ? String(forwarded).split(",")[0] : req.socket && req.socket.remoteAddress) || "unknown";
  if (tooManyRequests(ip)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const name = String(body.name || "").trim().slice(0, 100);
  const email = String(body.email || "").trim().slice(0, 200);
  const subject = String(body.subject || "Portfolio Contact").trim().slice(0, 150) || "Portfolio Contact";
  const message = String(body.message || "").trim();

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email." });
  }
  if (message.length < 10 || message.length > 2000) {
    return res.status(400).json({ error: "Message must be 10 to 2000 characters." });
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Portfolio] ${subject} — from ${name}`,
        html: buildHtml(name, email, subject, message),
        text: `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("contact: Resend rejected the email:", response.status, detail);
      return res.status(502).json({ error: "Could not send your message. Please try again." });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("contact: unexpected error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
