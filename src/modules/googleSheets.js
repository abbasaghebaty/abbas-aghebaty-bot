const SPREADSHEET_ID = "1_jUt1pw5bY0UuzZIVzNVY2PQ-CJP_liyK1eUQceyYkQ";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function pemToArrayBuffer(pem) {
  const normalized = pem.replace(/\\n/g, "\n").replace(/\r/g, "");
  const base64 = normalized.replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function readServiceAccount(env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw || typeof raw !== "string") throw new Error("Secret با نام GOOGLE_SERVICE_ACCOUNT_JSON در Cloudflare تنظیم نشده است.");
  let credentials;
  try { credentials = JSON.parse(raw); }
  catch { throw new Error("مقدار GOOGLE_SERVICE_ACCOUNT_JSON یک JSON معتبر نیست. کل محتوای فایل اصلی را بدون کوتیشن اضافه در Secret قرار بده."); }
  if (!credentials.client_email || !credentials.private_key) throw new Error("JSON حساب سرویس باید هر دو فیلد client_email و private_key را داشته باشد.");
  return credentials;
}
async function getAccessToken(env) {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60000) return cachedToken;
  const credentials = readServiceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const claim = base64UrlEncode(new TextEncoder().encode(JSON.stringify({iss:credentials.client_email,scope:SHEETS_SCOPE,aud:TOKEN_URL,iat:now,exp:now+3600})));
  const unsignedJwt = `${header}.${claim}`;
  let signingKey;
  try {
    signingKey = await crypto.subtle.importKey("pkcs8", pemToArrayBuffer(credentials.private_key),
      {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["sign"]);
  } catch (error) {
    console.error("Google private key import failed:", error);
    throw new Error("private_key قابل پردازش نیست؛ کلید خصوصی باید کامل و با قالب PEM اصلی باشد.");
  }
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signingKey, new TextEncoder().encode(unsignedJwt));
  const assertion = `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`;
  const response = await fetch(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    console.error("Google OAuth error:", result.error || response.status);
    throw new Error("گوگل اجازه دریافت توکن دسترسی را نداد. حساب سرویس و فعال بودن Google Sheets API را بررسی کن.");
  }
  cachedToken=result.access_token; cachedTokenExpiresAt=Date.now()+Number(result.expires_in||3600)*1000;
  return cachedToken;
}
export async function readSheetRanges(env,ranges) {
  const token=await getAccessToken(env);
  const params=new URLSearchParams({valueRenderOption:"FORMATTED_VALUE"});
  for(const range of ranges) params.append("ranges",range);
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${params}`;
  const response=await fetch(url,{headers:{authorization:`Bearer ${token}`}});
  const result=await response.json();
  if(!response.ok) {
    console.error("Google Sheets API error:",result.error?.message||response.status);
    if(response.status===403) throw new Error("دسترسی به شیت رد شد. ایمیل client_email را با دسترسی Viewer به Google Sheet اضافه کن و Google Sheets API را فعال کن.");
    if(response.status===404) throw new Error("Google Sheet پیدا نشد. شناسه شیت یا دسترسی حساب سرویس را بررسی کن.");
    throw new Error("دریافت اطلاعات از Google Sheets ناموفق بود.");
  }
  return result.valueRanges||[];
}
