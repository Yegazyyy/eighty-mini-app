import { createHmac } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const publicDir = join(rootDir, "public");
const dataDir = join(rootDir, "data");
const dataFile = join(dataDir, "eighty.json");
const port = Number(process.env.PORT || 3000);
const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

async function getUser(id) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function saveUser(id, telegramId, state) {
  const { error } = await supabase
    .from("users")
    .upsert({
      id,
      telegram_id: telegramId,
      state,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });

  res.end(body);
}

function parseInitData(initData) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const userRaw = params.get("user");

  if (botToken && hash) {
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secret = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const expected = createHmac("sha256", secret)
      .update(dataCheckString)
      .digest("hex");

    if (expected !== hash) return null;
  }

  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

function getRequestUser(req, url) {
  const initData = req.headers["x-telegram-init-data"];
  const telegramUser = parseInitData(
    Array.isArray(initData) ? initData[0] : initData
  );

  if (telegramUser?.id) {
    return {
      id: String(telegramUser.id),
      telegramId: String(telegramUser.id),
      name:
        [telegramUser.first_name, telegramUser.last_name]
          .filter(Boolean)
          .join(" ") ||
        telegramUser.username ||
        "Пользователь"
    };
  }

  const fallbackId = url.searchParams.get("telegramId") || "demo-user";

  return {
    id: fallbackId,
    telegramId: fallbackId === "demo-user" ? "" : fallbackId,
    name: url.searchParams.get("name") || "Пользователь"
  };
}

function createDefaultState(user) {
  const today = new Date().toISOString().slice(0, 10);

  return {
    version: 2,
    createdAt: new Date().toISOString(),
    profile: {
      name: user.name,
      sex: "female",
      age: 28,
      height: 170,
      weight: 75,
      targetWeight: 65,
      activity: "low",
      goalMode: "loss",
      deficitPercent: 15,
      surplusPercent: 10
    },
    settings: {
      waterEnabled: true,
      waterManual: false,
      waterGoal: 2200
    },
    products: [],
    diary: { [today]: [] },
    water: { [today]: 0 },
    weightLogs: [{ date: today, weight: 75 }]
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/api/bootstrap" && req.method === "GET") {
  const requestUser = getRequestUser(req, url);

  let user = await getUser(requestUser.id);

  if (!user) {
    const state = createDefaultState(requestUser);

    await saveUser(
      requestUser.id,
      requestUser.telegramId,
      state
    );

    user = { state };
  }

  return json(res, 200, {
    user: requestUser,
    state: user.state
  });
}

    if (url.pathname === "/api/sync" && req.method === "POST") {
  const requestUser = getRequestUser(req, url);
  const body = await readBody(req);

  await saveUser(
    requestUser.id,
    requestUser.telegramId,
    body.state
  );

  return json(res, 200, {
    ok: true,
    savedAt: new Date().toISOString()
  });
}

    return serveStatic(req, res, url);
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
});

async function migrateFromJson() {
  try {
    const raw = JSON.parse(readFileSync("../data/eighty.json", "utf8"));

    for (const [id, user] of Object.entries(raw.users || {})) {
      await saveUser(
        id,
        user.telegramId || "",
        user.state
      );
    }

    console.log("Migration completed");
  } catch (e) {
  console.error("Migration error:", e);
  }
}

// await migrateFromJson();

server.listen(port, () => {
  console.log(`Eighty is running: http://localhost:${port}`);
});