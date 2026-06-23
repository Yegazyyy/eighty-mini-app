const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();
tg?.disableVerticalSwipes?.();

const app = document.querySelector("#app");
const stateKey = "eighty-state-v4";
const legacyStateKeys = ["eighty-state-v3", "eighty-state-v2"];

const todayIso = () => toIsoDate(new Date());
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) && value !== "" && value !== null && value !== undefined ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 0) => Number(value || 0).toFixed(digits).replace(/\.0+$/, "");
const capitalize = (value) => value ? value[0].toUpperCase() + value.slice(1) : "";

const activityFactors = {
  minimal: 1.2,
  low: 1.375,
  medium: 1.55,
  high: 1.725,
  veryHigh: 1.9
};

const labels = {
  activities: {
    minimal: "Минимальная",
    low: "Низкая",
    medium: "Средняя",
    high: "Высокая",
    veryHigh: "Очень высокая"
  },
  goals: {
    loss: "Похудение",
    maintain: "Поддержание",
    gain: "Набор"
  },
  meals: {
    breakfast: {
      label: "Завтрак",
      short: "Завтрак",
      icon: "☕",
      description: "Начало дня"
    },
    lunch: {
      label: "Обед",
      short: "Обед",
      icon: "🍽",
      description: "Основной приём"
    },
    dinner: {
      label: "Ужин",
      short: "Ужин",
      icon: "🌙",
      description: "Вечерний приём"
    },
    snacks: {
      label: "Перекусы",
      short: "Перекус",
      icon: "🍏",
      description: "Между приёмами"
    }
  },
  productTypes: {
    weight: "На 100 грамм",
    cooked: "После приготовления",
    piece: "Поштучно"
  }
};

const icons = {
  diary: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>`,
  analytics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 4 3 5-7"/></svg>`,
  add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
  favorite: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m15 18-6-6 6-6"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/></svg>`
};

let state = null;
let currentUser = { id: "demo-user", telegramId: "", name: "Пользователь", photoUrl: "" };
let activeScreen = "diary";
let selectedDate = todayIso();
let saveTimer = null;
let analyticsRange = "week";
let analyticsDate = todayIso();
let favoritesQuery = "";
let entryDraft = { meal: "breakfast", productId: "", amount: "" };
let entrySheetOpen = false;
let addPanelMode = "existing";
let waterHistoryOpen = false;
let keyboardBaseHeight = window.visualViewport?.height || window.innerHeight;
let keyboardTimer = null;
let skipNextAddWeightClick = false;

const formControlSelector = 'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea, select';

function isFormControl(element) {
  return element instanceof HTMLElement && element.matches(formControlSelector);
}

function setKeyboardOffset(value = 0) {
  document.documentElement.style.setProperty("--keyboard-offset", `${Math.max(0, Math.round(value))}px`);
}

function setKeyboardMode(active, offset = 0) {
  document.documentElement.classList.toggle("keyboard-open", active);
  document.body.classList.toggle("keyboard-open", active);
  setKeyboardOffset(active ? offset : 0);
}

function updateKeyboardMode() {
  const viewport = window.visualViewport;
  const currentHeight = viewport?.height || window.innerHeight;
  const focused = isFormControl(document.activeElement);

  if (!focused) keyboardBaseHeight = Math.max(keyboardBaseHeight, currentHeight);

  const heightDrop = Math.max(0, keyboardBaseHeight - currentHeight);
  const viewportOffset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
  const keyboardOffset = Math.max(heightDrop, viewportOffset);
  const keyboardVisible = focused && keyboardOffset > 90;

  setKeyboardMode(focused && (keyboardVisible || Boolean(tg) || window.innerWidth <= 820), keyboardOffset);
}

function setupKeyboardBehavior() {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", updateKeyboardMode);
  viewport?.addEventListener("scroll", updateKeyboardMode);
  window.addEventListener("resize", updateKeyboardMode);

  document.addEventListener("focusin", (event) => {
    if (!isFormControl(event.target)) return;
    setKeyboardMode(true, Math.max(0, keyboardBaseHeight - (viewport?.height || window.innerHeight)));
    clearTimeout(keyboardTimer);
    keyboardTimer = setTimeout(() => {
      updateKeyboardMode();
      event.target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    }, 120);
  });

  document.addEventListener("focusout", () => {
    clearTimeout(keyboardTimer);
    keyboardTimer = setTimeout(() => {
      if (!isFormControl(document.activeElement)) setKeyboardMode(false);
    }, 180);
  });
}

async function bootstrap() {
  const initData = tg?.initData || "";
  const response = await fetch("/api/bootstrap", {
    headers: initData ? { "X-Telegram-Init-Data": initData } : {}
  });
  const payload = await response.json();
  currentUser = payload.user || currentUser;
  state = payload.state;

  if (!initData) {
    const local = [stateKey, ...legacyStateKeys].map((key) => localStorage.getItem(key)).find(Boolean);
    if (local) {
      try {
        state = mergeState(state, JSON.parse(local));
      } catch {
        localStorage.removeItem(stateKey);
      }
    }
  }

  ensureShape();
  persist({ immediate: true });
  render();
}

function mergeState(serverState, localState) {
  if (!serverState) return localState;
  if (!localState) return serverState;
  return {
    ...serverState,
    ...localState,
    profile: { ...(serverState.profile || {}), ...(localState.profile || {}) },
    settings: { ...(serverState.settings || {}), ...(localState.settings || {}) },
    products: localState.products || serverState.products || [],
    diary: { ...(serverState.diary || {}), ...(localState.diary || {}) },
    water: { ...(serverState.water || {}), ...(localState.water || {}) },
    waterHistory: { ...(serverState.waterHistory || {}), ...(localState.waterHistory || {}) },
    weightLogs: localState.weightLogs || serverState.weightLogs || [],
    stats: { ...(serverState.stats || {}), ...(localState.stats || {}) },
    achievements: { ...(serverState.achievements || {}), ...(localState.achievements || {}) }
  };
}

function ensureShape() {
  state ||= {};
  state.version = 5;
  state.createdAt ||= new Date().toISOString();
  state.profile = {
    name: currentUser.name || "",
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
    },
    ...(state.profile || {})
  };
  state.profile.targetMode ||= state.profile.goalMode === "manual" ? "manual" : "auto";
  if (state.profile.goalMode === "manual") state.profile.goalMode = "loss";
  state.profile.manualTargets = {
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
    ...(state.profile.manualTargets || {})
  };

  state.settings = {
    waterEnabled: true,
    waterManual: false,
    waterGoal: 2200,
    ...(state.settings || {})
  };
  state.products ||= [];
  state.diary ||= {};
  state.water ||= {};
  state.waterHistory ||= {};
  state.weightLogs ||= [];
  state.weightLogs = state.weightLogs
    .filter((item) => item && number(item.weight) > 0 && item.date)
    .map((item) => ({
      ...item,
      id: item.id || uid(),
      createdAt: !item.createdAt || item.createdAt === `${item.date}T12:00:00` ? `${item.date}T00:00:00` : item.createdAt
    }));
  state.stats = {
    currentStreak: 0,
    maxStreak: 0,
    ...(state.stats || {})
  };
  state.achievements = {
    unlocked: {},
    ...(state.achievements || {})
  };
  state.achievements.unlocked ||= {};
  state.telegram = {
    name: currentUser.name || "",
    telegramId: currentUser.telegramId || "",
    photoUrl: currentUser.photoUrl || "",
    ...(state.telegram || {})
  };
  if (currentUser.telegramId) state.telegram.telegramId = currentUser.telegramId;
  if (currentUser.name) state.telegram.name = currentUser.name;
  if (currentUser.photoUrl) state.telegram.photoUrl = currentUser.photoUrl;
  state.diary[selectedDate] ||= [];
  state.water[selectedDate] ||= 0;
  for (const [date, total] of Object.entries(state.water)) {
    if (number(total) > 0 && !state.waterHistory[date]?.length) {
      state.waterHistory[date] = [{
        id: uid(),
        amount: number(total),
        createdAt: `${date}T12:00:00`,
        migrated: true
      }];
    }
  }
  state.waterHistory[selectedDate] ||= [];
  for (const date of new Set([...Object.keys(state.water), ...Object.keys(state.waterHistory)])) {
    state.water[date] = waterTotal(date);
  }
  if (!state.weightLogs.length && number(state.profile.weight) > 0) {
    state.weightLogs.push({ id: uid(), date: selectedDate, weight: state.profile.weight, createdAt: timestampForDate(selectedDate) });
  }
  updateStats();
  updateAchievements();
}

