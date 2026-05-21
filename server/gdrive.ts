const TARGET_FOLDER_ID = "1WJQnvX9Vx9s5dYPnMJefyibN3nTKfVZf";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Google OAuth token refresh failed:", text);
    return null;
  }

  const data = await resp.json() as { access_token?: string; error?: string };
  if (!data.access_token) {
    console.error("Google OAuth: no access_token in response", data);
    return null;
  }
  return data.access_token;
}

export async function uploadCasToDrive(
  fileBuffer: Buffer,
  originalFilename: string,
  investorName?: string,
  pan?: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn("Google Drive upload skipped: credentials not configured (set GOOGLE_DRIVE_REFRESH_TOKEN)");
      return null;
    }

    const safeName = investorName && pan
      ? `${investorName}(${pan.toUpperCase()}).pdf`
      : originalFilename;

    const boundary = `cas_upload_boundary_${Date.now()}`;
    const head = Buffer.from(
      [
        `--${boundary}`,
        `Content-Type: application/json; charset=UTF-8`,
        "",
        JSON.stringify({ name: safeName, parents: [TARGET_FOLDER_ID] }),
        `--${boundary}`,
        `Content-Type: application/pdf`,
        "",
      ].join("\r\n") + "\r\n",
      "utf-8"
    );
    const tail = Buffer.from(`\r\n--${boundary}--`, "utf-8");
    const body = Buffer.concat([head, fileBuffer, tail]);

    const uploadResp = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadResp.ok) {
      const text = await uploadResp.text();
      console.error("Google Drive upload HTTP error:", uploadResp.status, text);
      return null;
    }

    const data = await uploadResp.json() as { id?: string; webViewLink?: string; error?: any };
    if (data.error) {
      console.error("Google Drive API error:", data.error);
      return null;
    }

    return {
      fileId: data.id || "",
      webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
    };
  } catch (error: any) {
    console.error("Google Drive upload failed:", error?.message || error);
    return null;
  }
}
