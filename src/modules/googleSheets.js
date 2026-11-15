
const SPREADSHEET_ID = "1_jUt1pw5bY0UuzZIVzNVY2PQ-CJP_liyK1eUQceyYkQ";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

let cachedToken = null;
let cachedTokenExpiresAt = 0;
let cachedTokenEmail = null;

function base64UrlEncode(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const normalized = pem
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .trim();

  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  if (!base64) {
    throw new Error("Google private key is empty.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function readServiceAccount(env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(
      "Secret با نام GOOGLE_SERVICE_ACCOUNT_JSON پیدا نشد یا خالی است."
    );
  }

  let parsed;

  try {
    const cleaned = raw.trim().replace(/^\uFEFF/, "");

    parsed = JSON.parse(cleaned);

    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed.trim());
    }
  } catch {
    throw new Error(
      "مقدار GOOGLE_SERVICE_ACCOUNT_JSON معتبر نیست. کل JSON اصلی Service Account را بدون کوتیشن اضافه وارد کن."
    );
  }

  const credentials =
    parsed?.credentials && typeof parsed.credentials === "object"
      ? parsed.credentials
      : parsed;

  if (
    !credentials ||
    typeof credentials !== "object" ||
    typeof credentials.client_email !== "string" ||
    typeof credentials.private_key !== "string" ||
    !credentials.client_email.trim() ||
    !credentials.private_key.trim()
  ) {
    const keys =
      credentials && typeof credentials === "object"
        ? Object.keys(credentials).join(", ")
        : typeof credentials;

    console.error(
      "Invalid Google credentials structure. Available keys:",
      keys
    );

    throw new Error(
      "فیلدهای client_email و private_key در JSON پیدا نشدند."
    );
  }

  return credentials;
}

async function getAccessToken(env) {
  const credentials = readServiceAccount(env);

  if (
    cachedToken &&
    cachedTokenEmail === credentials.client_email &&
    Date.now() < cachedTokenExpiresAt - 60000
  ) {
    return cachedToken;
  }

  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        alg: "RS256",
        typ: "JWT"
      })
    )
  );

  const claim = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: credentials.client_email,
        scope: SHEETS_SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600
      })
    )
  );

  const unsignedJwt = `${header}.${claim}`;

  let signingKey;

  try {
    signingKey = await crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(credentials.private_key),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );
  } catch (error) {
    console.error("Google private key import failed:", error);

    throw new Error(
      "private_key قابل پردازش نیست. قالب کلید خصوصی PEM را بررسی کن."
    );
  }

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    new TextEncoder().encode(unsignedJwt)
  );

  const assertion = `${unsignedJwt}.${base64UrlEncode(
    new Uint8Array(signature)
  )}`;

  let response;

  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      })
    });
  } catch (error) {
    console.error("Google OAuth network error:", error);

    throw new Error("ارتباط با سرویس احراز هویت گوگل برقرار نشد.");
  }

  const result = await response.json().catch(() => null);

  if (
    !response.ok ||
    !result ||
    typeof result.access_token !== "string" ||
    !result.access_token
  ) {
    console.error(
      "Google OAuth error:",
      result?.error || result?.error_description || response.status
    );

    throw new Error(
      "گوگل اجازه دریافت توکن دسترسی را نداد. اعتبارنامه Service Account و فعال بودن Google Sheets API را بررسی کن."
    );
  }

  const expiresIn = Number(result.expires_in || 3600);

  cachedToken = result.access_token;
  cachedTokenEmail = credentials.client_email;
  cachedTokenExpiresAt =
    Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000;

  return cachedToken;
}

export async function readSheetRanges(env, ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new Error("حداقل یک محدوده معتبر برای خواندن شیت لازم است.");
  }

  if (
    !ranges.every(
      range => typeof range === "string" && range.trim().length > 0
    )
  ) {
    throw new Error("محدوده‌های Google Sheets باید رشته‌های معتبر باشند.");
  }

  const token = await getAccessToken(env);

  const params = new URLSearchParams({
    valueRenderOption: "FORMATTED_VALUE"
  });

  for (const range of ranges) {
    params.append("ranges", range);
  }

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/` +
    `${encodeURIComponent(SPREADSHEET_ID)}/values:batchGet?${params}`;

  let response;

  try {
    response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error("Google Sheets network error:", error);

    throw new Error("ارتباط با Google Sheets برقرار نشد.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(
      "Google Sheets API error:",
      result?.error?.message || response.status
    );

    if (response.status === 401) {
      cachedToken = null;
      cachedTokenExpiresAt = 0;

      throw new Error(
        "توکن دسترسی گوگل نامعتبر یا منقضی شده است. دوباره تلاش کن."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "دسترسی به شیت رد شد. ایمیل Service Account را با دسترسی Viewer به Google Sheet اضافه کن و Google Sheets API را فعال کن."
      );
    }

    if (response.status === 404) {
      throw new Error(
        "Google Sheet پیدا نشد. شناسه شیت و دسترسی حساب سرویس را بررسی کن."
      );
    }

    throw new Error(
      "دریافت اطلاعات از Google Sheets ناموفق بود."
    );
  }

  return result?.valueRanges || [];
}
