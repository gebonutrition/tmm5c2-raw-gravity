export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { email, landing, source, creative } = req.body || {};
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }

    const cleanEmail = email.trim();
    const cleanLanding = String(landing || "tmm5c2").trim();
    const sourceRaw = String(source || "meta").trim().toLowerCase();
    const cleanSource = ["tiktok", "meta", "google", "youtube", "dv360"].includes(sourceRaw)
      ? sourceRaw
      : "unknown";
    const cleanCreative = String(creative || "unknown").trim().slice(0, 500);
    const apiKey = process.env.KLAVIYO_API_KEY || process.env.KLAVIYO_PRIVATE_API_KEY;
    const listId = process.env.KLAVIYO_LIST_ID || "TyKHnV";

    if (!apiKey || !listId) {
      console.error("Missing Klaviyo environment variables");
      return res.status(500).json({ success: false, error: "Newsletter is not configured" });
    }

    const headers = {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Revision: "2026-07-15"
    };

    const profileResponse = await fetch("https://a.klaviyo.com/api/profile-import", {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email: cleanEmail,
            properties: { landing: cleanLanding, source: cleanSource, creative: cleanCreative }
          }
        }
      })
    });
    const profileText = await profileResponse.text();
    if (!profileResponse.ok) {
      console.error("Klaviyo profile error:", profileResponse.status, profileText);
      return res.status(502).json({ success: false, error: "Email profile could not be saved" });
    }

    const subscribeResponse = await fetch("https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs", {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            profiles: {
              data: [{
                type: "profile",
                attributes: {
                  email: cleanEmail,
                  subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } }
                }
              }]
            }
          },
          relationships: { list: { data: { type: "list", id: listId } } }
        }
      })
    });
    const subscribeText = await subscribeResponse.text();
    if (!subscribeResponse.ok) {
      console.error("Klaviyo subscription error:", subscribeResponse.status, subscribeText);
      return res.status(502).json({ success: false, error: "Email subscription could not be completed" });
    }

    // Vercel Function logs are not a persistent NDJSON lead store; log metadata only here.
    const timestamp = new Date().toISOString();
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "unknown").split(",")[0].trim();
    const page = String(req.headers.referer || `${req.headers["x-forwarded-proto"] || "https"}://${host}/`).slice(0, 1000);
    console.info("[NEW LEAD]", JSON.stringify({ ts: timestamp, landing: cleanLanding, source: cleanSource, creative: cleanCreative, page }));

    // Telegram delivery is best-effort: a notification outage must not undo a valid Klaviyo signup.
    const telegramToken = process.env.TG_BOT_TOKEN;
    const telegramChatId = process.env.TG_CHAT_ID || "1540072090";
    if (telegramToken && telegramChatId) {
      try {
        const siteLabel = host || cleanLanding;
        const message = `[NEW LEAD] Новый лид (${siteLabel})\nEmail: ${cleanEmail}\nКрео: ${cleanCreative}\nСтраница: ${page}`;
        const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: telegramChatId, text: message }),
          signal: AbortSignal.timeout(8000)
        });
        if (!telegramResponse.ok) {
          console.error("Telegram lead notification failed:", telegramResponse.status, (await telegramResponse.text()).slice(0, 500));
        }
      } catch (telegramError) {
        console.error("Telegram lead notification error:", telegramError instanceof Error ? telegramError.message : "Unknown error");
      }
    } else {
      console.warn("Telegram lead notification skipped: TG_BOT_TOKEN is not configured");
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("TMM5C2 newsletter API error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
