import { redis } from "@/app/utils/Redis/RedisSetup";

const ERP_BASE = "https://alpha.clouderp.one";
const SESSION_CACHE_KEY = "erp_session_cookie";
const SESSION_CACHE_TTL_SECONDS = 60 * 60 * 6; // cache for 6h; reactive retry covers anything shorter

async function loginAndGetSession(): Promise<string> {
  const res = await fetch(`${ERP_BASE}/api/method/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usr: process.env.ERP_USERNAME,
      pwd: process.env.ERP_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`ERP login failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.message === "Password Reset") {
    throw new Error(
      `ERP login blocked: password expired. redirect_to: ${data.redirect_to}`,
    );
  }

  const setCookie = res.headers.get("set-cookie");
  const sidMatch = setCookie?.match(/sid=([^;]+)/);
  if (!sidMatch) {
    throw new Error("ERP login succeeded but no session cookie was returned");
  }

  const sid = sidMatch[1];
  await redis.set(SESSION_CACHE_KEY, sid, { ex: SESSION_CACHE_TTL_SECONDS });
  console.log("[ERP AUTH] Fresh session acquired");
  return sid;
}

export async function getErpSession(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = await redis.get<string>(SESSION_CACHE_KEY);
    if (cached) return cached;
  }
  return loginAndGetSession();
}

export async function erpFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let sid = await getErpSession();

  let res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Cookie: `sid=${sid}` },
  });

  if (res.status === 401 || res.status === 403) {
    console.log(
      "[ERP AUTH] Session rejected, forcing fresh login and retrying once",
    );
    sid = await getErpSession(true);
    res = await fetch(url, {
      ...options,
      headers: { ...options.headers, Cookie: `sid=${sid}` },
    });
  }

  return res;
}
