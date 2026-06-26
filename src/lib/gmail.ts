export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
}

// Recursively decode and extract plain text or HTML body from a Gmail message payload
function getMessageBody(payload: any): string {
  if (!payload) return "";
  
  // If we have plain text part, prefer it, otherwise HTML, or fallback
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    // Look for text/plain first
    const plainPart = payload.parts.find((part: any) => part.mimeType === "text/plain");
    if (plainPart && plainPart.body && plainPart.body.data) {
      return decodeBase64Url(plainPart.body.data);
    }

    // Look for text/html
    const htmlPart = payload.parts.find((part: any) => part.mimeType === "text/html");
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      // Return decoded HTML - we can render it or strip tags, or display as-is
      return decodeBase64Url(htmlPart.body.data);
    }

    // Recursive search in subparts
    for (const part of payload.parts) {
      const body = getMessageBody(part);
      if (body) return body;
    }
  }

  return "";
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    try {
      return atob(base64);
    } catch (err) {
      return "Unable to decode message content";
    }
  }
}

export async function fetchInbox(accessToken: string): Promise<GmailMessage[]> {
  try {
    // 1. Get the list of message summaries
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=category:primary",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!listRes.ok) {
      const errorData = await listRes.json();
      throw new Error(errorData.error?.message || "Failed to list Gmail inbox messages.");
    }

    const listData = await listRes.json();
    if (!listData.messages || listData.messages.length === 0) {
      return [];
    }

    // 2. Fetch full details for each message in parallel
    const detailPromises = listData.messages.map(async (msgSummary: { id: string }) => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!detailRes.ok) {
        return null;
      }

      const detailData = await detailRes.json();
      const headers = detailData.payload?.headers || [];

      const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
      const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "(Unknown Sender)";
      const to = headers.find((h: any) => h.name.toLowerCase() === "to")?.value || "";
      const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
      const snippet = detailData.snippet || "";
      const body = getMessageBody(detailData.payload);

      return {
        id: detailData.id,
        threadId: detailData.threadId,
        subject,
        from,
        to,
        date,
        snippet,
        body,
      };
    });

    const results = await Promise.all(detailPromises);
    return results.filter((r) => r !== null) as GmailMessage[];
  } catch (error) {
    console.error("Error fetching inbox details:", error);
    throw error;
  }
}

export async function sendGmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; threadId: string }> {
  try {
    // Format the email in MIME RFC 2822 format
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      "",
      body.replace(/\n/g, "<br/>"), // simple transformation of newlines to HTML
    ];
    
    const emailStr = emailLines.join("\r\n");

    // Base64Url encode
    const base64Safe = btoa(
      encodeURIComponent(emailStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: base64Safe,
      }),
    });

    if (!sendRes.ok) {
      const errorData = await sendRes.json();
      throw new Error(errorData.error?.message || "Failed to send email via Gmail.");
    }

    return await sendRes.json();
  } catch (error) {
    console.error("Error sending Gmail:", error);
    throw error;
  }
}
