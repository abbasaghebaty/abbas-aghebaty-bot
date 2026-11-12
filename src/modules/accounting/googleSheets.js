import { ACCOUNTING_CONFIG } from "../../config/accounting.js";

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessTokenExpiresAt > now + 60) {
    return cachedAccessToken;
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Secret با نام GOOGLE_SERVICE_ACCOUNT_JSON در Cloudflare تنظیم نشده است.");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("محتوای Secret حساب Google معتبر نیست؛ باید کل JSON سرویس‌اکانت باشد.");
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("فایل JSON فاقد client_email یا private_key است.");
  }

  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = header + "." + claims;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const assertion = unsignedToken + "." + base64UrlEncode(new Uint8Array(signature));
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("Google OAuth error:", tokenData.error ?? tokenResponse.status);
    throw new Error("احراز هویت Google ناموفق بود؛ تنظیمات Service Account و Secret را بررسی کن.");
  }

  cachedAccessToken = tokenData.access_token;
  cachedAccessTokenExpiresAt = now + Number(tokenData.expires_in || 3600);
  return cachedAccessToken;
}

export async function readAccountingSheet(env, sheetKey) {
  const sheet = ACCOUNTING_CONFIG.sheets[sheetKey];
  if (!sheet) throw new Error("درخواست برگه نامعتبر است.");

  const accessToken = await getAccessToken(env);
  const range = "'" + sheet.title.replace(/'/g, "''") + "'!" + sheet.range;
  const url = "https://sheets.googleapis.com/v4/spreadsheets/" +
    ACCOUNTING_CONFIG.spreadsheetId +
    "/values/" + encodeURIComponent(range) +
    "?valueRenderOption=FORMATTED_VALUE";

  const response = await fetch(url, {
    headers: { authorization: "Bearer " + accessToken },
  });
  const data = await response.json();

  if (!response.ok) {
    console.error("Google Sheets API error:", data.error?.message ?? response.status);
    throw new Error("خواندن اطلاعات از Google Sheets ناموفق بود؛ دسترسی فایل و فعال‌بودن API را بررسی کن.");
  }

  return { title: sheet.label, values: data.values ?? [] };
}
