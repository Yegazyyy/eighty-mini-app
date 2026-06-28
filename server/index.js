import { createHmac } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const adminTelegramId = "769422448";
const appVersion = process.env.APP_VERSION || "2.3.0";
const appStartedAt = new Date();
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const developerState = {
  logs: [],
  telegram: {
    lastSuccessAt: "",
    lastError: ""
  },
  reminders: {
    lastCheckAt: "",
    nextCheckAt: "",
    lastNotificationAt: "",
    lastNotificationKey: ""
  },
  openFoodFacts: {
    lastRequestAt: "",
    lastSuccessAt: "",
    lastError: ""
  }
};

const activityFactors = {
  minimal: 1.2,
  low: 1.375,
  medium: 1.55,
  high: 1.725,
  veryHigh: 1.9
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function readStore() {
  if (!existsSync(dataFile)) return { users: {} };
  try {
    return JSON.parse(readFileSync(dataFile, "utf8"));
  } catch {
    return { users: {} };
  }
}

function writeStore(store) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function getUser(id) {
  if (!supabase) return readStore().users?.[id] || null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function saveUser(id, telegramId, state) {
  if (!supabase) {
    const store = readStore();
    store.users ||= {};
    store.users[id] = {
      telegramId,
      state,
      updatedAt: new Date().toISOString()
    };
    writeStore(store);
    return;
  }

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

async function listUsers() {
  if (!supabase) {
    const store = readStore();
    return Object.entries(store.users || {}).map(([id, user]) => ({
      id,
      telegramId: user.telegramId || user.state?.telegram?.telegramId || "",
      state: user.state || {}
    }));
  }

  const { data, error } = await supabase
    .from("users")
    .select("*");

  if (error) throw error;
  return (data || []).map((user) => ({
    id: user.id,
    telegramId: user.telegram_id || user.state?.telegram?.telegramId || "",
    state: user.state || {}
  }));
}

function addDeveloperLog(type, message, details = {}) {
  developerState.logs.unshift({
    at: new Date().toISOString(),
    type,
    message,
    details
  });
  developerState.logs = developerState.logs.slice(0, 100);
}

function isDeveloperUser(user) {
  return String(user?.telegramId || user?.id || "") === adminTelegramId;
}

function developerForbidden(res) {
  return json(res, 403, { error: "Forbidden" });
}

function defaultReminderSettings() {
  return {
    enabled: false,
    diary: { enabled: true, time: "20:00" },
    water: { enabled: true, intervalHours: 2, start: "09:00", end: "21:00" },
    weight: { enabled: true, weekday: "monday", time: "08:00" },
    streak: { enabled: false, time: "21:00" },
    goal: { enabled: true, time: "20:30" }
  };
}

function reminderSettings(value = {}) {
  const defaults = defaultReminderSettings();
  return {
    ...defaults,
    ...value,
    diary: { ...defaults.diary, ...(value.diary || {}) },
    water: { ...defaults.water, ...(value.water || {}) },
    weight: { ...defaults.weight, ...(value.weight || {}) },
    streak: { ...defaults.streak, ...(value.streak || {}) },
    goal: { ...defaults.goal, ...(value.goal || {}) }
  };
}

async function deleteUser(id) {
  if (!supabase) {
    const store = readStore();
    if (store.users) delete store.users[id];
    writeStore(store);
    return;
  }

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

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

function number(value, fallback = 0) {
  return Number.isFinite(Number(value)) && value !== "" && value !== null && value !== undefined ? Number(value) : fallback;
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function weekdayId(date = new Date()) {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
}

function timeToMinutes(value = "00:00") {
  const [hours, minutes] = String(value).split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function currentWeight(state) {
  const rows = [...(state.weightLogs || [])].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  return number(rows.at(-1)?.weight) || number(state.profile?.weight);
}

function waterTotal(state, date) {
  const history = state.waterHistory?.[date];
  if (Array.isArray(history)) return history.reduce((sum, item) => sum + number(item.amount), 0);
  return number(state.water?.[date]);
}

function waterGoal(state) {
  return number(state.settings?.waterGoal, 2200) || 2200;
}

function sumNutrients(items = []) {
  return items.reduce((sum, item) => ({
    calories: sum.calories + number(item.nutrients?.calories),
    protein: sum.protein + number(item.nutrients?.protein),
    fat: sum.fat + number(item.nutrients?.fat),
    carbs: sum.carbs + number(item.nutrients?.carbs)
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
}

function calcTargets(state) {
  const p = state.profile || {};
  if (p.targetMode === "manual") {
    const calories = number(p.manualTargets?.calories);
    const protein = number(p.manualTargets?.protein);
    const fat = number(p.manualTargets?.fat);
    const carbs = number(p.manualTargets?.carbs);
    const complete =
      p.manualTargets?.calories !== "" &&
      p.manualTargets?.protein !== "" &&
      p.manualTargets?.fat !== "" &&
      p.manualTargets?.carbs !== "" &&
      calories > 0;
    return {
      calories: complete ? calories : 0,
      protein: complete ? protein : 0,
      fat: complete ? fat : 0,
      carbs: complete ? carbs : 0,
      complete
    };
  }

  const weight = currentWeight(state);
  const height = number(p.height);
  const age = number(p.age);
  const complete = weight > 0 && height > 0 && age > 0 && Boolean(p.sex) && Boolean(p.activity);
  if (!complete) return { calories: 0, complete: false };
  const sexOffset = p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
  const maintenance = bmr * (activityFactors[p.activity] || activityFactors.low);
  const multiplier = p.goalMode === "loss"
    ? 1 - number(p.deficitPercent, 15) / 100
    : p.goalMode === "gain"
      ? 1 + number(p.surplusPercent, 10) / 100
      : 1;
  const calories = maintenance * multiplier;
  const protein = weight * (p.goalMode === "gain" ? 2 : p.goalMode === "loss" ? 1.8 : 1.6);
  const fat = weight * (p.goalMode === "loss" ? 0.8 : 0.9);
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return { calories, protein, fat, carbs, complete: true };
}

function nutritionGoalReached(state, date) {
  const targets = calcTargets(state);
  if (!targets.complete) return false;
  const nutrients = sumNutrients(state.diary?.[date] || []);
  return (
    nutrients.calories >= targets.calories * 0.95 &&
    nutrients.protein >= targets.protein * 0.95 &&
    nutrients.fat >= targets.fat * 0.95 &&
    nutrients.carbs >= targets.carbs * 0.95
  );
}

function reminderAlreadySent(state, date, key) {
  return Boolean(state.reminderLog?.[date]?.[key]);
}

function markReminderSent(state, date, key) {
  state.reminderLog ||= {};
  state.reminderLog[date] ||= {};
  state.reminderLog[date][key] = new Date().toISOString();
}

function dueReminderMessages(state, now = new Date()) {
  const reminders = reminderSettings(state.settings?.reminders || {});
  if (!reminders.enabled) return [];
  const date = localIsoDate(now);
  const time = localTime(now);
  const entries = state.diary?.[date] || [];
  const hasEntries = entries.length > 0;
  const messages = [];

  if (reminders.diary.enabled && reminders.diary.time === time && !hasEntries && !reminderAlreadySent(state, date, "diary")) {
    messages.push(["diary", "🍽 Не забудьте заполнить дневник питания за сегодня."]);
  }

  if (reminders.water.enabled && waterTotal(state, date) < waterGoal(state)) {
    const start = timeToMinutes(reminders.water.start);
    const end = timeToMinutes(reminders.water.end);
    const current = timeToMinutes(time);
    const interval = Math.max(1, number(reminders.water.intervalHours, 2)) * 60;
    if (current >= start && current <= end && (current - start) % interval === 0 && !reminderAlreadySent(state, date, `water-${time}`)) {
      messages.push([`water-${time}`, "💧 Пора выпить воды."]);
    }
  }

  if (reminders.weight.enabled && reminders.weight.time === time && reminders.weight.weekday === weekdayId(now) && !reminderAlreadySent(state, date, "weight")) {
    messages.push(["weight", "⚖️ Время обновить вес."]);
  }

  if (reminders.streak.enabled && reminders.streak.time === time && number(state.stats?.currentStreak) > 0 && !hasEntries && !reminderAlreadySent(state, date, "streak")) {
    messages.push(["streak", "🔥 Серия ждёт продолжения. Добавьте запись за сегодня."]);
  }

  if (reminders.goal.enabled && reminders.goal.time === time && !nutritionGoalReached(state, date) && !reminderAlreadySent(state, date, "goal")) {
    messages.push(["goal", "🎯 Проверьте цель дня по питанию."]);
  }

  return messages;
}

function activeReminderCount(state) {
  const reminders = reminderSettings(state.settings?.reminders || {});
  if (!reminders.enabled) return 0;
  return ["diary", "water", "weight", "streak", "goal"].filter((key) => reminders[key]?.enabled).length;
}

function nextReminderPreview(state, from = new Date()) {
  const reminders = reminderSettings(state.settings?.reminders || {});
  if (!reminders.enabled) return null;
  const start = new Date(from);
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  for (let offset = 0; offset < 60 * 24 * 7; offset += 1) {
    const probe = new Date(start.getTime() + offset * 60 * 1000);
    const messages = dueReminderMessages(state, probe);
    if (messages.length) {
      return {
        at: probe.toISOString(),
        key: messages[0][0],
        text: messages[0][1]
      };
    }
  }

  return null;
}

async function sendTelegramMessage(telegramId, text) {
  if (!botToken || !telegramId) return false;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: telegramId,
      text
    })
  });

  if (!response.ok) {
    const details = await response.text();
    developerState.telegram.lastError = `${response.status} ${details}`;
    addDeveloperLog("telegram-error", "Telegram API вернул ошибку", { status: response.status, details });
    throw new Error(`Telegram send failed: ${response.status} ${details}`);
  }

  developerState.telegram.lastSuccessAt = new Date().toISOString();
  developerState.telegram.lastError = "";
  addDeveloperLog("telegram-send", "Telegram сообщение отправлено", { telegramId });
  return true;
}

async function checkTelegramBotApi() {
  if (!botToken) {
    const error = "TELEGRAM_BOT_TOKEN не задан";
    developerState.telegram.lastError = error;
    addDeveloperLog("telegram-error", error);
    return { ok: false, error };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      const error = data.description || `HTTP ${response.status}`;
      developerState.telegram.lastError = error;
      addDeveloperLog("telegram-error", "Проверка Telegram Bot API завершилась ошибкой", { error });
      return { ok: false, error };
    }
    developerState.telegram.lastError = "";
    addDeveloperLog("telegram-check", "Telegram Bot API подключён", { username: data.result?.username || "" });
    return { ok: true, bot: data.result || null };
  } catch (error) {
    developerState.telegram.lastError = error.message;
    addDeveloperLog("telegram-error", "Не удалось проверить Telegram Bot API", { error: error.message });
    return { ok: false, error: error.message };
  }
}

async function checkOpenFoodFactsApi() {
  developerState.openFoodFacts.lastRequestAt = new Date().toISOString();
  try {
    const response = await fetch("https://world.openfoodfacts.org/api/v2/product/3017620422003.json", {
      headers: { Accept: "application/json" }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === 0) {
      const error = data.status_verbose || `HTTP ${response.status}`;
      developerState.openFoodFacts.lastError = error;
      addDeveloperLog("open-food-facts-error", "Open Food Facts вернул ошибку", { error });
      return { ok: false, error };
    }
    developerState.openFoodFacts.lastSuccessAt = new Date().toISOString();
    developerState.openFoodFacts.lastError = "";
    addDeveloperLog("open-food-facts-check", "Open Food Facts доступен", { product: data.product?.product_name || "" });
    return { ok: true, product: data.product?.product_name || "" };
  } catch (error) {
    developerState.openFoodFacts.lastError = error.message;
    addDeveloperLog("open-food-facts-error", "Не удалось проверить Open Food Facts", { error: error.message });
    return { ok: false, error: error.message };
  }
}

async function databaseStats() {
  const users = await listUsers();
  return users.reduce((stats, user) => {
    const state = user.state || {};
    stats.users += 1;
    stats.products += (state.products || []).length;
    stats.dishes += (state.dishes || []).length;
    stats.templates += (state.mealTemplates || []).length;
    stats.diaryEntries += Object.values(state.diary || {}).reduce((sum, items) => sum + (items?.length || 0), 0);
    return stats;
  }, {
    users: 0,
    products: 0,
    dishes: 0,
    templates: 0,
    diaryEntries: 0
  });
}

async function developerSnapshot(requestUser) {
  const user = await getUser(requestUser.id);
  const userState = user?.state || {};
  const now = new Date();
  const nextCheckAt = developerState.reminders.nextCheckAt || new Date(now.getTime() + 60 * 1000).toISOString();
  let stats = { users: 0, products: 0, dishes: 0, templates: 0, diaryEntries: 0 };
  let databaseError = "";

  try {
    stats = await databaseStats();
  } catch (error) {
    databaseError = error.message;
    addDeveloperLog("database-error", "Не удалось собрать статистику базы", { error: error.message });
  }

  return {
    appVersion,
    adminTelegramId,
    telegram: {
      botApi: botToken && !developerState.telegram.lastError ? "connected" : "error",
      botTokenConfigured: Boolean(botToken),
      telegramId: requestUser.telegramId || "",
      lastSuccessAt: developerState.telegram.lastSuccessAt,
      lastError: developerState.telegram.lastError || (botToken ? "" : "TELEGRAM_BOT_TOKEN не задан")
    },
    reminders: {
      lastCheckAt: developerState.reminders.lastCheckAt,
      nextCheckAt,
      nextNotification: nextReminderPreview(userState, now),
      activeCount: activeReminderCount(userState)
    },
    server: {
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      serverTime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
      version: appVersion
    },
    openFoodFacts: {
      status: developerState.openFoodFacts.lastError ? "error" : "unknown",
      lastRequestAt: developerState.openFoodFacts.lastRequestAt,
      lastSuccessAt: developerState.openFoodFacts.lastSuccessAt,
      lastError: developerState.openFoodFacts.lastError
    },
    database: {
      status: databaseError ? "error" : "ok",
      storage: supabase ? "supabase" : "local-json",
      error: databaseError,
      ...stats
    },
    logs: developerState.logs.slice(0, 100)
  };
}

async function processReminders() {
  const now = new Date();
  developerState.reminders.lastCheckAt = now.toISOString();
  developerState.reminders.nextCheckAt = new Date(now.getTime() + 60 * 1000).toISOString();
  addDeveloperLog("reminder-check", "Проверка напоминаний выполнена");

  if (!botToken) {
    developerState.telegram.lastError ||= "TELEGRAM_BOT_TOKEN не задан";
    return;
  }

  let users = [];
  try {
    users = await listUsers();
  } catch (error) {
    console.error("Reminder users error:", error);
    addDeveloperLog("reminder-error", "Не удалось получить пользователей для напоминаний", { error: error.message });
    return;
  }

  for (const user of users) {
    const telegramId = user.telegramId || user.state?.telegram?.telegramId || "";
    if (!telegramId) continue;

    try {
      const messages = dueReminderMessages(user.state);
      if (!messages.length) continue;

      const today = localIsoDate();
      let changed = false;
      for (const [key, text] of messages) {
        await sendTelegramMessage(telegramId, text);
        markReminderSent(user.state, today, key);
        developerState.reminders.lastNotificationAt = new Date().toISOString();
        developerState.reminders.lastNotificationKey = key;
        addDeveloperLog("reminder-send", "Напоминание отправлено", { userId: user.id, key });
        changed = true;
      }

      if (changed) await saveUser(user.id, telegramId, user.state);
    } catch (error) {
      console.error(`Reminder error for user ${user.id}:`, error);
      addDeveloperLog("reminder-error", "Ошибка отправки напоминания", { userId: user.id, error: error.message });
    }
  }
}

function parseInitData(initData, options = {}) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const userRaw = params.get("user");

  if (botToken && options.requireHash && !hash) return null;

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

function getDeveloperRequestUser(req) {
  const initData = req.headers["x-telegram-init-data"];
  const telegramUser = parseInitData(
    Array.isArray(initData) ? initData[0] : initData,
    { requireHash: true }
  );

  if (!telegramUser?.id) return null;

  return {
    id: String(telegramUser.id),
    telegramId: String(telegramUser.id),
    name:
      [telegramUser.first_name, telegramUser.last_name]
        .filter(Boolean)
        .join(" ") ||
      telegramUser.username ||
      "Пользователь",
    photoUrl: telegramUser.photo_url || ""
  };
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
        "Пользователь",
      photoUrl: telegramUser.photo_url || ""
    };
  }

  const fallbackId = url.searchParams.get("telegramId") || "demo-user";

  return {
    id: fallbackId,
    telegramId: fallbackId === "demo-user" ? "" : fallbackId,
    name: url.searchParams.get("name") || "Пользователь",
    photoUrl: url.searchParams.get("photoUrl") || ""
  };
}

function createDefaultState(user) {
  const today = new Date().toISOString().slice(0, 10);

  return {
    version: 5,
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
    telegram: {
      name: user.name,
      telegramId: user.telegramId,
      photoUrl: user.photoUrl || ""
    },
    profile: {
      name: user.name,
      sex: "",
      age: "",
      height: "",
      weight: "",
      targetWeight: "",
      activity: "",
      goalMode: "loss",
      targetMode: "auto",
      deficitPercent: 15,
      surplusPercent: 10,
      manualTargets: {
        calories: "",
        protein: "",
        fat: "",
        carbs: ""
      }
    },
    settings: {
      waterEnabled: true,
      waterManual: false,
      waterGoal: 2200,
      themeMode: "system",
      reminders: defaultReminderSettings()
    },
    products: [],
    dishes: [],
    eightyOverrides: {},
    diary: { [today]: [] },
    water: { [today]: 0 },
    waterHistory: { [today]: [] },
    weightLogs: [],
    stats: {
      currentStreak: 0,
      maxStreak: 0
    },
    reminderLog: {},
    achievements: {
      unlocked: {}
    }
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

  if (!existsSync(filePath) && !extname(filePath)) {
    res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    createReadStream(join(publicDir, "index.html")).pipe(res);
    return;
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
  });
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
        await saveUser(requestUser.id, requestUser.telegramId, state);
        user = { state };
      }

      return json(res, 200, {
        user: requestUser,
        state: user.state,
        storage: supabase ? "supabase" : "local-json"
      });
    }

    if (url.pathname === "/api/sync" && req.method === "POST") {
      const requestUser = getRequestUser(req, url);
      const body = await readBody(req);

      await saveUser(requestUser.id, requestUser.telegramId, body.state);

      return json(res, 200, {
        ok: true,
        savedAt: new Date().toISOString(),
        storage: supabase ? "supabase" : "local-json"
      });
    }

    if (url.pathname === "/api/account" && req.method === "DELETE") {
      const requestUser = getRequestUser(req, url);
      await deleteUser(requestUser.id);

      return json(res, 200, {
        ok: true,
        deletedAt: new Date().toISOString(),
        storage: supabase ? "supabase" : "local-json"
      });
    }

    if (url.pathname === "/api/developer/status" && req.method === "GET") {
      const requestUser = getDeveloperRequestUser(req);
      if (!isDeveloperUser(requestUser)) return developerForbidden(res);

      return json(res, 200, await developerSnapshot(requestUser));
    }

    if (url.pathname === "/api/developer/action" && req.method === "POST") {
      const requestUser = getDeveloperRequestUser(req);
      if (!isDeveloperUser(requestUser)) return developerForbidden(res);

      const body = await readBody(req);
      const action = String(body.action || "");
      let result = { ok: false, error: "Unknown action" };

      if (action === "test-notification") {
        try {
          const sent = await sendTelegramMessage(adminTelegramId, "🧪 Тестовое уведомление Eighty. Developer Mode работает.");
          result = { ok: Boolean(sent), message: sent ? "Тестовое уведомление отправлено" : "Бот не настроен" };
        } catch (error) {
          result = { ok: false, error: error.message };
        }
      } else if (action === "telegram") {
        result = await checkTelegramBotApi();
      } else if (action === "open-food-facts") {
        result = await checkOpenFoodFactsApi();
      } else if (action === "database") {
        try {
          result = { ok: true, stats: await databaseStats() };
          addDeveloperLog("database-check", "Подключение к базе проверено", { storage: supabase ? "supabase" : "local-json" });
        } catch (error) {
          result = { ok: false, error: error.message };
          addDeveloperLog("database-error", "Проверка базы завершилась ошибкой", { error: error.message });
        }
      } else if (action === "server") {
        result = { ok: true, uptimeSeconds: Math.floor(process.uptime()), serverTime: new Date().toISOString() };
        addDeveloperLog("server-check", "Сервер отвечает");
      } else if (action === "reminders") {
        const user = await getUser(requestUser.id);
        result = {
          ok: true,
          dueNow: dueReminderMessages(user?.state || {}),
          nextNotification: nextReminderPreview(user?.state || {}),
          activeCount: activeReminderCount(user?.state || {})
        };
        addDeveloperLog("reminder-diagnostic", "Система напоминаний проверена", { activeCount: result.activeCount });
      }

      return json(res, 200, {
        result,
        snapshot: await developerSnapshot(requestUser)
      });
    }

    return serveStatic(req, res, url);
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
});

async function migrateFromJson() {
  try {
    const raw = readStore();

    for (const [id, user] of Object.entries(raw.users || {})) {
      await saveUser(id, user.telegramId || "", user.state);
    }

    console.log("Migration completed");
  } catch (error) {
    console.error("Migration error:", error);
  }
}

if (process.env.MIGRATE_JSON_TO_SUPABASE === "1") {
  await migrateFromJson();
}

setInterval(processReminders, 60 * 1000);
setTimeout(processReminders, 5 * 1000);

server.listen(port, () => {
  console.log(`Eighty is running: http://localhost:${port}`);
});
