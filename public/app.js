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
    weightLogs: localState.weightLogs || serverState.weightLogs || []
  };
}

function ensureShape() {
  state ||= {};
  state.version = 4;
  state.createdAt ||= new Date().toISOString();
  state.profile = {
    name: currentUser.name || "Пользователь",
    sex: "female",
    age: 28,
    height: 170,
    weight: 75,
    targetWeight: 65,
    activity: "low",
    goalMode: "loss",
    targetMode: "auto",
    deficitPercent: 15,
    surplusPercent: 10,
    manualTargets: {
      calories: 1500,
      protein: 100,
      fat: 45,
      carbs: 140
    },
    ...(state.profile || {})
  };
  state.profile.targetMode ||= state.profile.goalMode === "manual" ? "manual" : "auto";
  if (state.profile.goalMode === "manual") state.profile.goalMode = "loss";
  state.profile.manualTargets = {
    calories: 1500,
    protein: 100,
    fat: 45,
    carbs: 140,
    ...(state.profile.manualTargets || {})
  };
  if (number(state.profile.manualTargets.calories) <= 0) state.profile.manualTargets.calories = 1500;
  if (number(state.profile.manualTargets.protein) <= 0) state.profile.manualTargets.protein = 100;
  if (number(state.profile.manualTargets.fat) <= 0) state.profile.manualTargets.fat = 45;
  if (number(state.profile.manualTargets.carbs) <= 0) state.profile.manualTargets.carbs = 140;

  state.settings = {
    waterEnabled: true,
    waterManual: false,
    waterGoal: 2200,
    ...(state.settings || {})
  };
  state.products ||= [];
  state.diary ||= {};
  state.water ||= {};
  state.weightLogs ||= [];
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
  if (!state.weightLogs.length) state.weightLogs.push({ date: selectedDate, weight: state.profile.weight });
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
    return {
      bmr: 0,
      maintenance: 0,
      calories: number(p.manualTargets.calories),
      protein: number(p.manualTargets.protein),
      fat: number(p.manualTargets.fat),
      carbs: number(p.manualTargets.carbs),
      manual: true
    };
  }

  const weight = number(p.weight, 75);
  const height = number(p.height, 170);
  const age = number(p.age, 28);
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
  return { bmr, maintenance, calories, protein, fat, carbs, manual: false };
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