function persist(options = {}) {
  ensureShape();
  localStorage.setItem(stateKey, JSON.stringify(state));
  for (const key of legacyStateKeys) localStorage.removeItem(key);
  clearTimeout(saveTimer);

  const sync = async () => {
    const initData = tg?.initData || "";
    await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(initData ? { "X-Telegram-Init-Data": initData } : {})
      },
      body: JSON.stringify({ state })
    }).catch(() => {});
  };

  if (options.immediate) sync();
  else saveTimer = setTimeout(sync, 300);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value, delta) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
}

function analyticsMinDate() {
  return addDays(todayIso(), -29);
}

function clampAnalyticsDate(value) {
  if (!value) return todayIso();
  return clampDate(value, analyticsMinDate(), todayIso());
}

function clampDate(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDayTitle(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function formatDaySubtitle(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatFullDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function timestampForDate(date) {
  const now = new Date();
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
}

function pluralRecord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} запись`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} записи`;
  return `${count} записей`;
}

function calcTargets() {
  const p = state.profile;
  if (p.targetMode === "manual") {
    const calories = number(p.manualTargets.calories);
    const protein = number(p.manualTargets.protein);
    const fat = number(p.manualTargets.fat);
    const carbs = number(p.manualTargets.carbs);
    const complete =
      p.manualTargets.calories !== "" &&
      p.manualTargets.protein !== "" &&
      p.manualTargets.fat !== "" &&
      p.manualTargets.carbs !== "" &&
      calories > 0;
    return {
      bmr: 0,
      maintenance: 0,
      calories: complete ? calories : 0,
      protein: complete ? protein : 0,
      fat: complete ? fat : 0,
      carbs: complete ? carbs : 0,
      manual: true,
      complete
    };
  }

  const weight = number(p.weight);
  const height = number(p.height);
  const age = number(p.age);
  const complete = weight > 0 && height > 0 && age > 0 && Boolean(p.sex) && Boolean(p.activity);
  if (!complete) {
    return { bmr: 0, maintenance: 0, calories: 0, protein: 0, fat: 0, carbs: 0, manual: false, complete: false };
  }
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
  return { bmr, maintenance, calories, protein, fat, carbs, manual: false, complete: true };
}

function targetValue(value, unit = "") {
  const numeric = number(value);
  if (numeric <= 0) return "—";
  return `${round(numeric)}${unit ? ` ${unit}` : ""}`;
}

function calcProduct(product, amount) {
  const qty = number(amount, 0);
  let factor = qty;
  if (product.type === "weight") factor = qty / 100;
  if (product.type === "cooked") {
    const dry = number(product.cookedDryWeight, 100);
    const ready = Math.max(1, number(product.cookedReadyWeight, 100));
    factor = (qty * dry / ready) / 100;
  }
  return {
    calories: number(product.calories) * factor,
    protein: number(product.protein) * factor,
    fat: number(product.fat) * factor,
    carbs: number(product.carbs) * factor
  };
}

function sumNutrients(items) {
  return items.reduce((sum, item) => {
    sum.calories += number(item.nutrients?.calories);
    sum.protein += number(item.nutrients?.protein);
    sum.fat += number(item.nutrients?.fat);
    sum.carbs += number(item.nutrients?.carbs);
    return sum;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
}

function entriesForDate(date = selectedDate) {
  ensureShape();
  state.diary[date] ||= [];
  return state.diary[date];
}

function weightEntryTime(item) {
  return item.createdAt || `${item.date}T00:00:00`;
}

function weightEntryTimestamp(item) {
  const time = Date.parse(weightEntryTime(item));
  return Number.isFinite(time) ? time : 0;
}

function currentWeight() {
  const profileWeight = number(state.profile.weight);
  if (profileWeight > 0) return profileWeight;
  const sorted = [...state.weightLogs].sort((a, b) => weightEntryTimestamp(a) - weightEntryTimestamp(b));
  return number(sorted.at(-1)?.weight);
}

function waterRate() {
  return ({
    minimal: 30,
    low: 32,
    medium: 35,
    high: 38,
    veryHigh: 40
  })[state.profile.activity] || 35;
}

function autoWaterGoal() {
  const weight = number(currentWeight());
  if (weight <= 0) return 0;
  return Math.round(weight * waterRate() / 50) * 50;
}

function waterGoal() {
  if (state.settings.waterManual) return number(state.settings.waterGoal, 2200);
  return autoWaterGoal() || number(state.settings.waterGoal, 2200) || 2200;
}

function waterFormulaText() {
  const weight = number(currentWeight());
  if (state.settings.waterManual) return "Ручной режим: используется значение, которое вы ввели.";
  if (weight <= 0) return "Автоматический расчёт: укажите вес, чтобы рассчитать норму воды.";
  return `Автоматический расчёт: ${waterRate()} мл × ${round(weight, 1)} кг = ${round(waterGoal())} мл в день.`;
}

function waterRangeText() {
  const weight = number(currentWeight());
  if (weight <= 0) return "Рекомендуемый водный баланс: от 30 до 40 мл на 1 кг веса.";
  const min = weight * 30;
  const max = weight * 40;
  return `Для вашего веса рекомендуется: ${round(min / 1000, 1)}–${round(max / 1000, 1)} л воды в день.`;
}

function waterEntries(date = selectedDate) {
  state.waterHistory ||= {};
  state.waterHistory[date] ||= [];
  return state.waterHistory[date];
}

function waterTotal(date = selectedDate) {
  return (state.waterHistory?.[date] || []).reduce((total, item) => total + number(item.amount), 0);
}

function syncWaterTotal(date = selectedDate) {
  state.water ||= {};
  state.water[date] = waterTotal(date);
}

function activeDay(date) {
  return (state.diary?.[date] || []).length > 0 || waterTotal(date) >= waterGoal();
}

function allTrackedDates() {
  return [...new Set([
    ...Object.keys(state.diary || {}),
    ...Object.keys(state.water || {}),
    ...Object.keys(state.waterHistory || {})
  ])].sort();
}

function dayDifference(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

function streakMetrics() {
  let current = 0;
  for (let date = todayIso(); activeDay(date); date = addDays(date, -1)) current++;

  const dates = allTrackedDates();
  const start = dates[0] || todayIso();
  let max = 0;
  let run = 0;
  for (let date = start; date <= todayIso(); date = addDays(date, 1)) {
    if (activeDay(date)) {
      run++;
      max = Math.max(max, run);
    } else {
      run = 0;
    }
  }
  return { current, max };
}

function updateStats() {
  const streak = streakMetrics();
  state.stats.currentStreak = streak.current;
  state.stats.maxStreak = Math.max(number(state.stats.maxStreak), streak.max);
}

function totalMealEntries() {
  return Object.values(state.diary || {}).reduce((sum, items) => sum + (items?.length || 0), 0);
}

function waterGoalDays() {
  return allTrackedDates().filter((date) => waterTotal(date) >= waterGoal()).length;
}

function firstWeight() {
  const sorted = [...state.weightLogs].sort((a, b) => weightEntryTimestamp(a) - weightEntryTimestamp(b));
  return number(sorted[0]?.weight);
}

function weightLost() {
  const start = firstWeight();
  const current = currentWeight();
  return Math.max(0, start - current);
}

function targetReached() {
  const target = number(state.profile.targetWeight);
  const current = currentWeight();
  const start = firstWeight();
  if (target <= 0 || current <= 0) return false;
  if (start > target) return current <= target;
  if (start < target) return current >= target;
  return Math.abs(current - target) <= 0.1;
}

function achievementDefinitions() {
  const activeDays = allTrackedDates().filter(activeDay).length;
  return [
    { id: "first-day", title: "🏆 Первый день", value: activeDays, target: 1 },
    { id: "streak-7", title: "🔥 7 дней подряд", value: state.stats.maxStreak, target: 7 },
    { id: "streak-30", title: "🔥 30 дней подряд", value: state.stats.maxStreak, target: 30 },
    { id: "water-10", title: "💧 Выполнена норма воды 10 раз", value: waterGoalDays(), target: 10 },
    { id: "water-50", title: "💧 Выполнена норма воды 50 раз", value: waterGoalDays(), target: 50 },
    { id: "meals-100", title: "🍽 Добавлено 100 приёмов пищи", value: totalMealEntries(), target: 100 },
    { id: "meals-500", title: "🍽 Добавлено 500 приёмов пищи", value: totalMealEntries(), target: 500 },
    { id: "loss-5", title: "⚖ Потеряно 5 кг", value: weightLost(), target: 5 },
    { id: "loss-10", title: "⚖ Потеряно 10 кг", value: weightLost(), target: 10 },
    { id: "target-weight", title: "⚖ Достигнута цель по весу", value: targetReached() ? 1 : 0, target: 1 }
  ];
}

function updateAchievements() {
  for (const achievement of achievementDefinitions()) {
    if (achievement.value >= achievement.target && !state.achievements.unlocked[achievement.id]) {
      state.achievements.unlocked[achievement.id] = new Date().toISOString();
    }
  }
}

function isAchievementUnlocked(id) {
  return Boolean(state.achievements?.unlocked?.[id]);
}

function earnedAchievementCount() {
  return achievementDefinitions().filter((item) => isAchievementUnlocked(item.id)).length;
}

function productUsage() {
  const counts = {};
  for (const entries of Object.values(state.diary || {})) {
    for (const item of entries || []) counts[item.productId] = (counts[item.productId] || 0) + 1;
  }
  return counts;
}

function frequentProducts() {
  const counts = productUsage();
  return [...state.products]
    .map((product) => ({ ...product, uses: counts[product.id] || 0 }))
    .filter((product) => product.uses > 0)
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
    .slice(0, 10);
}

function setScreen(screen) {
  activeScreen = screen;
  if (screen !== "diary") entrySheetOpen = false;
  if (screen === "add" && !state.products.length) addPanelMode = "new";
  render();
}

function openAdd(meal = "breakfast") {
  activeScreen = "add";
  entryDraft.meal = meal;
  entryDraft.productId ||= state.products[0]?.id || "";
  entryDraft.amount = selectedProduct()?.type === "piece" ? 1 : "";
  entrySheetOpen = false;
  addPanelMode = state.products.length ? "existing" : "new";
  render();
}

function selectedProduct() {
  return state.products.find((item) => item.id === entryDraft.productId) || state.products[0];
}

function changeDate(delta) {
  const [year, month, day] = selectedDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + delta);
  const next = toIsoDate(date);
  if (next > todayIso()) return;
  selectedDate = next;
  ensureShape();
  render();
}

function blurActive() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function addEntry(form) {
  const data = new FormData(form);
  const product = state.products.find((item) => item.id === data.get("productId"));
  if (!product) return toast("Сначала добавьте продукт");

  const amount = product.type === "piece"
    ? Math.max(1, number(data.get("amount"), 1))
    : number(data.get("amount"), 0);
  if (amount <= 0) return toast("Введите количество");

  entriesForDate().push({
    id: uid(),
    meal: data.get("meal"),
    productId: product.id,
    label: product.name,
    amount,
    unit: product.type === "piece" ? "шт." : "г",
    nutrients: calcProduct(product, amount)
  });
  entryDraft = { meal: data.get("meal"), productId: product.id, amount: product.type === "piece" ? 1 : "" };
  entrySheetOpen = false;
  activeScreen = "diary";
  blurActive();
  persist();
  render();
  toast("Добавлено");
}

function deleteEntry(id) {
  state.diary[selectedDate] = entriesForDate().filter((item) => item.id !== id);
  persist();
  render();
}

function addProduct(form) {
  const data = new FormData(form);
  const product = {
    id: uid(),
    name: String(data.get("name") || "").trim(),
    type: data.get("type"),
    calories: number(data.get("calories")),
    protein: number(data.get("protein")),
    fat: number(data.get("fat")),
    carbs: number(data.get("carbs")),
    cookedDryWeight: number(data.get("cookedDryWeight"), 100),
    cookedReadyWeight: number(data.get("cookedReadyWeight"), 230)
  };
  if (!product.name) return toast("Введите название");
  state.products.unshift(product);
  entryDraft.productId = product.id;
  entryDraft.amount = product.type === "piece" ? 1 : "";
  addPanelMode = "existing";
  blurActive();
  persist();
  render();
  toast("Продукт сохранён");
}

function deleteProduct(id) {
  state.products = state.products.filter((item) => item.id !== id);
  if (entryDraft.productId === id) entryDraft.productId = state.products[0]?.id || "";
  persist();
  render();
}

function addWater(ml) {
  const amount = number(ml);
  if (amount <= 0) return;
  waterEntries(selectedDate).push({
    id: uid(),
    amount,
    createdAt: timestampForDate(selectedDate)
  });
  syncWaterTotal(selectedDate);
  persist();
  render();
}

function deleteWaterEntry(id) {
  state.waterHistory[selectedDate] = waterEntries(selectedDate).filter((item) => item.id !== id);
  syncWaterTotal(selectedDate);
  persist();
  render();
}

function saveWaterHistory(form) {
  const data = new FormData(form);
  state.waterHistory[selectedDate] = waterEntries(selectedDate)
    .map((item) => ({
      ...item,
      amount: number(data.get(`water-${item.id}`))
    }))
    .filter((item) => item.amount > 0);
  syncWaterTotal(selectedDate);
  waterHistoryOpen = false;
  blurActive();
  persist();
  render();
  toast("История воды сохранена");
}

function addWaterManual(form) {
  const amount = number(new FormData(form).get("waterAmount"));
  if (amount <= 0) return toast("Введите количество воды");
  addWater(amount);
  blurActive();
  form.reset();
}

function optionalNumber(value) {
  return value === "" || value === null || value === undefined ? "" : number(value);
}

function waterGoalFromForm(form) {
  const input = form.elements?.waterGoal;
  return optionalNumber(input ? input.value : state.settings.waterGoal);
}

function namedFieldValue(container, name) {
  return container.elements?.[name]?.value ?? container.querySelector?.(`[name="${name}"]`)?.value ?? "";
}

function waterAutoEnabledFromForm(form) {
  const input = form.elements?.waterAuto;
  return input ? Boolean(input.checked) : !state.settings.waterManual;
}

function syncWaterSettingsFromForm(form) {
  const auto = waterAutoEnabledFromForm(form);
  const formGoal = waterGoalFromForm(form);
  const fallbackGoal = autoWaterGoal() || number(state.settings.waterGoal, 2200) || 2200;

  state.settings.waterManual = !auto;
  if (state.settings.waterManual) {
    state.settings.waterGoal = number(formGoal) > 0 ? formGoal : fallbackGoal;
  } else if (formGoal !== "" && number(formGoal) > 0) {
    state.settings.waterGoal = formGoal;
  }
}

function syncProfileFromForm(form) {
  const data = new FormData(form);
  const p = state.profile;
  p.name = String(data.get("name") || "").trim() || state.telegram.name || "";
  p.sex = data.get("sex") || "";
  p.age = optionalNumber(data.get("age"));
  p.height = optionalNumber(data.get("height"));
  p.weight = optionalNumber(data.get("weight"));
  p.targetWeight = optionalNumber(data.get("targetWeight"));
  p.activity = data.get("activity") || "";
  p.goalMode = data.get("goalMode") || "loss";
  p.targetMode = data.get("targetMode") || "auto";
  p.deficitPercent = number(data.get("deficitPercent"), p.deficitPercent);
  p.surplusPercent = number(data.get("surplusPercent"), p.surplusPercent);
  p.manualTargets.calories = optionalNumber(data.get("manualCalories"));
  p.manualTargets.protein = optionalNumber(data.get("manualProtein"));
  p.manualTargets.fat = optionalNumber(data.get("manualFat"));
  p.manualTargets.carbs = optionalNumber(data.get("manualCarbs"));
  syncWaterSettingsFromForm(form);
}

function syncProfileWaterFromForm(form) {
  const data = new FormData(form);
  state.profile.weight = optionalNumber(data.get("weight"));
  state.profile.activity = data.get("activity") || "";
  syncWaterSettingsFromForm(form);
}

function refreshProfileWaterView() {
  const panel = app.querySelector("[data-profile-water]");
  if (!panel) return;
  const manualInput = panel.querySelector('[name="waterGoal"]');
  const goalLabel = panel.querySelector("[data-water-goal-label]");
  const formula = panel.querySelector("[data-water-formula]");
  const range = panel.querySelector("[data-water-range]");
  const mode = panel.querySelector("[data-water-mode]");

  if (manualInput) {
    manualInput.disabled = !state.settings.waterManual;
    if (document.activeElement !== manualInput) manualInput.value = state.settings.waterGoal || "";
  }
  if (goalLabel) goalLabel.textContent = `${round(waterGoal() / 1000, 1)} л в день`;
  if (formula) formula.textContent = waterFormulaText();
  if (range) range.textContent = waterRangeText();
  if (mode) mode.textContent = state.settings.waterManual ? "Ручной режим" : "Автоматический расчёт";
}

function updateProfileWaterFromForm(form) {
  syncProfileWaterFromForm(form);
  refreshProfileWaterView();
  persist();
}

function saveProfile(form) {
  syncProfileFromForm(form);
  if (number(state.profile.weight) > 0) {
    const existing = state.weightLogs.find((item) => item.date === selectedDate);
    if (existing) {
      existing.weight = state.profile.weight;
      existing.createdAt ||= timestampForDate(selectedDate);
    } else {
      state.weightLogs.push({ id: uid(), date: selectedDate, weight: state.profile.weight, createdAt: timestampForDate(selectedDate) });
    }
  }
  blurActive();
  persist();
  render();
  toast("Сохранено");
}

function recalculateProfile(form) {
  syncProfileFromForm(form);
  persist();
  render();
  toast("Расчёт обновлён");
}

function addWeight(form) {
  const date = namedFieldValue(form, "date");
  const weight = number(namedFieldValue(form, "weight"));
  if (!date || weight <= 0) return toast("Введите вес");
  state.weightLogs.push({ id: uid(), date, weight, createdAt: timestampForDate(date) });
  state.profile.weight = weight;
  blurActive();
  persist();
  render();
  toast("Вес добавлен");
}

function handleAddWeightButton(button) {
  const form = button.closest("[data-weight-form]");
  if (form) addWeight(form);
}

function filteredFavorites() {
  const query = favoritesQuery.trim().toLowerCase();
  if (!query) return state.products;
  return state.products.filter((item) => item.name.toLowerCase().includes(query));
}

function render() {
  ensureShape();
  if (!state.products.find((item) => item.id === entryDraft.productId)) {
    entryDraft.productId = state.products[0]?.id || "";
  }
  const targets = calcTargets();
  const consumed = sumNutrients(entriesForDate());

  app.innerHTML = `
    <main class="layout">
      ${screenDiary(targets, consumed)}
      ${screenAnalytics()}
      ${screenAdd()}
      ${screenFavorites()}
      ${screenProfile(targets)}
    </main>
    ${tabs()}
    <button class="keyboard-done" type="button" data-keyboard-done>Готово</button>
    ${waterHistoryOpen ? waterHistoryModal() : ""}
  `;
}

function tabs() {
  const items = [
    ["diary", icons.diary, "Дневник"],
    ["analytics", icons.analytics, "Аналитика"],
    ["add", icons.add, "Добавить"],
    ["favorites", icons.favorite, "Избранное"],
    ["profile", icons.profile, "Профиль"]
  ];
  return `<nav class="tabs">${items.map(([id, icon, label]) => `
    <button class="tab ${activeScreen === id ? "active" : ""} ${id === "add" ? "tab-action" : ""}" data-screen="${id}" title="${label}">
      <span class="tab-icon">${icon}</span>${id === "add" ? "" : `<span>${label}</span>`}
    </button>
  `).join("")}</nav>`;
}

function screenDiary(targets, consumed) {
  const remaining = Math.max(0, targets.calories - consumed.calories);
  const calorieProgress = targets.complete ? clamp(consumed.calories / Math.max(1, targets.calories) * 100, 0, 100) : 0;
  return `<section class="screen ${activeScreen === "diary" ? "active" : ""}">
    <div class="stack">
      <header class="app-header">
        <div class="brand-mark">80</div>
        <div>
          <h1>Eighty</h1>
          <p>Твой путь к цели. Контроль питания, веса и прогресса.</p>
        </div>
      </header>
      ${diaryDayHeader()}
      ${dayCard()}
      ${activitySummaryCard()}
      ${energyCard(targets, consumed, remaining, calorieProgress)}
      ${mealsSection()}
      ${entrySheetOpen ? entrySheet() : ""}
      ${waterSection()}
    </div>
  </section>`;
}

function diaryDayHeader() {
  const isToday = selectedDate >= todayIso();
  return `<div class="diary-day-head">
    <div class="hello-card">Привет, ${escapeHtml(currentUser.name || state.profile.name || "Пользователь")}!</div>
    <div class="day-actions">
      <button class="icon-btn" data-action="prev-date" title="Предыдущий день">${icons.prev}</button>
      <button class="icon-btn" data-action="next-date" title="Следующий день" ${isToday ? "disabled" : ""}>${icons.next}</button>
    </div>
  </div>`;
}

function activitySummaryCard() {
  return `<div class="activity-summary">
    <div><span>🔥 Серия</span><strong>${round(state.stats.currentStreak)} дней подряд</strong></div>
    <div><span>🏆 Достижения</span><strong>${earnedAchievementCount()} получено</strong></div>
  </div>`;
}

function dayCard() {
  const count = entriesForDate().length;
  return `<div class="day-wrap">
    <div class="day-card">
      <div>
        <strong>${formatDayTitle(selectedDate)}</strong>
        <span>${formatDaySubtitle(selectedDate)}</span>
      </div>
      <b>${pluralRecord(count)}</b>
    </div>
  </div>`;
}

function energyCard(targets, consumed, remaining, progress) {
  const goalText = targets.complete ? `Суточная цель — ${round(targets.calories)} ккал` : "Заполните профиль для расчёта цели";
  return `<div class="energy-card">
    <div class="energy-ring" style="--progress:${progress}">
      <div>
        <strong>${round(remaining)}</strong>
        <span>ккал осталось</span>
      </div>
    </div>
    <div class="energy-info">
      <h2>ЭНЕРГИЯ</h2>
      <p>съедено калорий</p>
      <strong>${round(consumed.calories)} ккал</strong>
      <p>${goalText}</p>
      ${macroLine("Белки", consumed.protein, targets.protein, "protein")}
      ${macroLine("Жиры", consumed.fat, targets.fat, "fat")}
      ${macroLine("Углеводы", consumed.carbs, targets.carbs, "carbs")}
    </div>
  </div>`;
}

function macroLine(label, value, target, kind) {
  const progress = clamp(value / Math.max(1, target) * 100, 0, 100);
  return `<div class="macro-line ${kind}">
    <div><span>${label}</span><b>${round(value)} / ${targetValue(target, "г")}</b></div>
    <div class="progress" style="--value:${progress}%"><i></i></div>
  </div>`;
}

function mealsSection() {
  return `<section class="section-block">
    <h2>ПРИЁМЫ ПИЩИ</h2>
    <div class="meal-list">${Object.entries(labels.meals).map(([meal, data]) => mealCard(meal, data)).join("")}</div>
    <div class="info-card">Добавляйте блюда сразу после еды — так дневник остаётся точным.</div>
  </section>`;
}

function mealCard(meal, data) {
  const items = entriesForDate().filter((item) => item.meal === meal);
  const total = sumNutrients(items);
  return `<article class="meal-card">
    <div class="meal-top">
      <div class="meal-icon">${data.icon}</div>
      <div>
        <h3>${data.label}</h3>
        <span>${data.description} · ${pluralRecord(items.length)}</span>
      </div>
      <button class="small-add" data-open-add="${meal}">+</button>
    </div>
    <div class="meal-total">
      <strong>${round(total.calories)} ккал</strong>
      <div class="meal-macros">
        <span>Б ${round(total.protein)}</span>
        <span>Ж ${round(total.fat)}</span>
        <span>У ${round(total.carbs)}</span>
      </div>
    </div>
    ${items.length ? `<div class="meal-items">${items.map(entryRow).join("")}</div>` : `<div class="empty-line">Пока пусто</div>`}
  </article>`;
}

function entryRow(item) {
  return `<div class="entry-row">
    <div>
      <strong>${escapeHtml(item.label)}</strong>
      <span>${round(item.nutrients.calories)} ккал</span>
      <div class="entry-macros">
        <span>Б ${round(item.nutrients.protein)}</span>
        <span>Ж ${round(item.nutrients.fat)}</span>
        <span>У ${round(item.nutrients.carbs)}</span>
      </div>
      <em>${round(item.amount, 1)} ${item.unit}</em>
    </div>
    <button class="icon-btn compact" data-delete-entry="${item.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function waterSection() {
  const water = waterTotal(selectedDate);
  const goal = waterGoal();
  const complete = goal > 0 && water >= goal;
  return `<section class="water-card">
    <div class="section-title water-title">
      <h2>Вода</h2>
      <div>
        <span>${round(water / 1000, 1)} / ${round(goal / 1000, 1)} л</span>
        <button class="history-btn" type="button" data-action="water-history">История</button>
      </div>
    </div>
    ${complete
      ? `<div class="water-complete"><strong>Водный баланс выполнен!</strong><span>${round(water)} мл из ${round(goal)} мл</span></div>`
      : `<div class="progress large water" style="--value:${clamp(water / Math.max(1, goal) * 100, 0, 100)}%"><i></i></div>`}
    <div class="chip-row">
      <button class="chip-btn" data-water="250">+250 мл</button>
      <button class="chip-btn" data-water="500">+500 мл</button>
      <button class="chip-btn" data-water="1000">+1000 мл</button>
    </div>
    <form class="inline-form" data-form="water">
      <input name="waterAmount" type="number" min="1" step="1" inputmode="numeric" enterkeyhint="done" placeholder="750 мл">
      <button class="secondary-btn" type="submit">Готово</button>
    </form>
  </section>`;
}

function waterHistoryModal() {
  const entries = [...waterEntries(selectedDate)].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const total = waterTotal(selectedDate);
  return `<div class="modal-backdrop" data-modal-close="water">
    <div class="modal-card water-modal" role="dialog" aria-modal="true" aria-label="История воды">
      <div class="modal-head">
        <div>
          <span>${formatDayTitle(selectedDate)}</span>
          <h3>История воды</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-water-history">×</button>
      </div>
      <form data-form="water-history">
        <div class="water-history-list">
          ${entries.length ? entries.map(waterHistoryRow).join("") : `<div class="empty-line">За этот день воды пока нет</div>`}
        </div>
        <div class="water-history-total">
          <span>Итого</span>
          <strong>${round(total)} мл</strong>
        </div>
        <button class="primary-btn full-btn" type="submit">Сохранить</button>
      </form>
    </div>
  </div>`;
}

function waterHistoryRow(item) {
  return `<div class="water-history-row">
    <div>
      <strong>+${round(item.amount)} мл</strong>
      <span>${formatDateTime(item.createdAt)}</span>
    </div>
    <label>
      <span>мл</span>
      <input name="water-${item.id}" type="number" min="0" step="1" inputmode="numeric" value="${round(item.amount)}">
    </label>
    <button class="icon-btn compact" type="button" data-delete-water="${item.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function screenAnalytics() {
  analyticsDate = clampAnalyticsDate(analyticsDate);
  const history = analyticsHistory();
  const dayStats = sumNutrients(state.diary[analyticsDate] || []);
  const stats = analyticsStats(history);
  return `<section class="screen ${activeScreen === "analytics" ? "active" : ""}">
    <div class="stack">
      <header class="screen-header"><h1>Аналитика</h1></header>
      ${analyticsDateSwitcher()}
      ${analyticsDayCard(dayStats)}
      <div class="segmented">
        ${[["week", "Неделя"], ["month", "Месяц"]].map(([id, label]) => `<button class="${analyticsRange === id ? "active" : ""}" data-range="${id}">${label}</button>`).join("")}
      </div>
      ${analyticsHistoryView(history)}
      <div class="stat-grid analytics-stats">
        ${statCard("Калории", `${round(stats.calories)} ккал`)}
        ${statCard("Белки", `${round(stats.protein)} г`)}
        ${statCard("Жиры", `${round(stats.fat)} г`)}
        ${statCard("Углеводы", `${round(stats.carbs)} г`)}
      </div>
      ${analyticsWaterCard()}
      ${periodSummaryCard(stats, history.length)}
    </div>
  </section>`;
}

function analyticsDateSwitcher() {
  return `<div class="date-switcher">
    <button class="icon-btn" data-analytics-step="-1" title="Предыдущий день" ${analyticsDate <= analyticsMinDate() ? "disabled" : ""}>${icons.prev}</button>
    <strong>${formatFullDate(analyticsDate)}</strong>
    <button class="icon-btn" data-analytics-step="1" title="Следующий день" ${analyticsDate >= todayIso() ? "disabled" : ""}>${icons.next}</button>
  </div>`;
}

function analyticsDayCard(stats) {
  return `<section class="analytics-day-card">
    <span>${analyticsDate === todayIso() ? "Съедено сегодня" : "Съедено за день"}</span>
    <strong>${round(stats.calories)} ккал</strong>
    <div class="day-macro-list">
      <div><span>Белки</span><b>${round(stats.protein)} г</b></div>
      <div><span>Жиры</span><b>${round(stats.fat)} г</b></div>
      <div><span>Углеводы</span><b>${round(stats.carbs)} г</b></div>
    </div>
  </section>`;
}

function analyticsWaterCard() {
  const water = waterTotal(analyticsDate);
  const goal = waterGoal();
  const percent = clamp(water / Math.max(1, goal) * 100, 0, 100);
  return `<section class="analytics-water-card">
    <div>
      <span>Вода</span>
      <strong>${round(water)} мл / ${round(goal)} мл</strong>
      <p>${round(percent)}% выполнено</p>
    </div>
    <div class="progress large water" style="--value:${percent}%"><i></i></div>
  </section>`;
}

function analyticsHistory() {
  const days = analyticsRange === "month" ? 30 : 7;
  const end = new Date(`${analyticsDate}T00:00:00`);
  const rows = [];
  for (let index = 0; index < days; index++) {
    const date = new Date(end);
    date.setDate(end.getDate() - index);
    const iso = toIsoDate(date);
    if (iso < analyticsMinDate() || iso > todayIso()) continue;
    const items = state.diary[iso] || [];
    rows.push({ date: iso, nutrients: sumNutrients(items), count: items.length });
  }
  return rows;
}

function analyticsStats(history) {
  const totals = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  let counted = 0;
  let waterPercent = 0;
  let filledDays = 0;
  for (const row of history) {
    waterPercent += clamp(waterTotal(row.date) / Math.max(1, waterGoal()) * 100, 0, 100);
    if (activeDay(row.date)) filledDays++;
    if (row.count) {
      totals.calories += row.nutrients.calories;
      totals.protein += row.nutrients.protein;
      totals.fat += row.nutrients.fat;
      totals.carbs += row.nutrients.carbs;
      counted++;
    }
  }
  const divisor = Math.max(1, counted);
  return {
    calories: totals.calories / divisor,
    protein: totals.protein / divisor,
    fat: totals.fat / divisor,
    carbs: totals.carbs / divisor,
    waterPercent: waterPercent / Math.max(1, history.length),
    filledDays
  };
}

function periodSummaryCard(stats, totalDays) {
  return `<section class="section-block">
    <h2>${analyticsRange === "month" ? "ИТОГИ МЕСЯЦА" : "ИТОГИ НЕДЕЛИ"}</h2>
    <div class="summary-grid">
      ${statCard("Среднее ккал", round(stats.calories))}
      ${statCard("Средние белки", `${round(stats.protein)} г`)}
      ${statCard("Средние жиры", `${round(stats.fat)} г`)}
      ${statCard("Средние углеводы", `${round(stats.carbs)} г`)}
      ${statCard("Выполнение воды", `${round(stats.waterPercent)}%`)}
      ${statCard("Заполнено дней", `${stats.filledDays} из ${totalDays}`)}
    </div>
  </section>`;
}

function analyticsHistoryView(history) {
  return `<section class="section-block">
    <h2>ИСТОРИЯ ПО ДНЯМ</h2>
    <div class="day-history">
      ${history.map(dayHistoryCard).join("")}
    </div>
  </section>`;
}

function dayHistoryCard(row) {
  const n = row.nutrients;
  return `<article class="day-history-card">
    <strong>${formatDayTitle(row.date)}</strong>
    <span>${round(n.calories)} ккал</span>
    <div class="entry-macros">
      <span>Б ${round(n.protein)}</span>
      <span>Ж ${round(n.fat)}</span>
      <span>У ${round(n.carbs)}</span>
    </div>
  </article>`;
}

function statCard(label, value) {
  return `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function entrySheet() {
  const product = selectedProduct();
  const isPiece = product?.type === "piece";
  if (isPiece) entryDraft.amount = Math.max(1, number(entryDraft.amount, 1));
  return `<div class="panel entry-sheet">
    <div class="sheet-head">
      <div>
        <span>Добавить в рацион</span>
        <h3>${labels.meals[entryDraft.meal]?.label || "Приём пищи"}</h3>
      </div>
      <button class="icon-btn compact neutral" data-action="close-entry" title="Закрыть">×</button>
    </div>
    <form class="form-grid" data-form="entry">
      <input type="hidden" name="meal" value="${entryDraft.meal}">
      <div class="field full"><label>Продукт</label><select name="productId" data-product-select>${productOptions(selectedProduct()?.id)}</select></div>
      ${isPiece ? pieceCounter(entryDraft.amount) : amountField()}
      <div class="field full"><button class="primary-btn" type="submit">Готово</button></div>
    </form>
  </div>`;
}

function screenAdd() {
  return `<section class="screen ${activeScreen === "add" ? "active" : ""}">
    <div class="stack">
      <header class="screen-header">
        <span>ДОБАВЛЕНИЕ</span>
        <h1>Добавить еду</h1>
      </header>
      <div class="segmented">
        <button class="${addPanelMode === "existing" ? "active" : ""}" data-add-panel="existing">В рацион</button>
        <button class="${addPanelMode === "new" ? "active" : ""}" data-add-panel="new">Новый продукт</button>
      </div>
      ${entrySheetOpen ? entrySheet() : addPanelMode === "new" ? manualProductForm() : existingProductPanel()}
    </div>
  </section>`;
}

function existingProductPanel() {
  const product = selectedProduct();
  const isPiece = product?.type === "piece";
  if (isPiece) entryDraft.amount = Math.max(1, number(entryDraft.amount, 1));
  if (!state.products.length) {
    return `<div class="big-empty">
      <div>
        <strong>Нет продуктов</strong>
        <span>Создайте первый продукт, чтобы добавить его в рацион.</span>
        <button class="primary-btn" data-add-panel="new" type="button">Создать продукт</button>
      </div>
    </div>`;
  }
  return `<div class="panel">
    ${frequentProductsSection()}
    <div class="segmented meal-segments">
      ${Object.entries(labels.meals).map(([id, data]) => `<button class="${entryDraft.meal === id ? "active" : ""}" data-add-meal="${id}">${data.short}</button>`).join("")}
    </div>
    <form class="form-grid add-entry-form" data-form="entry">
      <input type="hidden" name="meal" value="${entryDraft.meal}">
      <div class="field full"><label>Продукт</label><select name="productId" data-product-select>${productOptions(selectedProduct()?.id)}</select></div>
      ${isPiece ? pieceCounter(entryDraft.amount) : amountField()}
      <div class="field full"><button class="primary-btn" type="submit">Готово</button></div>
    </form>
  </div>`;
}

function frequentProductsSection() {
  const products = frequentProducts();
  if (!products.length) return "";
  return `<div class="frequent-block">
    <div class="section-title compact-title"><h2>Часто используемые</h2><span>ТОП-${products.length}</span></div>
    <div class="frequent-list">
      ${products.map((product) => `<button type="button" class="frequent-chip" data-quick-product="${product.id}">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${product.uses} раз</span>
      </button>`).join("")}
    </div>
  </div>`;
}

function manualProductForm() {
  return `<div class="panel">
    <form class="form-grid" data-form="product">
      <div class="field full"><label>Название</label><input name="name" placeholder="Спагетти" enterkeyhint="next" required></div>
      <div class="field full"><label>Тип продукта</label><select name="type">${Object.entries(labels.productTypes).map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></div>
      <div class="field"><label>Калории</label><input name="calories" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="ккал"></div>
      <div class="field"><label>Белки</label><input name="protein" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г"></div>
      <div class="field"><label>Жиры</label><input name="fat" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г"></div>
      <div class="field"><label>Углеводы</label><input name="carbs" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г"></div>
      <div class="field cooked-field"><label>Сухой вес, г</label><input name="cookedDryWeight" type="number" step="1" inputmode="numeric" placeholder="100"></div>
      <div class="field cooked-field"><label>Готовый вес, г</label><input name="cookedReadyWeight" type="number" step="1" inputmode="numeric" placeholder="230"></div>
      <div class="field full"><button class="primary-btn" type="submit">Сохранить продукт</button></div>
    </form>
  </div>`;
}

function amountField() {
  return `<div class="field full" data-amount-wrap><label>Вес, г</label><input name="amount" type="number" min="1" step="0.1" inputmode="decimal" enterkeyhint="done" placeholder="Введите вес" value="${entryDraft.amount || ""}"></div>`;
}

function pieceCounter(value) {
  const amount = Math.max(1, number(value, 1));
  return `<div class="field full" data-amount-wrap><label>Количество</label>
    <div class="counter">
      <button type="button" class="counter-btn" data-piece-step="-1">−</button>
      <strong>${amount}</strong>
      <button type="button" class="counter-btn" data-piece-step="1">+</button>
      <input type="hidden" name="amount" value="${amount}">
    </div>
  </div>`;
}

function screenFavorites() {
  const products = filteredFavorites();
  return `<section class="screen ${activeScreen === "favorites" ? "active" : ""}">
    <div class="stack">
      <header class="screen-header"><h1>Избранное</h1><p>Ваш личный каталог продуктов</p></header>
      <input class="search-input" data-favorites-query value="${escapeHtml(favoritesQuery)}" placeholder="Поиск">
      <div class="list" data-favorites-list>${products.length ? products.map(productRow).join("") : `<div class="empty big-empty">Пока ничего не добавлено.</div>`}</div>
    </div>
  </section>`;
}

function productRow(product) {
  return `<div class="product-row item-card">
    <div>
      <strong>${escapeHtml(product.name)}</strong>
      <span>${labels.productTypes[product.type]} · ${round(product.calories)} ккал · Б ${round(product.protein)} Ж ${round(product.fat)} У ${round(product.carbs)}</span>
    </div>
    <button class="icon-btn compact" data-delete-product="${product.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function screenProfile(targets) {
  const p = state.profile;
  return `<section class="screen ${activeScreen === "profile" ? "active" : ""}">
    <form class="stack" data-form="profile">
      <header class="screen-header profile-title"><span>ВАШИ НАСТРОЙКИ</span><h1>Профиль</h1></header>
      ${profileCard(targets)}
      <div class="panel">
        <div class="section-title"><h2>ОСНОВНЫЕ ДАННЫЕ</h2></div>
        <div class="form-grid profile-fields">
          <div class="field full"><label>Имя</label><input name="name" value="${escapeHtml(p.name || currentUser.name || "")}" placeholder="Ваше имя" enterkeyhint="next"></div>
          <div class="field"><label>Возраст</label><input name="age" type="number" inputmode="numeric" value="${p.age || ""}" placeholder="28" enterkeyhint="next"></div>
          <div class="field"><label>Пол</label><select name="sex">${option("", "Не выбран", p.sex)}${option("female", "Женский", p.sex)}${option("male", "Мужской", p.sex)}${option("other", "Другой", p.sex)}</select></div>
          <div class="field"><label>Рост, см</label><input name="height" type="number" inputmode="numeric" value="${p.height || ""}" placeholder="170" enterkeyhint="next"></div>
          <div class="field"><label>Вес, кг</label><input name="weight" type="number" inputmode="decimal" step="0.1" value="${p.weight || ""}" placeholder="75" enterkeyhint="next"></div>
          <div class="field"><label>Цель, кг</label><input name="targetWeight" type="number" inputmode="decimal" step="0.1" value="${p.targetWeight || ""}" placeholder="80" enterkeyhint="next"></div>
          <div class="field full"><label>Активность</label><select name="activity">${option("", "Не выбрана", p.activity)}${Object.entries(labels.activities).map(([id, label]) => option(id, label, p.activity)).join("")}</select></div>
        </div>
      </div>
      ${weightHistoryPanel()}
      ${targetsPanel(targets)}
      ${achievementsPanel()}
      ${profileWaterPanel()}
      <button class="primary-btn sticky-save" type="submit">Сохранить</button>
      <div class="profile-app-info">
        <span>Eighty v2.2.4</span>
        <span>© 2026 by Егор Галкин</span>
      </div>
    </form>
  </section>`;
}

function profileCard(targets) {
  const name = currentUser.name || state.profile.name || "Пользователь";
  const photo = currentUser.photoUrl || state.telegram.photoUrl;
  const goal = state.profile.targetMode === "manual" ? "Ручной КБЖУ" : labels.goals[state.profile.goalMode];
  const goalLine = targets.complete ? `${goal} · ${round(targets.calories)} ккал` : "Заполните данные для расчёта";
  const current = currentWeight();
  const target = number(state.profile.targetWeight);
  const remaining = current > 0 && target > 0 ? Math.abs(current - target) : 0;
  const reached = targetReached();
  return `<div class="profile-card">
    <div class="profile-main">
      <div class="avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : `<span>${escapeHtml(name.slice(0, 1).toUpperCase())}</span>`}</div>
      <div>
        <span>Текущая цель</span>
        <h2>${escapeHtml(name)}</h2>
        <p>${goalLine}</p>
      </div>
    </div>
    <div class="weight-goal-grid">
      ${smallStat("Текущий вес", current > 0 ? `${round(current, 1)} кг` : "—")}
      ${smallStat("Цель", target > 0 ? `${round(target, 1)} кг` : "—")}
      ${smallStat("Осталось", reached ? "🎉 Цель достигнута" : remaining > 0 ? `${round(remaining, 1)} кг` : "—")}
    </div>
    <div class="profile-targets">
      ${smallStat("Калории", targetValue(targets.calories))}
      ${smallStat("Белки", targetValue(targets.protein, "г"))}
      ${smallStat("Жиры", targetValue(targets.fat, "г"))}
      ${smallStat("Углеводы", targetValue(targets.carbs, "г"))}
    </div>
  </div>`;
}

function weightHistoryPanel() {
  const rows = [...state.weightLogs]
    .filter((item) => number(item.weight) > 0 && item.date)
    .sort((a, b) => weightEntryTimestamp(b) - weightEntryTimestamp(a));
  return `<div class="panel">
    <div class="section-title"><h2>История веса</h2><span>${rows.length} записей</span></div>
    <div class="form-grid weight-add-form" data-weight-form>
      <div class="field"><label>Дата</label><input name="date" type="date" value="${todayIso()}"></div>
      <div class="field"><label>Вес, кг</label><input name="weight" type="number" inputmode="decimal" step="0.1" placeholder="98"></div>
      <div class="field full"><button class="secondary-btn" type="button" data-action="add-weight">Добавить вес</button></div>
    </div>
    <div class="weight-history-list">
      ${rows.length ? rows.map(weightHistoryRow).join("") : `<div class="empty-line">История веса пока пустая</div>`}
    </div>
  </div>`;
}

function weightHistoryRow(item) {
  return `<div class="weight-row">
    <strong>${formatDateTime(weightEntryTime(item))}</strong>
    <span>${round(item.weight, 1)} кг</span>
  </div>`;
}

function achievementsPanel() {
  const items = achievementDefinitions();
  return `<div class="panel">
    <div class="section-title"><h2>Достижения</h2><span>${earnedAchievementCount()} / ${items.length}</span></div>
    <div class="achievements-list">
      ${items.map(achievementCard).join("")}
    </div>
  </div>`;
}

function achievementCard(item) {
  const done = isAchievementUnlocked(item.id);
  const progress = done ? 100 : clamp(item.value / Math.max(1, item.target) * 100, 0, 100);
  const value = item.id.startsWith("loss") ? round(item.value, 1) : round(item.value);
  return `<div class="achievement-card ${done ? "done" : ""}">
    <div>
      <strong>${item.title}</strong>
      <span>${done ? "Получено ✅" : `${value} / ${item.target}`}</span>
    </div>
    <div class="progress" style="--value:${progress}%"><i></i></div>
  </div>`;
}

function targetsPanel(targets) {
  const p = state.profile;
  return `<div class="panel">
    <div class="section-title"><h2>КБЖУ</h2><span>${!targets.complete ? "Заполните данные" : targets.manual ? "Ручной режим" : `BMR ${round(targets.bmr)} ккал`}</span></div>
    <div class="segmented">
      <label><input type="radio" name="targetMode" value="auto" ${p.targetMode !== "manual" ? "checked" : ""}>Автоматический расчёт</label>
      <label><input type="radio" name="targetMode" value="manual" ${p.targetMode === "manual" ? "checked" : ""}>Ручной режим</label>
    </div>
    ${p.targetMode === "manual" ? manualTargetsFields(p) : autoTargetsFields(p)}
    <div class="target-grid">${targetCards(targets)}</div>
    <button class="secondary-btn recalc-btn" type="button" data-action="recalculate">Обновить расчёт</button>
  </div>`;
}

function autoTargetsFields(p) {
  return `<div class="form-grid target-controls">
    <div class="field"><label>Цель</label><select name="goalMode">${Object.entries(labels.goals).map(([id, label]) => option(id, label, p.goalMode)).join("")}</select></div>
    ${goalControls(p)}
    <input type="hidden" name="manualCalories" value="${p.manualTargets.calories}">
    <input type="hidden" name="manualProtein" value="${p.manualTargets.protein}">
    <input type="hidden" name="manualFat" value="${p.manualTargets.fat}">
    <input type="hidden" name="manualCarbs" value="${p.manualTargets.carbs}">
  </div>`;
}

function manualTargetsFields(p) {
  return `<div class="form-grid target-controls">
    <input type="hidden" name="goalMode" value="${p.goalMode}">
    <input type="hidden" name="deficitPercent" value="${p.deficitPercent}">
    <input type="hidden" name="surplusPercent" value="${p.surplusPercent}">
    <div class="field"><label>Калории</label><input name="manualCalories" type="number" inputmode="numeric" value="${p.manualTargets.calories || ""}" placeholder="1500"></div>
    <div class="field"><label>Белки</label><input name="manualProtein" type="number" inputmode="decimal" step="0.1" value="${p.manualTargets.protein || ""}" placeholder="100"></div>
    <div class="field"><label>Жиры</label><input name="manualFat" type="number" inputmode="decimal" step="0.1" value="${p.manualTargets.fat || ""}" placeholder="45"></div>
    <div class="field"><label>Углеводы</label><input name="manualCarbs" type="number" inputmode="decimal" step="0.1" value="${p.manualTargets.carbs || ""}" placeholder="140"></div>
  </div>`;
}

function goalControls(p) {
  if (p.goalMode === "loss") {
    return `<div class="field"><label>Дефицит %</label><select name="deficitPercent">${[10, 15, 20, 25, 30].map((v) => option(String(v), `${v}%`, String(p.deficitPercent))).join("")}</select><input type="hidden" name="surplusPercent" value="${p.surplusPercent}"></div>`;
  }
  if (p.goalMode === "gain") {
    return `<div class="field"><label>Профицит %</label><select name="surplusPercent">${[5, 10, 15].map((v) => option(String(v), `${v}%`, String(p.surplusPercent))).join("")}</select><input type="hidden" name="deficitPercent" value="${p.deficitPercent}"></div>`;
  }
  return `<input type="hidden" name="deficitPercent" value="${p.deficitPercent}"><input type="hidden" name="surplusPercent" value="${p.surplusPercent}">`;
}

function targetCards(targets) {
  return `
    ${smallStat("Калории", targetValue(targets.calories))}
    ${smallStat("Белки", targetValue(targets.protein, "г"))}
    ${smallStat("Жиры", targetValue(targets.fat, "г"))}
    ${smallStat("Углеводы", targetValue(targets.carbs, "г"))}`;
}

function profileWaterPanel() {
  const auto = !state.settings.waterManual;
  return `<div class="panel" data-profile-water>
    <div class="section-title"><h2>Вода</h2><span data-water-goal-label>${round(waterGoal() / 1000, 1)} л в день</span></div>
    <label class="check-row"><input name="waterAuto" type="checkbox" ${auto ? "checked" : ""}><span>Автоматический расчёт</span></label>
    <div class="field"><label>Своя цель воды, мл</label><input name="waterGoal" type="number" inputmode="numeric" value="${state.settings.waterGoal || ""}" placeholder="2200" enterkeyhint="done" ${auto ? "disabled" : ""}></div>
    <div class="water-help">
      <span data-water-mode>${auto ? "Автоматический расчёт" : "Ручной режим"}</span>
      <p data-water-formula>${waterFormulaText()}</p>
      <p data-water-range>${waterRangeText()}</p>
    </div>
  </div>`;
}

function smallStat(label, value) {
  return `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function productOptions(selected, products = state.products) {
  return products.length
    ? products.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")
    : `<option value="">Нет продуктов</option>`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.append(node);
  setTimeout(() => node.remove(), 1800);
}

app.addEventListener("submit", (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  const type = form.dataset.form;
  if (type === "entry") addEntry(form);
  if (type === "product") addProduct(form);
  if (type === "water") addWaterManual(form);
  if (type === "water-history") saveWaterHistory(form);
  if (type === "profile") saveProfile(form);
  if (type === "weight") addWeight(form);
});

app.addEventListener("click", (event) => {
  if (event.target.dataset.modalClose === "water") {
    waterHistoryOpen = false;
    render();
    return;
  }
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.keyboardDone) {
    blurActive();
    setKeyboardMode(false);
    return;
  }
  if (button.dataset.screen) setScreen(button.dataset.screen);
  if (button.dataset.action === "prev-date") changeDate(-1);
  if (button.dataset.action === "next-date") changeDate(1);
  if (button.dataset.action === "recalculate") {
    const form = button.closest("form");
    if (form) recalculateProfile(form);
  }
  if (button.dataset.action === "add-weight") {
    if (skipNextAddWeightClick) {
      skipNextAddWeightClick = false;
      return;
    }
    handleAddWeightButton(button);
  }
  if (button.dataset.action === "close-entry") {
    entrySheetOpen = false;
    render();
  }
  if (button.dataset.action === "water-history") {
    waterHistoryOpen = true;
    render();
  }
  if (button.dataset.action === "close-water-history") {
    waterHistoryOpen = false;
    render();
  }
  if (button.dataset.openAdd) openAdd(button.dataset.openAdd);
  if (button.dataset.water) addWater(number(button.dataset.water));
  if (button.dataset.deleteEntry) deleteEntry(button.dataset.deleteEntry);
  if (button.dataset.deleteProduct) deleteProduct(button.dataset.deleteProduct);
  if (button.dataset.deleteWater) deleteWaterEntry(button.dataset.deleteWater);
  if (button.dataset.range) {
    analyticsRange = button.dataset.range;
    render();
  }
  if (button.dataset.analyticsStep) {
    analyticsDate = clampAnalyticsDate(addDays(analyticsDate, number(button.dataset.analyticsStep)));
    render();
  }
  if (button.dataset.addPanel) {
    addPanelMode = button.dataset.addPanel;
    entrySheetOpen = false;
    render();
  }
  if (button.dataset.quickProduct) {
    entryDraft.productId = button.dataset.quickProduct;
    entrySheetOpen = true;
    addPanelMode = "existing";
    render();
  }
  if (button.dataset.addMeal) {
    entryDraft.meal = button.dataset.addMeal;
    render();
  }
  if (button.dataset.pieceStep) {
    entryDraft.amount = Math.max(1, number(entryDraft.amount, 1) + number(button.dataset.pieceStep));
    render();
  }
});

app.addEventListener("pointerdown", (event) => {
  const button = event.target.closest('button[data-action="add-weight"]');
  if (!button) return;
  event.preventDefault();
  skipNextAddWeightClick = true;
  handleAddWeightButton(button);
  setTimeout(() => {
    skipNextAddWeightClick = false;
  }, 500);
});

app.addEventListener("change", (event) => {
  const target = event.target;
  const entryForm = target.closest('form[data-form="entry"]');
  if (entryForm) {
    const data = new FormData(entryForm);
    entryDraft.productId = data.get("productId") || entryDraft.productId;
    const product = selectedProduct();
    entryDraft.amount = product?.type === "piece" ? 1 : "";
    render();
    return;
  }

  const productForm = target.closest('form[data-form="product"]');
  if (productForm && target.name === "type") productForm.classList.toggle("cooked-mode", target.value === "cooked");

  const profileForm = target.closest('form[data-form="profile"]');
  if (profileForm && ["goalMode", "targetMode"].includes(target.name)) {
    syncProfileFromForm(profileForm);
    render();
  }
  if (profileForm && ["waterAuto", "activity"].includes(target.name)) {
    updateProfileWaterFromForm(profileForm);
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-favorites-query]")) {
    favoritesQuery = target.value;
    const list = app.querySelector("[data-favorites-list]");
    const products = filteredFavorites();
    if (list) {
      list.innerHTML = products.length
        ? products.map(productRow).join("")
        : `<div class="empty big-empty">Пока ничего не добавлено.</div>`;
    }
    return;
  }
  const entryForm = target.closest('form[data-form="entry"]');
  if (entryForm && target.name === "amount") entryDraft.amount = target.value;

  const profileForm = target.closest('form[data-form="profile"]');
  if (profileForm && ["weight", "waterGoal"].includes(target.name)) {
    updateProfileWaterFromForm(profileForm);
  }
});

setupKeyboardBehavior();

bootstrap().catch((error) => {
  app.innerHTML = `<div class="boot-screen"><div class="brand-mark">80</div><div><strong>Не удалось запустить Eighty</strong><span>${escapeHtml(error.message)}</span></div></div>`;
});
