import "dotenv/config";

const baseUrl = process.env.SMOKE_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const timestamp = Date.now();
const email = `smoke.${timestamp}@example.com`;
const password = "SmokePass123!";
const name = "Smoke User";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log(`[smoke] Using ${baseUrl}`);

  const health = await request("/health");
  assert(health.response.ok, `/health failed with ${health.response.status}`);

  const register = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  assert(register.response.status === 201, `/api/auth/register failed with ${register.response.status}`);
  assert(register.body?.success === true, "Register response missing success=true");

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert(login.response.ok, `/api/auth/login failed with ${login.response.status}`);
  assert(login.body?.success === true, "Login response missing success=true");

  const accessToken = login.body?.data?.tokens?.accessToken;
  assert(typeof accessToken === "string" && accessToken.length > 0, "Missing access token in login response");

  const me = await request("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert(me.response.ok, `/api/auth/me failed with ${me.response.status}`);
  assert(me.body?.success === true, "Me response missing success=true");

  const createChat = await request("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message: "Smoke test chat message" }),
  });
  assert(createChat.response.status === 201, `/api/chat failed with ${createChat.response.status}`);
  assert(createChat.body?.success === true, "Create chat response missing success=true");

  const chatId = createChat.body?.data?.chatId;
  assert(typeof chatId === "string" && chatId.length > 0, "Missing chatId from create chat response");

  const messages = await request(`/api/chat/${chatId}/messages`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert(messages.response.ok, `/api/chat/:chatId/messages failed with ${messages.response.status}`);
  assert(messages.body?.success === true, "Messages response missing success=true");

  console.log("[smoke] PASS");
}

run().catch((error) => {
  console.error(`[smoke] FAIL: ${error.message}`);
  process.exit(1);
});