function currentWeight() {
  const sorted = [...state.weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  return number(sorted.at(-1)?.weight, state.profile.weight);
}

function waterGoal() {
  if (state.settings.waterManual) return number(state.settings.waterGoal, 2200);
  return Math.round(currentWeight() * 30 / 50) * 50;
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
  state.water[selectedDate] = Math.max(0, number(state.water[selectedDate]) + ml);
  persist();
  render();
}

function addWaterManual(form) {
  const amount = number(new FormData(form).get("waterAmount"));
  if (amount <= 0) return toast("Введите количество воды");
  addWater(amount);
  blurActive();
  form.reset();
}

function syncProfileFromForm(form) {
  const data = new FormData(form);
  const p = state.profile;
  p.name = String(data.get("name") || "").trim() || state.telegram.name || "Пользователь";
  p.sex = data.get("sex") || "female";
  p.age = number(data.get("age"), p.age);
  p.height = number(data.get("height"), p.height);
  p.weight = number(data.get("weight"), p.weight);
  p.targetWeight = number(data.get("targetWeight"), p.targetWeight);
  p.activity = data.get("activity") || "low";
  p.goalMode = data.get("goalMode") || "loss";
  p.targetMode = data.get("targetMode") || "auto";
  p.deficitPercent = number(data.get("deficitPercent"), p.deficitPercent);
  p.surplusPercent = number(data.get("surplusPercent"), p.surplusPercent);
  p.manualTargets.calories = number(data.get("manualCalories"), p.manualTargets.calories);
  p.manualTargets.protein = number(data.get("manualProtein"), p.manualTargets.protein);
  p.manualTargets.fat = number(data.get("manualFat"), p.manualTargets.fat);
  p.manualTargets.carbs = number(data.get("manualCarbs"), p.manualTargets.carbs);
  state.settings.waterManual = data.get("waterManual") === "on";
  state.settings.waterGoal = number(data.get("waterGoal"), state.settings.waterGoal);
}

function saveProfile(form) {
  syncProfileFromForm(form);
  const existing = state.weightLogs.find((item) => item.date === selectedDate);
  if (existing) existing.weight = state.profile.weight;
  else state.weightLogs.push({ date: selectedDate, weight: state.profile.weight });
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
  const data = new FormData(form);
  const date = data.get("date");
  const weight = number(data.get("weight"));
  if (!date || weight <= 0) return toast("Введите вес");
  const existing = state.weightLogs.find((item) => item.date === date);
  if (existing) existing.weight = weight;
  else state.weightLogs.push({ date, weight });
  state.profile.weight = currentWeight();
  blurActive();
  persist();
  render();
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
  const calorieProgress = clamp(consumed.calories / Math.max(1, targets.calories) * 100, 0, 100);
  return `<section class="screen ${activeScreen === "diary" ? "active" : ""}">
    <div class="stack">
      <header class="app-header">
        <div class="brand-mark">80</div>
        <div>
          <h1>Eighty</h1>
          <p>Твой путь к цели. Контроль питания, веса и прогресса.</p>
        </div>
      </header>
      <div class="hello-card">Привет, ${escapeHtml(currentUser.name || state.profile.name || "Пользователь")}!</div>
      ${dayCard()}
      ${energyCard(targets, consumed, remaining, calorieProgress)}
      ${mealsSection()}
      ${entrySheetOpen ? entrySheet() : ""}
      ${waterSection()}
    </div>
  </section>`;
}

function dayCard() {
  const count = entriesForDate().length;
  const isToday = selectedDate >= todayIso();
  return `<div class="day-wrap">
    <div class="day-actions">
      <button class="icon-btn" data-action="prev-date" title="Предыдущий день">${icons.prev}</button>
      <button class="icon-btn" data-action="next-date" title="Следующий день" ${isToday ? "disabled" : ""}>${icons.next}</button>
    </div>
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
      <p>Суточная цель — ${round(targets.calories)} ккал</p>
      ${macroLine("Белки", consumed.protein, targets.protein, "protein")}
      ${macroLine("Жиры", consumed.fat, targets.fat, "fat")}
      ${macroLine("Углеводы", consumed.carbs, targets.carbs, "carbs")}
    </div>
  </div>`;
}

function macroLine(label, value, target, kind) {
  const progress = clamp(value / Math.max(1, target) * 100, 0, 100);
  return `<div class="macro-line ${kind}">
    <div><span>${label}</span><b>${round(value)} / ${round(target)} г</b></div>
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
  const water = number(state.water[selectedDate]);
  const goal = waterGoal();
  return `<section class="water-card">
    <div class="section-title"><h2>Вода</h2><span>${round(water / 1000, 1)} / ${round(goal / 1000, 1)} л</span></div>
    <div class="progress large water" style="--value:${clamp(water / Math.max(1, goal) * 100, 0, 100)}%"><i></i></div>
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
      <div class="stat-grid">
        ${statCard("Средние калории", `${round(stats.calories)} ккал`)}
        ${statCard("Средние белки", `${round(stats.protein)} г`)}
        ${statCard("Средние жиры", `${round(stats.fat)} г`)}
        ${statCard("Средние углеводы", `${round(stats.carbs)} г`)}
      </div>
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
  for (const row of history) {
    if (!row.count) continue;
    totals.calories += row.nutrients.calories;
    totals.protein += row.nutrients.protein;
    totals.fat += row.nutrients.fat;
    totals.carbs += row.nutrients.carbs;
    counted++;
  }
  const divisor = Math.max(1, counted);
  return {
    calories: totals.calories / divisor,
    protein: totals.protein / divisor,
    fat: totals.fat / divisor,
    carbs: totals.carbs / divisor
  };
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
      ${addPanelMode === "new" ? manualProductForm() : existingProductPanel()}
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
          <div class="field"><label>Пол</label><select name="sex">${option("female", "Женский", p.sex)}${option("male", "Мужской", p.sex)}${option("other", "Другой", p.sex)}</select></div>
          <div class="field"><label>Рост, см</label><input name="height" type="number" inputmode="numeric" value="${p.height || ""}" placeholder="170" enterkeyhint="next"></div>
          <div class="field"><label>Вес, кг</label><input name="weight" type="number" inputmode="decimal" step="0.1" value="${p.weight || ""}" placeholder="75" enterkeyhint="next"></div>
          <div class="field full"><label>Активность</label><select name="activity">${Object.entries(labels.activities).map(([id, label]) => option(id, label, p.activity)).join("")}</select></div>
        </div>
      </div>
      ${targetsPanel(targets)}
      ${profileWaterPanel()}
      <button class="primary-btn sticky-save" type="submit">Сохранить</button>
      <div class="profile-app-info">
        <span>Eighty v2.1.0</span>
        <span>© 2026 by Егор Галкин</span>
      </div>
    </form>
  </section>`;
}

function profileCard(targets) {
  const name = currentUser.name || state.profile.name || "Пользователь";
  const photo = currentUser.photoUrl || state.telegram.photoUrl;
  const goal = state.profile.targetMode === "manual" ? "Ручной КБЖУ" : labels.goals[state.profile.goalMode];
  return `<div class="profile-card">
    <div class="profile-main">
      <div class="avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : `<span>${escapeHtml(name.slice(0, 1).toUpperCase())}</span>`}</div>
      <div>
        <span>Текущая цель</span>
        <h2>${escapeHtml(name)}</h2>
        <p>${goal} · ${round(targets.calories)} ккал</p>
      </div>
    </div>
    <div class="profile-targets">
      ${smallStat("Калории", round(targets.calories))}
      ${smallStat("Белки", `${round(targets.protein)} г`)}
      ${smallStat("Жиры", `${round(targets.fat)} г`)}
      ${smallStat("Углеводы", `${round(targets.carbs)} г`)}
    </div>
  </div>`;
}

function targetsPanel(targets) {
  const p = state.profile;
  return `<div class="panel">
    <div class="section-title"><h2>КБЖУ</h2><span>${targets.manual ? "Ручной режим" : `BMR ${round(targets.bmr)} ккал`}</span></div>
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
    ${smallStat("Калории", round(targets.calories))}
    ${smallStat("Белки", `${round(targets.protein)} г`)}
    ${smallStat("Жиры", `${round(targets.fat)} г`)}
    ${smallStat("Углеводы", `${round(targets.carbs)} г`)}`;
}

function profileWaterPanel() {
  return `<div class="panel">
    <div class="section-title"><h2>Вода</h2><span>${round(waterGoal() / 1000, 1)} л в день</span></div>
    <label class="check-row"><input name="waterManual" type="checkbox" ${state.settings.waterManual ? "checked" : ""}><span>Задать цель вручную</span></label>
    <div class="field"><label>Цель воды, мл</label><input name="waterGoal" type="number" inputmode="numeric" value="${state.settings.waterGoal || ""}" placeholder="2200" enterkeyhint="done"></div>
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
  if (type === "profile") saveProfile(form);
  if (type === "weight") addWeight(form);
});

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.screen) setScreen(button.dataset.screen);
  if (button.dataset.action === "prev-date") changeDate(-1);
  if (button.dataset.action === "next-date") changeDate(1);
  if (button.dataset.action === "recalculate") {
    const form = button.closest("form");
    if (form) recalculateProfile(form);
  }
  if (button.dataset.action === "close-entry") {
    entrySheetOpen = false;
    render();
  }
  if (button.dataset.openAdd) openAdd(button.dataset.openAdd);
  if (button.dataset.water) addWater(number(button.dataset.water));
  if (button.dataset.deleteEntry) deleteEntry(button.dataset.deleteEntry);
  if (button.dataset.deleteProduct) deleteProduct(button.dataset.deleteProduct);
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
});

bootstrap().catch((error) => {
  app.innerHTML = `<div class="boot-screen"><div class="brand-mark">80</div><div><strong>Не удалось запустить Eighty</strong><span>${escapeHtml(error.message)}</span></div></div>`;
});
