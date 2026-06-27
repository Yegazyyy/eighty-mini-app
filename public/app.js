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

const eightyFoodCategories = [
  {
    id: "vegetables",
    icon: "🥬",
    label: "Овощи",
    products: [
      ["cucumber", "Огурец", 15, 0.7, 0.1, 3.6],
      ["tomato", "Помидор", 18, 0.9, 0.2, 3.9],
      ["potato", "Картофель", 77, 2.0, 0.1, 17.5],
      ["carrot", "Морковь", 41, 0.9, 0.2, 9.6],
      ["onion", "Лук репчатый", 40, 1.1, 0.1, 9.3],
      ["white-cabbage", "Капуста белокочанная", 25, 1.3, 0.1, 5.8],
      ["bell-pepper", "Болгарский перец", 31, 1.0, 0.3, 6.0],
      ["zucchini", "Кабачок", 24, 0.6, 0.3, 4.6],
      ["beetroot", "Свёкла", 43, 1.6, 0.2, 9.6],
      ["broccoli", "Брокколи", 34, 2.8, 0.4, 6.6],
      ["cauliflower", "Цветная капуста", 25, 1.9, 0.3, 5.0],
      ["radish", "Редис", 16, 0.7, 0.1, 3.4]
    ]
  },
  {
    id: "fruits",
    icon: "🍎",
    label: "Фрукты",
    products: [
      ["apple", "Яблоко", 52, 0.3, 0.2, 13.8],
      ["banana", "Банан", 89, 1.1, 0.3, 22.8],
      ["pear", "Груша", 57, 0.4, 0.1, 15.2],
      ["orange", "Апельсин", 47, 0.9, 0.1, 11.8],
      ["mandarin", "Мандарин", 53, 0.8, 0.3, 13.3],
      ["kiwi", "Киви", 61, 1.1, 0.5, 14.7],
      ["grapes", "Виноград", 69, 0.7, 0.2, 18.1],
      ["lemon", "Лимон", 29, 1.1, 0.3, 9.3],
      ["peach", "Персик", 39, 0.9, 0.3, 9.5],
      ["apricot", "Абрикос", 48, 1.4, 0.4, 11.1],
      ["watermelon", "Арбуз", 30, 0.6, 0.2, 7.6],
      ["melon", "Дыня", 34, 0.8, 0.2, 8.2]
    ]
  },
  {
    id: "eggs",
    icon: "🥚",
    label: "Яйца",
    products: [
      ["chicken-egg", "Яйцо куриное", 143, 12.6, 9.5, 0.7],
      ["quail-egg", "Яйцо перепелиное", 158, 13.1, 11.1, 0.4]
    ]
  },
  {
    id: "mushrooms",
    icon: "🍄",
    label: "Грибы",
    products: [
      ["champignon", "Шампиньоны", 22, 3.1, 0.3, 3.3],
      ["oyster-mushroom", "Вешенки", 33, 3.3, 0.4, 6.1],
      ["porcini", "Белые грибы", 34, 3.7, 1.7, 1.1],
      ["chanterelle", "Лисички", 32, 1.5, 1.0, 3.1]
    ]
  }
];

const eightyFoods = eightyFoodCategories.flatMap((category) => category.products.map(([id, name, calories, protein, fat, carbs]) => ({
  id: `eighty-${id}`,
  sourceId: `eighty-${id}`,
  categoryId: category.id,
  categoryLabel: category.label,
  categoryIcon: category.icon,
  name,
  type: "weight",
  calories,
  protein,
  fat,
  carbs
})));

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
    gain: "Набор массы",
    diary: "Просто вести дневник"
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
      icon: "🍽️",
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
  favorite: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m15 18-6-6 6-6"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>`,
  trash: `<span class="delete-minus" aria-hidden="true">−</span>`
};

let state = null;
let currentUser = { id: "demo-user", telegramId: "", name: "Пользователь", photoUrl: "" };
let activeScreen = "diary";
let tabIndicatorFromScreen = null;
let screenTransition = null;
let screenTransitionTimer = null;
let daySwipe = null;
let selectedDate = todayIso();
let saveTimer = null;
let analyticsDate = todayIso();
let analyticsView = "daily";
let analyticsPeriod = { type: "last7", start: "", end: "" };
let analyticsCustomDraft = { start: "", end: "" };
let periodSheetOpen = false;
let favoritesQuery = "";
let favoritesSort = "az";
let favoritesPage = "home";
let favoritesEightyCategoryId = "";
let favoritesEightyQuery = "";
let onboardingStep = 1;
let onboardingDraft = null;
let libraryEditor = null;
let deleteConfirm = null;
let entryDraft = { meal: "breakfast", items: {} };
let mealCartOpen = false;
let addPanelMode = "existing";
let addPage = "home";
let addCreateMenuOpen = false;
let addFoodSource = "mine";
let addFoodQuery = "";
let productCreateDraft = null;
let barcodeScannerOpen = false;
let barcodeScannerBusy = false;
let barcodeScannerMessage = "";
let barcodeScanner = null;
let barcodeScannerLibraryPromise = null;
let mealTemplatesVisible = true;
let templateSourceDate = todayIso();
let mealTemplateEditor = null;
let eightyCategoryId = "";
let eightyFoodDialog = null;
let eightyImport = { items: {}, query: "" };
let dishBuilder = null;
let ingredientPicker = { source: "mine", query: "", categoryId: "", items: {} };
let waterHistoryOpen = false;
let profileDetailsOpen = false;
let nutritionInfoOpen = false;
let remindersOpen = false;
let weightHistoryOpen = false;
let weightEditor = null;
let accountDeleteOpen = false;
let accountDeleteBusy = false;
let achievementsOpen = false;
let earnedAchievementsOpen = false;
let keyboardBaseHeight = window.visualViewport?.height || window.innerHeight;
let keyboardTimer = null;
let keyboardScrollTimer = null;

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
  activateTabIndicatorMotion();
  if (focused) scheduleFocusedControlScroll(document.activeElement, 80);
}

function focusScrollTarget(control) {
  return control.closest(".field, .reminder-setting-row, .product-choice-amount, .amount-card, .dish-ingredient-row, .water-history-row") || control;
}

function scrollFocusedControlIntoView(control) {
  if (!isFormControl(control)) return;

  const modal = control.closest(".modal-card");
  const target = focusScrollTarget(control);
  if (!modal) {
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    return;
  }

  const modalRect = modal.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const head = modal.querySelector(".modal-head");
  const actions = modal.querySelector(".modal-actions");
  const headHeight = head?.getBoundingClientRect().height || 0;
  const actionsHeight = actions?.getBoundingClientRect().height || 0;
  const topLimit = modalRect.top + headHeight + 12;
  const bottomLimit = modalRect.bottom - actionsHeight - 16;
  let delta = 0;

  if (targetRect.top < topLimit) delta = targetRect.top - topLimit;
  else if (targetRect.bottom > bottomLimit) delta = targetRect.bottom - bottomLimit;

  if (delta) modal.scrollBy({ top: delta, behavior: "smooth" });
}

function scheduleFocusedControlScroll(control = document.activeElement, delay = 120) {
  if (!isFormControl(control)) return;
  clearTimeout(keyboardScrollTimer);
  keyboardScrollTimer = setTimeout(() => {
    scrollFocusedControlIntoView(control);
  }, delay);
}

function setupKeyboardBehavior() {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", updateKeyboardMode);
  viewport?.addEventListener("scroll", updateKeyboardMode);
  window.addEventListener("resize", updateKeyboardMode);

  document.addEventListener("focusin", (event) => {
    if (!isFormControl(event.target)) return;
    setKeyboardMode(true, Math.max(0, keyboardBaseHeight - (viewport?.height || window.innerHeight)));
    clearTimeout(keyboardScrollTimer);
    keyboardScrollTimer = setTimeout(() => {
      updateKeyboardMode();
      scrollFocusedControlIntoView(event.target);
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
  const response = await fetch(apiUrl("/api/bootstrap"), {
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

function apiUrl(path) {
  const url = new URL(path, window.location.origin);
  if (!tg?.initData) {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["telegramId", "name", "photoUrl"]) {
      if (params.has(key)) url.searchParams.set(key, params.get(key));
    }
  }
  return url;
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
    dishes: localState.dishes || serverState.dishes || [],
    eightyOverrides: { ...(serverState.eightyOverrides || {}), ...(localState.eightyOverrides || {}) },
    diary: { ...(serverState.diary || {}), ...(localState.diary || {}) },
    water: { ...(serverState.water || {}), ...(localState.water || {}) },
    waterHistory: { ...(serverState.waterHistory || {}), ...(localState.waterHistory || {}) },
    weightLogs: localState.weightLogs || serverState.weightLogs || [],
    stats: { ...(serverState.stats || {}), ...(localState.stats || {}) },
    achievements: { ...(serverState.achievements || {}), ...(localState.achievements || {}) }
  };
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

function ensureShape() {
  state ||= {};
  state.version = 5;
  state.createdAt ||= new Date().toISOString();
  state.onboardingCompleted = Boolean(state.onboardingCompleted);
  const completed = state.onboardingCompleted;
  state.profile = {
    name: completed ? currentUser.name || "" : "",
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
    targetsPanelOpen: false,
    ...(state.settings || {})
  };
  state.settings.reminders = reminderSettings({
    ...(state.settings.reminders || {})
  });
  state.products ||= [];
  state.mealTemplates ||= [];
  state.eightyOverrides ||= {};
  state.dishes ||= [];
  state.dishes = state.dishes.map((dish) => ({
    ...dish,
    id: dish.id || uid(),
    ingredients: (dish.ingredients || []).map((ingredient) => ({
      id: ingredient.id || uid(),
      productId: ingredient.productId || "",
      amount: optionalNumber(ingredient.amount)
    }))
  }));
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
  if (!state.weightLogs.length && number(state.profile.weight) > 0) {
    const date = toIsoDate(new Date(state.createdAt || Date.now()));
    state.weightLogs.push({
      id: uid(),
      date,
      weight: number(state.profile.weight),
      createdAt: `${date}T00:00:00`
    });
  }
  state.profile.weight = number([...state.weightLogs].sort((a, b) => weightEntryTimestamp(a) - weightEntryTimestamp(b)).at(-1)?.weight) || "";
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
    name: completed ? currentUser.name || "" : "",
    telegramId: completed ? currentUser.telegramId || "" : "",
    photoUrl: completed ? currentUser.photoUrl || "" : "",
    ...(state.telegram || {})
  };
  if (!completed) {
    state.telegram = { name: "", telegramId: "", photoUrl: "" };
  } else {
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
  }
  updateStats();
  reconcileWeightAchievements();
  updateAchievements();
}

function persist(options = {}) {
  if (!options.skipEnsure) ensureShape();
  localStorage.setItem(stateKey, JSON.stringify(state));
  for (const key of legacyStateKeys) localStorage.removeItem(key);
  clearTimeout(saveTimer);

  const sync = async () => {
    const initData = tg?.initData || "";
    await fetch(apiUrl("/api/sync"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(initData ? { "X-Telegram-Init-Data": initData } : {})
      },
      body: JSON.stringify({ state })
    }).catch(() => {});
  };

  if (options.immediate) return sync();
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

function registrationIsoDate() {
  const raw = state?.createdAt || state?.accountResetAt || new Date().toISOString();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return todayIso();
  return toIsoDate(date);
}

function dayNavigationMinDate() {
  const today = todayIso();
  const registered = registrationIsoDate();
  return registered > today ? today : registered;
}

function analyticsMinDate() {
  return dayNavigationMinDate();
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

function formatRegistrationDate(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? formatDate(new Date()) : formatDate(date);
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

function pluralProduct(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} продукт`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} продукта`;
  return `${count} продуктов`;
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

  const weight = number(currentWeight());
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

function calcAutoNutritionModes() {
  const p = state.profile;
  const weight = number(currentWeight());
  const height = number(p.height);
  const age = number(p.age);
  const complete = weight > 0 && height > 0 && age > 0 && Boolean(p.sex) && Boolean(p.activity);
  if (!complete) {
    return { complete: false, bmr: 0, maintenance: 0, loss: 0, gain: 0 };
  }

  const sexOffset = p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
  const maintenance = bmr * (activityFactors[p.activity] || activityFactors.low);
  return {
    complete: true,
    bmr,
    maintenance,
    loss: maintenance * (1 - number(p.deficitPercent, 15) / 100),
    gain: maintenance * (1 + number(p.surplusPercent, 10) / 100)
  };
}

function ensureOnboardingDraft() {
  onboardingDraft ||= {
    name: currentUser.name && currentUser.name !== "Пользователь" ? currentUser.name : state.profile.name || "",
    age: state.profile.age || "",
    sex: state.profile.sex || "",
    height: state.profile.height || "",
    weight: currentWeight() || state.profile.weight || "",
    goalMode: state.profile.goalMode || "",
    targetWeight: state.profile.targetWeight || "",
    activity: state.profile.activity || ""
  };
  return onboardingDraft;
}

function onboardingNeedsTarget() {
  const draft = ensureOnboardingDraft();
  return ["loss", "gain"].includes(draft.goalMode);
}

function onboardingNextStep(step = onboardingStep) {
  if (step === 3 && !onboardingNeedsTarget()) return 5;
  return Math.min(6, step + 1);
}

function onboardingPreviousStep(step = onboardingStep) {
  if (step === 5 && !onboardingNeedsTarget()) return 3;
  return Math.max(1, step - 1);
}

function syncOnboardingForm(form) {
  if (!form) return;
  const draft = ensureOnboardingDraft();
  const data = new FormData(form);
  for (const key of ["name", "age", "sex", "height", "weight", "targetWeight"]) {
    if (data.has(key)) draft[key] = String(data.get(key) || "").trim();
  }
}

function validateOnboardingStep(step = onboardingStep) {
  const draft = ensureOnboardingDraft();
  if (step === 2) {
    if (!draft.name || number(draft.age) <= 0 || !draft.sex || number(draft.height) <= 0 || number(draft.weight) <= 0) {
      toast("Заполните все поля");
      return false;
    }
  }
  if (step === 3 && !draft.goalMode) {
    toast("Выберите цель");
    return false;
  }
  if (step === 4 && onboardingNeedsTarget() && number(draft.targetWeight) <= 0) {
    toast("Введите целевой вес");
    return false;
  }
  if (step === 5 && !draft.activity) {
    toast("Выберите активность");
    return false;
  }
  return true;
}

function focusOnboardingField() {
  setTimeout(() => {
    const field = app.querySelector("[data-onboarding-autofocus]");
    if (field instanceof HTMLElement) field.focus();
  }, 80);
}

function advanceOnboarding(form) {
  syncOnboardingForm(form);
  if (!validateOnboardingStep()) return;
  if (onboardingStep === 5) onboardingStep = 6;
  else onboardingStep = onboardingNextStep();
  render();
  focusOnboardingField();
}

function goBackOnboarding() {
  onboardingStep = onboardingPreviousStep();
  render();
  focusOnboardingField();
}

function selectOnboardingGoal(goal) {
  const draft = ensureOnboardingDraft();
  draft.goalMode = goal;
  if (!["loss", "gain"].includes(goal)) draft.targetWeight = draft.weight;
  render();
}

function selectOnboardingActivity(activity) {
  ensureOnboardingDraft().activity = activity;
  render();
}

function waterRateForActivity(activity) {
  return ({
    minimal: 30,
    low: 32,
    medium: 35,
    high: 38,
    veryHigh: 40
  })[activity] || 35;
}

function calcOnboardingResults() {
  const draft = ensureOnboardingDraft();
  const weight = number(draft.weight);
  const height = number(draft.height);
  const age = number(draft.age);
  const sexOffset = draft.sex === "male" ? 5 : draft.sex === "female" ? -161 : -78;
  const bmr = weight > 0 && height > 0 && age > 0 ? 10 * weight + 6.25 * height - 5 * age + sexOffset : 0;
  const maintenance = bmr * (activityFactors[draft.activity] || activityFactors.low);
  const multiplier = draft.goalMode === "loss" ? 0.85 : draft.goalMode === "gain" ? 1.1 : 1;
  const calories = maintenance * multiplier;
  const protein = weight * (draft.goalMode === "gain" ? 2 : draft.goalMode === "loss" ? 1.8 : 1.6);
  const fat = weight * (draft.goalMode === "loss" ? 0.8 : 0.9);
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  const water = Math.round(weight * waterRateForActivity(draft.activity) / 50) * 50;
  return { bmr, maintenance, calories, protein, fat, carbs, water };
}

function finishOnboarding() {
  const draft = ensureOnboardingDraft();
  const weight = number(draft.weight);
  const today = todayIso();
  state.createdAt ||= new Date().toISOString();
  state.onboardingCompleted = true;
  state.profile.name = draft.name;
  state.profile.age = number(draft.age);
  state.profile.sex = draft.sex;
  state.profile.height = number(draft.height);
  state.profile.weight = weight;
  state.profile.targetWeight = onboardingNeedsTarget() ? number(draft.targetWeight) : weight;
  state.profile.goalMode = draft.goalMode || "maintain";
  state.profile.targetMode = "auto";
  state.profile.activity = draft.activity;
  state.profile.deficitPercent = 15;
  state.profile.surplusPercent = 10;
  state.profile.manualTargets = { calories: "", protein: "", fat: "", carbs: "" };
  state.settings.waterManual = false;
  state.settings.waterGoal = calcOnboardingResults().water || number(state.settings.waterGoal, 2200);
  state.weightLogs = [{
    id: uid(),
    date: today,
    weight,
    createdAt: `${today}T00:00:00`
  }];
  activeScreen = "diary";
  onboardingDraft = null;
  onboardingStep = 1;
  persist({ immediate: true });
  render();
  toast("Eighty готов к работе");
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
    const dry = cookedWeightValue(product.cookedDryWeight, 100);
    const ready = cookedWeightValue(product.cookedReadyWeight, 230);
    factor = (qty * dry / ready) / 100;
  }
  return {
    calories: number(product.calories) * factor,
    protein: number(product.protein) * factor,
    fat: number(product.fat) * factor,
    carbs: number(product.carbs) * factor
  };
}

function productById(id) {
  return state.products.find((product) => product.id === id);
}

function ingredientItemById(id, ownerDishId = "") {
  const product = productById(id);
  if (product) return product;
  const dish = state.dishes.find((item) => item.id === id && item.id !== ownerDishId);
  return dish ? dishAsProduct(dish) : null;
}

function calcDish(dish) {
  const ingredients = (dish.ingredients || [])
    .map((ingredient) => {
      const product = ingredientItemById(ingredient.productId, dish.id);
      const amount = number(ingredient.amount);
      return product && amount > 0 ? { ingredient, product, amount, nutrients: calcProduct(product, amount) } : null;
    })
    .filter(Boolean);
  const totalWeight = ingredients.reduce((sum, item) => sum + item.amount, 0);
  const total = sumNutrients(ingredients.map((item) => ({ nutrients: item.nutrients })));
  const per100Factor = totalWeight > 0 ? 100 / totalWeight : 0;
  return {
    ingredients,
    totalWeight,
    total,
    per100: {
      calories: total.calories * per100Factor,
      protein: total.protein * per100Factor,
      fat: total.fat * per100Factor,
      carbs: total.carbs * per100Factor
    }
  };
}

function dishAsProduct(dish) {
  const totals = calcDish(dish);
  return {
    id: dish.id,
    kind: "dish",
    name: dish.name,
    type: "weight",
    calories: totals.per100.calories,
    protein: totals.per100.protein,
    fat: totals.per100.fat,
    carbs: totals.per100.carbs,
    dish
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

function sortedWeightLogs() {
  return [...(state.weightLogs || [])]
    .filter((item) => number(item.weight) > 0 && item.date)
    .sort((a, b) => weightEntryTimestamp(a) - weightEntryTimestamp(b));
}

function startWeight() {
  return number(sortedWeightLogs()[0]?.weight);
}

function latestWeightEntry() {
  return sortedWeightLogs().at(-1);
}

function currentWeight() {
  return number(latestWeightEntry()?.weight);
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

function hasSavedDayData(date) {
  return (state.diary?.[date] || []).length > 0 || waterTotal(date) > 0 || number(state.water?.[date]) > 0;
}

function availableDayDates() {
  const today = todayIso();
  return [...new Set([
    today,
    ...allTrackedDates().filter((date) => date <= today && hasSavedDayData(date))
  ])].sort();
}

function nearestAvailableDay(date, delta) {
  const today = todayIso();
  const min = dayNavigationMinDate();
  const current = clampDate(date || today, min, today);
  const next = addDays(current, delta);
  return next >= min && next <= today ? next : null;
}

function canChangeDay(date, delta) {
  return Boolean(nearestAvailableDay(date, delta));
}

function normalizeAvailableDay(date) {
  const today = todayIso();
  const min = dayNavigationMinDate();
  return clampDate(date || today, min, today);
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
  return startWeight();
}

function weightLost() {
  const start = startWeight();
  const current = currentWeight();
  return Math.max(0, start - current);
}

function targetReached() {
  const target = number(state.profile.targetWeight);
  const current = currentWeight();
  const start = startWeight();
  if (target <= 0 || current <= 0) return false;
  if (start > target) return current <= target;
  if (start < target) return current >= target;
  return Math.abs(current - target) <= 0.1;
}

function nightMealAdded() {
  return Object.values(state.diary || {}).some((items) => (items || []).some((item) => {
    if (!item?.createdAt) return false;
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) return false;
    const hour = date.getHours();
    return hour >= 0 && hour < 5;
  }));
}

function perfectNutritionDay() {
  const targets = calcTargets();
  if (!targets.complete) return false;
  return allTrackedDates().some((date) => {
    const nutrients = sumNutrients(state.diary?.[date] || []);
    const waterReady = waterTotal(date) >= waterGoal();
    const caloriesReady = nutrients.calories >= targets.calories * 0.95;
    const proteinReady = nutrients.protein >= targets.protein * 0.95;
    const fatReady = nutrients.fat >= targets.fat * 0.95;
    const carbsReady = nutrients.carbs >= targets.carbs * 0.95;
    return waterReady && caloriesReady && proteinReady && fatReady && carbsReady;
  });
}

function achievementDefinitions() {
  const activeDays = allTrackedDates().filter(activeDay).length;
  const meals = totalMealEntries();
  const waterDays = waterGoalDays();
  return [
    { id: "first-day", category: "series", title: "🏆 Первый день", description: "Заполнить дневник хотя бы один день.", value: activeDays, target: 1 },
    { id: "streak-7", category: "series", title: "🔥 7 дней подряд", description: "Вести дневник 7 дней подряд.", value: state.stats.maxStreak, target: 7 },
    { id: "streak-30", category: "series", title: "🔥 30 дней подряд", description: "Вести дневник 30 дней подряд.", value: state.stats.maxStreak, target: 30 },
    { id: "streak-100", category: "series", title: "🔥 100 дней подряд", description: "Вести дневник 100 дней подряд.", value: state.stats.maxStreak, target: 100 },
    { id: "meals-10", category: "food", title: "🍽 Добавлено 10 приёмов пищи", description: "Добавить 10 записей в рацион.", value: meals, target: 10 },
    { id: "meals-100", category: "food", title: "🍽 Добавлено 100 приёмов пищи", description: "Добавить 100 записей в рацион.", value: meals, target: 100 },
    { id: "meals-500", category: "food", title: "🍽 Добавлено 500 приёмов пищи", description: "Добавить 500 записей в рацион.", value: meals, target: 500 },
    { id: "meals-1000", category: "food", title: "🍽 Добавлено 1000 приёмов пищи", description: "Добавить 1000 записей в рацион.", value: meals, target: 1000 },
    { id: "water-10", category: "water", title: "💧 Выполнена норма воды 10 раз", description: "Выполнить дневную норму воды 10 раз.", value: waterDays, target: 10 },
    { id: "water-50", category: "water", title: "💧 Выполнена норма воды 50 раз", description: "Выполнить дневную норму воды 50 раз.", value: waterDays, target: 50 },
    { id: "water-100", category: "water", title: "💧 Выполнена норма воды 100 раз", description: "Выполнить дневную норму воды 100 раз.", value: waterDays, target: 100 },
    { id: "loss-5", category: "weight", title: "⚖ Потеряно 5 кг", description: "Снизить вес на 5 кг от стартового.", value: weightLost(), target: 5 },
    { id: "loss-10", category: "weight", title: "⚖ Потеряно 10 кг", description: "Снизить вес на 10 кг от стартового.", value: weightLost(), target: 10 },
    { id: "target-weight", category: "weight", title: "⚖ Достигнута цель по весу", description: "Дойти до указанной цели по весу.", value: targetReached() ? 1 : 0, target: 1 },
    { id: "night-owl", category: "secret", hidden: true, title: "🌙 Ночная сова", description: "Добавить приём пищи после полуночи.", value: nightMealAdded() ? 1 : 0, target: 1 },
    { id: "perfect-day", category: "secret", hidden: true, title: "💧 Идеальный день", description: "Выполнить норму воды и КБЖУ за один день.", value: perfectNutritionDay() ? 1 : 0, target: 1 },
    { id: "no-skips-30", category: "secret", hidden: true, title: "🎯 Без пропусков", description: "Вести дневник 30 дней подряд.", value: state.stats.maxStreak, target: 30 }
  ];
}

function updateAchievements() {
  for (const achievement of achievementDefinitions()) {
    if (achievement.value >= achievement.target && !state.achievements.unlocked[achievement.id]) {
      state.achievements.unlocked[achievement.id] = new Date().toISOString();
    }
  }
}

function weightAchievementIds() {
  return ["loss-5", "loss-10", "target-weight"];
}

function reconcileWeightAchievements() {
  state.achievements ||= { unlocked: {} };
  state.achievements.unlocked ||= {};
  const current = Object.fromEntries(achievementDefinitions().map((item) => [item.id, item]));
  for (const id of weightAchievementIds()) {
    const item = current[id];
    if (!item || item.value < item.target) delete state.achievements.unlocked[id];
  }
}

function isAchievementUnlocked(id) {
  return Boolean(state.achievements?.unlocked?.[id]);
}

function earnedAchievementCount() {
  return achievementDefinitions().filter((item) => isAchievementUnlocked(item.id)).length;
}

function setScreen(screen) {
  const previousScreen = activeScreen;
  tabIndicatorFromScreen = tabIndicatorIndex(previousScreen) !== null && tabIndicatorIndex(screen) !== null && previousScreen !== screen
    ? previousScreen
    : null;
  if (screenTransitionTimer) {
    clearTimeout(screenTransitionTimer);
    screenTransitionTimer = null;
  }
  if (previousScreen !== screen) {
    const previousOrder = screenOrderIndex(previousScreen);
    const nextOrder = screenOrderIndex(screen);
    screenTransition = {
      from: previousScreen,
      to: screen,
      direction: nextOrder >= previousOrder ? "forward" : "back"
    };
  } else {
    screenTransition = null;
  }
  activeScreen = screen;
  closeModal();
  if (screen === "add") {
    addPage = "home";
    entryDraft.meal = suggestedMealByTime();
    addCreateMenuOpen = false;
    addPanelMode = "existing";
    addFoodSource = "mine";
    eightyCategoryId = "";
    eightyImport = { items: {}, query: "" };
  }
  if (screen === "analytics") {
    analyticsView = "daily";
    periodSheetOpen = false;
  }
  if (screen === "favorites") {
    favoritesPage = "home";
    favoritesEightyCategoryId = "";
    favoritesEightyQuery = "";
  }
  render();
  if (screenTransition) {
    screenTransitionTimer = setTimeout(() => {
      screenTransition = null;
      screenTransitionTimer = null;
      finishScreenTransition();
    }, 220);
  }
}

function setAddPage(page) {
  addPage = page;
  addCreateMenuOpen = false;
  if (page === "home") {
    eightyImport = { items: {}, query: "" };
    eightyCategoryId = "";
    addFoodQuery = "";
    productCreateDraft = null;
    entryDraft = { meal: entryDraft.meal || "breakfast", items: {} };
    dishBuilder = null;
  }
  if (page === "product") productCreateDraft = null;
  if (page === "ration") addFoodSource = "mine";
  if (page === "template") templateSourceDate = clampTemplateDate(templateSourceDate || todayIso());
  if (page === "dish" && !dishBuilder) dishBuilder = { name: "", query: "", ingredients: [] };
  if (page === "eighty") {
    eightyImport.query = "";
    eightyCategoryId = "";
  }
  render();
}

function openAdd(meal = "breakfast") {
  activeScreen = "add";
  entryDraft.meal = meal;
  addPage = "ration";
  addPanelMode = "existing";
  addFoodSource = "mine";
  eightyCategoryId = "";
  eightyImport = { items: {}, query: "" };
  render();
}

function changeDate(delta) {
  const next = nearestAvailableDay(selectedDate, delta);
  if (!next) return false;
  selectedDate = next;
  ensureShape();
  render();
  return true;
}

function changeAnalyticsDate(delta) {
  const next = nearestAvailableDay(analyticsDate, delta);
  if (!next) return false;
  analyticsDate = next;
  render();
  return true;
}

function blurActive() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function closeModal(name) {
  if (accountDeleteBusy) return;
  if (!name || name === "water") waterHistoryOpen = false;
  if (!name || name === "profile-details") profileDetailsOpen = false;
  if (!name || name === "nutrition-info") nutritionInfoOpen = false;
  if (!name || name === "reminders") remindersOpen = false;
  if (!name || name === "eighty-food") eightyFoodDialog = null;
  if (!name || name === "meal-template") mealTemplateEditor = null;
  if (!name || name === "library-editor") libraryEditor = null;
  if (!name || name === "delete-confirm") deleteConfirm = null;
  if (!name || name === "account-delete") accountDeleteOpen = false;
  if (!name || name === "barcode-scanner") {
    barcodeScannerOpen = false;
    barcodeScannerBusy = false;
    barcodeScannerMessage = "";
    stopBarcodeScanner();
  }
  if (!name || name === "weight-history") {
    weightHistoryOpen = false;
    weightEditor = null;
  }
  if (!name || name === "achievements") achievementsOpen = false;
  if (!name || name === "earned-achievements") earnedAchievementsOpen = false;
  if (!name || name === "period-sheet") periodSheetOpen = false;
}

function barcodeFormatsToSupport() {
  const formats = window.Html5QrcodeSupportedFormats;
  if (!formats) return undefined;
  return [
    formats.EAN_13,
    formats.EAN_8,
    formats.UPC_A,
    formats.UPC_E
  ].filter((item) => item !== undefined);
}

function loadBarcodeScannerLibrary() {
  if (window.Html5Qrcode) return Promise.resolve();
  if (barcodeScannerLibraryPromise) return barcodeScannerLibraryPromise;
  barcodeScannerLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => {
      if (window.Html5Qrcode) resolve();
      else {
        barcodeScannerLibraryPromise = null;
        reject(new Error("scanner-unavailable"));
      }
    };
    script.onerror = () => {
      barcodeScannerLibraryPromise = null;
      reject(new Error("scanner-load-failed"));
    };
    document.head.append(script);
  });
  return barcodeScannerLibraryPromise;
}

async function stopBarcodeScanner() {
  const scanner = barcodeScanner;
  barcodeScanner = null;
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
  } catch (error) {
    console.warn("Barcode scanner stop failed", error);
  }
  try {
    await scanner.clear();
  } catch (error) {
    console.warn("Barcode scanner clear failed", error);
  }
}

async function openBarcodeScanner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast("Камера недоступна");
    return;
  }
  barcodeScannerOpen = true;
  barcodeScannerBusy = false;
  barcodeScannerMessage = "Наведите камеру на штрихкод";
  render();
  await waitFrame();
  try {
    await loadBarcodeScannerLibrary();
    const reader = document.querySelector("#barcode-reader");
    if (!reader || !barcodeScannerOpen) return;
    const scanner = new window.Html5Qrcode("barcode-reader");
    barcodeScanner = scanner;
    const formatsToSupport = barcodeFormatsToSupport();
    const config = {
      fps: 10,
      qrbox: { width: 260, height: 160 },
      ...(formatsToSupport?.length ? { formatsToSupport } : {})
    };
    await scanner.start(
      { facingMode: "environment" },
      config,
      (decodedText) => handleBarcodeDetected(decodedText),
      () => {}
    );
    if (!barcodeScannerOpen) await stopBarcodeScanner();
  } catch (error) {
    console.warn("Barcode scanner start failed", error);
    await closeBarcodeScanner(false);
    const libraryError = ["scanner-load-failed", "scanner-unavailable"].includes(error?.message);
    toast(libraryError ? "Не удалось загрузить сканер" : "Нет доступа к камере");
  }
}

async function closeBarcodeScanner(showToast = false) {
  await stopBarcodeScanner();
  barcodeScannerOpen = false;
  barcodeScannerBusy = false;
  barcodeScannerMessage = "";
  render();
  if (showToast) toast("Сканирование отменено");
}

async function handleBarcodeDetected(value) {
  const barcode = String(value || "").trim();
  if (!barcode || barcodeScannerBusy) return;
  barcodeScannerBusy = true;
  barcodeScannerMessage = "Штрихкод найден";
  const message = document.querySelector("[data-barcode-message]");
  if (message) message.textContent = barcodeScannerMessage;
  await stopBarcodeScanner();
  barcodeScannerOpen = false;
  barcodeScannerBusy = false;
  await openProductFromBarcode(barcode);
}

function openProductCreateWithDraft(draft = null) {
  productCreateDraft = {
    name: "",
    type: "weight",
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
    cookedDryWeight: "",
    cookedReadyWeight: "",
    ...(draft || {})
  };
  addCreateMenuOpen = false;
  addPage = "product";
  render();
}

function formatDraftNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? round(numeric, 1) : "";
}

function nutritionValue(nutriments, key) {
  const value = nutriments?.[`${key}_100g`] ?? nutriments?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function caloriesFromNutriments(nutriments) {
  const kcal = nutritionValue(nutriments, "energy-kcal");
  if (kcal !== null) return kcal;
  const kj = nutritionValue(nutriments, "energy-kj") ?? nutritionValue(nutriments, "energy");
  return kj !== null ? kj / 4.184 : null;
}

function productDraftFromOpenFoodFacts(product, barcode) {
  const nutriments = product?.nutriments || {};
  return {
    name: product?.product_name_ru || product?.product_name || product?.generic_name || `Штрихкод ${barcode}`,
    type: "weight",
    calories: formatDraftNumber(caloriesFromNutriments(nutriments)),
    protein: formatDraftNumber(nutritionValue(nutriments, "proteins")),
    fat: formatDraftNumber(nutritionValue(nutriments, "fat")),
    carbs: formatDraftNumber(nutritionValue(nutriments, "carbohydrates"))
  };
}

async function openProductFromBarcode(barcode) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("open-food-facts-failed");
    const data = await response.json();
    if (data?.status === 1 && data.product) {
      openProductCreateWithDraft(productDraftFromOpenFoodFacts(data.product, barcode));
      toast("Продукт найден");
      return;
    }
    openProductCreateWithDraft();
    toast("Продукт не найден. Заполните данные вручную.");
  } catch (error) {
    console.warn("Open Food Facts lookup failed", error);
    openProductCreateWithDraft();
    toast("Не удалось получить данные. Заполните вручную.");
  }
}

function emptyUserState() {
  const now = new Date().toISOString();
  return {
    version: 5,
    createdAt: now,
    accountResetAt: now,
    onboardingCompleted: false,
    telegram: {
      name: "",
      telegramId: "",
      photoUrl: ""
    },
    profile: {
      name: "",
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
      waterGoal: ""
    },
    products: [],
    mealTemplates: [],
    dishes: [],
    eightyOverrides: {},
    diary: {},
    water: {},
    waterHistory: {},
    weightLogs: [],
    stats: {
      currentStreak: 0,
      maxStreak: 0
    },
    achievements: {
      unlocked: {}
    }
  };
}

function resetTransientUiState() {
  selectedDate = todayIso();
  analyticsDate = todayIso();
  analyticsView = "daily";
  analyticsPeriod = { type: "last7", start: "", end: "" };
  analyticsCustomDraft = { start: "", end: "" };
  periodSheetOpen = false;
  favoritesQuery = "";
  favoritesSort = "az";
  favoritesPage = "home";
  favoritesEightyCategoryId = "";
  favoritesEightyQuery = "";
  onboardingStep = 1;
  onboardingDraft = null;
  libraryEditor = null;
  deleteConfirm = null;
  entryDraft = { meal: "breakfast", items: {} };
  mealCartOpen = false;
  addPanelMode = "existing";
  addPage = "home";
  addCreateMenuOpen = false;
  addFoodSource = "mine";
  addFoodQuery = "";
  mealTemplatesVisible = true;
  templateSourceDate = todayIso();
  mealTemplateEditor = null;
  eightyCategoryId = "";
  eightyFoodDialog = null;
  eightyImport = { items: {}, query: "" };
  dishBuilder = null;
  ingredientPicker = { source: "mine", query: "", categoryId: "", items: {} };
  waterHistoryOpen = false;
  profileDetailsOpen = false;
  nutritionInfoOpen = false;
  weightHistoryOpen = false;
  weightEditor = null;
  accountDeleteOpen = false;
  achievementsOpen = false;
  earnedAchievementsOpen = false;
  activeScreen = "diary";
}

async function deleteAccount() {
  if (accountDeleteBusy) return;
  accountDeleteBusy = true;
  render();

  const initData = tg?.initData || "";
  clearTimeout(saveTimer);
  await fetch(apiUrl("/api/account"), {
    method: "DELETE",
    headers: initData ? { "X-Telegram-Init-Data": initData } : {}
  }).catch(() => {});

  state = emptyUserState();
  localStorage.removeItem(stateKey);
  for (const key of legacyStateKeys) localStorage.removeItem(key);
  await persist({ immediate: true, skipEnsure: true });

  accountDeleteBusy = false;
  resetTransientUiState();
  render();
  toast("Аккаунт удалён");
}

function ensureEntryDraft() {
  entryDraft ||= {};
  entryDraft.meal ||= "breakfast";
  entryDraft.items ||= {};
  for (const id of Object.keys(entryDraft.items)) {
    if (!addMealItemById(id)) delete entryDraft.items[id];
  }
}

function sortedProducts(products = state.products, direction = "az") {
  return [...products].sort((a, b) => direction === "za"
    ? b.name.localeCompare(a.name, "ru")
    : a.name.localeCompare(b.name, "ru"));
}

function userEightyFoods(includeDeleted = false) {
  state.eightyOverrides ||= {};
  return eightyFoods
    .map((food) => {
      const override = state.eightyOverrides[food.sourceId] || {};
      return {
        ...food,
        ...override,
        id: food.id,
        sourceId: food.sourceId,
        categoryId: food.categoryId,
        categoryLabel: food.categoryLabel,
        categoryIcon: food.categoryIcon,
        type: "weight",
        deleted: Boolean(override.deleted)
      };
    })
    .filter((food) => includeDeleted || !food.deleted);
}

function eightyFoodById(id, includeDeleted = false) {
  return userEightyFoods(includeDeleted).find((product) => product.id === id);
}

function addMealItems() {
  return [
    ...state.products.map((product) => ({ ...product, kind: "product" })),
    ...state.dishes.map((dish) => dishAsProduct(dish))
  ].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function eightyAddMealItem(food) {
  return { ...food, kind: "eighty", builtin: true };
}

function addMealItemById(id) {
  const personal = addMealItems().find((item) => item.id === id);
  if (personal) return personal;
  const food = eightyFoodById(id);
  return food ? eightyAddMealItem(food) : null;
}

function ensureDishBuilder() {
  dishBuilder ||= { name: "", query: "", ingredients: [] };
  dishBuilder.ingredients ||= [];
  return dishBuilder;
}

function ingredientSearchItems(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return state.products
    .filter((product) => product.name.toLowerCase().includes(normalized))
    .map((product) => ({ source: "mine", product }))
    .slice(0, 12);
}

function builderDishDraft() {
  const draft = ensureDishBuilder();
  return {
    id: "dish-builder",
    name: draft.name,
    ingredients: draft.ingredients
  };
}

function addIngredientToBuilder(product) {
  const draft = ensureDishBuilder();
  const existing = draft.ingredients.find((ingredient) => ingredient.productId === product.id);
  if (existing) {
    existing.amount = number(existing.amount, 0) || 100;
  } else {
    draft.ingredients.push({ id: uid(), productId: product.id, amount: 100 });
  }
  draft.query = "";
}

function selectedMealItems() {
  ensureEntryDraft();
  return Object.keys(entryDraft.items)
    .map((id) => addMealItemById(id))
    .filter(Boolean)
    .map((product) => ({ product, amount: entryDraft.items[product.id] }));
}

function hasDraftItem(id) {
  return Object.prototype.hasOwnProperty.call(entryDraft.items, id);
}

function defaultProductAmount(product) {
  return product?.type === "piece" ? 1 : "";
}

function productAmountLabel(product) {
  if (product.kind === "dish") return "Вес порции, г";
  if (product.type === "piece") return "Количество штук";
  if (product.type === "cooked") return "Сколько граммов готового продукта съедено";
  return "Вес, г";
}

function productAmountPlaceholder(product) {
  return "0";
}

function productAmountUnit(product) {
  return product?.type === "piece" ? "шт" : "г";
}

function productAmountStep(product) {
  return product?.type === "piece" ? 1 : 10;
}

function normalizeProductAmount(product, value) {
  const fallback = number(productAmountPlaceholder(product), productAmountStep(product));
  const raw = number(value, fallback);
  const min = product?.type === "piece" ? 1 : 1;
  const normalized = Math.max(min, raw);
  return product?.type === "piece" ? Math.round(normalized) : round(normalized, 1);
}

function cookedWeightValue(value, fallback) {
  return Math.max(1, number(value, fallback));
}

function cookedRatioText(product) {
  const dry = cookedWeightValue(product?.cookedDryWeight, 100);
  const ready = cookedWeightValue(product?.cookedReadyWeight, 230);
  return `${round(dry, 1)} г сухого → ${round(ready, 1)} г готового`;
}

function productTypeLabel(product) {
  if (product?.type === "cooked") return cookedRatioText(product);
  return labels.productTypes[product?.type] || labels.productTypes.weight;
}

function productLibraryTypeLabel(product) {
  if (product?.type === "cooked") return cookedRatioText(product);
  if (product?.type === "piece") return labels.productTypes.piece;
  return "100 г";
}

function macroBadges(product) {
  return `<span class="entry-macros library-macros">
    <span>Б ${round(product?.protein)}</span>
    <span>Ж ${round(product?.fat)}</span>
    <span>У ${round(product?.carbs)}</span>
  </span>`;
}

function productChoiceLabel(product, withIcon = false) {
  if (product.kind === "dish") return "Блюдо · на 100 г";
  const label = productTypeLabel(product);
  return label;
}

function builtinBadge(product) {
  return product?.builtin || product?.kind === "eighty" ? `<span class="builtin-badge">Встроенный</span>` : "";
}

function formatCartAmount(product, amount) {
  const unit = product.type === "piece" ? "шт" : "г";
  if (number(amount, 0) <= 0) return `— ${unit}`;
  return `${round(amount, 1)} ${unit}`;
}

function mealButtonLabel(meal) {
  return ({
    breakfast: "Добавить в завтрак",
    lunch: "Добавить в обед",
    dinner: "Добавить в ужин",
    snacks: "Добавить в перекус"
  })[meal] || "Добавить в рацион";
}

function suggestedMealByTime(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 23) return "dinner";
  return "snacks";
}

function toggleProduct(id) {
  ensureEntryDraft();
  const product = addMealItemById(id);
  if (!product) return;
  if (hasDraftItem(id)) delete entryDraft.items[id];
  else entryDraft.items[id] = defaultProductAmount(product);
  mealCartOpen = Object.keys(entryDraft.items).length > 0;
  const keepSearchActive = activeScreen === "add";
  render();
  if (keepSearchActive) {
    const search = app.querySelector("[data-add-food-query]");
    const cursor = search?.value?.length || 0;
    search?.focus();
    search?.setSelectionRange?.(cursor, cursor);
  }
}

function stepCartAmount(id, direction) {
  ensureEntryDraft();
  const product = addMealItemById(id);
  if (!product || product.type !== "piece" || !hasDraftItem(id)) return;
  const step = Number(productAmountStep(product));
  const hasValue = String(entryDraft.items[id] ?? "").trim() !== "";
  const current = Number(normalizeProductAmount(product, entryDraft.items[id]));
  const delta = step * Number(direction || 0);
  const next = hasValue ? Math.max(1, current + delta) : current;
  entryDraft.items[id] = Math.round(next);
  const input = app.querySelector(`[data-cart-amount="${id}"]`);
  if (input) input.value = entryDraft.items[id];
  const minus = app.querySelector(`[data-amount-step="${id}"][data-step="-1"]`);
  if (minus) minus.disabled = entryDraft.items[id] <= 1;
  const cart = app.querySelector(".meal-cart");
  if (cart && mealCartOpen) cart.outerHTML = mealCartPanel();
  const submit = app.querySelector(".add-meal-submit");
  if (submit) submit.disabled = selectedMealItems().length === 0 || selectedMealItems().some(({ amount }) => number(amount, 0) <= 0);
}

function addEntry(form) {
  ensureEntryDraft();
  const data = form ? new FormData(form) : null;
  const meal = data?.get("meal") || entryDraft.meal;
  const selected = selectedMealItems()
    .map(({ product, amount }) => {
      const rawAmount = number(amount, 0);
      return {
        product,
        amount: product.type === "piece" && rawAmount > 0
          ? Math.max(1, rawAmount)
          : rawAmount
      };
    })
    .filter((item) => item.amount > 0);

  if (!selected.length) return toast("Выберите продукты и укажите количество");

  for (const { product, amount } of selected) {
    const diaryProduct = product.kind === "eighty" ? saveEightyProduct(product) : product;
    entriesForDate().push({
      id: uid(),
      meal,
      productId: diaryProduct.id,
      label: diaryProduct.name,
      amount,
      unit: diaryProduct.type === "piece" ? "шт." : "г",
      nutrients: calcProduct(diaryProduct, amount),
      createdAt: new Date().toISOString()
    });
  }
  entryDraft = { meal, items: {} };
  mealCartOpen = false;
  addPage = "ration";
  addFoodQuery = "";
  blurActive();
  persist();
  render();
  toast("Продукты успешно добавлены.");
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
    cookedDryWeight: cookedWeightValue(data.get("cookedDryWeight"), 100),
    cookedReadyWeight: cookedWeightValue(data.get("cookedReadyWeight"), 230)
  };
  if (!product.name) return toast("Введите название");
  state.products.unshift(product);
  productCreateDraft = null;
  blurActive();
  persist();
  render();
  toast("Продукт сохранён");
}

function refreshDiaryEntriesForProduct(product) {
  for (const entries of Object.values(state.diary || {})) {
    for (const entry of entries || []) {
      if (entry.productId !== product.id) continue;
      entry.label = product.name;
      entry.unit = product.type === "piece" ? "шт." : "г";
      entry.nutrients = calcProduct(product, entry.amount);
    }
  }
}

function refreshDiaryEntriesForDish(dish) {
  const product = dishAsProduct(dish);
  for (const entries of Object.values(state.diary || {})) {
    for (const entry of entries || []) {
      if (entry.productId !== dish.id) continue;
      entry.label = dish.name;
      entry.unit = "г";
      entry.nutrients = calcProduct(product, entry.amount);
    }
  }
}

function saveProductEdit(form) {
  const data = new FormData(form);
  const id = data.get("id");
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  const name = String(data.get("name") || "").trim();
  if (!name) return toast("Введите название");
  product.name = name;
  product.type = data.get("type") || "weight";
  product.calories = number(data.get("calories"));
  product.protein = number(data.get("protein"));
  product.fat = number(data.get("fat"));
  product.carbs = number(data.get("carbs"));
  product.cookedDryWeight = cookedWeightValue(data.get("cookedDryWeight"), 100);
  product.cookedReadyWeight = cookedWeightValue(data.get("cookedReadyWeight"), 230);
  refreshDiaryEntriesForProduct(product);
  libraryEditor = null;
  blurActive();
  persist();
  render();
  toast("Сохранено");
}

function saveEightyEdit(form) {
  const data = new FormData(form);
  const id = data.get("id");
  const base = eightyFoods.find((food) => food.id === id);
  if (!base) return;
  const name = String(data.get("name") || "").trim();
  if (!name) return toast("Введите название");
  state.eightyOverrides ||= {};
  state.eightyOverrides[base.sourceId] = {
    ...(state.eightyOverrides[base.sourceId] || {}),
    name,
    calories: number(data.get("calories")),
    protein: number(data.get("protein")),
    fat: number(data.get("fat")),
    carbs: number(data.get("carbs")),
    deleted: false
  };
  libraryEditor = null;
  blurActive();
  persist();
  render();
  toast("Сохранено");
}

function deleteEightyFood(id) {
  const base = eightyFoods.find((food) => food.id === id);
  if (!base) return;
  state.eightyOverrides ||= {};
  state.eightyOverrides[base.sourceId] = {
    ...(state.eightyOverrides[base.sourceId] || {}),
    deleted: true
  };
  deleteConfirm = null;
  libraryEditor = null;
  persist();
  render();
  toast("Продукт удалён из вашей базы");
}

function syncDishDraftFromForm(form) {
  if (libraryEditor?.kind !== "dish") return;
  const draft = libraryEditor.draft;
  draft.name = String(form.querySelector('[name="name"]')?.value || "").trim();
  draft.ingredients = [...form.querySelectorAll("[data-dish-ingredient]")].map((row) => ({
    id: row.dataset.dishIngredient,
    productId: row.querySelector('[name="ingredientProduct"]')?.value || "",
    amount: optionalNumber(row.querySelector('[name="ingredientAmount"]')?.value)
  }));
}

function saveDishEdit(form) {
  syncDishDraftFromForm(form);
  const draft = libraryEditor?.draft;
  if (!draft) return;
  if (!draft.name) return toast("Введите название");
  const dish = state.dishes.find((item) => item.id === draft.id);
  if (dish) {
    dish.name = draft.name;
    dish.ingredients = draft.ingredients.filter((ingredient) => ingredient.productId && number(ingredient.amount) > 0);
    refreshDiaryEntriesForDish(dish);
  }
  libraryEditor = null;
  blurActive();
  persist();
  render();
  toast("Сохранено");
}

function syncDishBuilderFromForm(form) {
  const draft = ensureDishBuilder();
  draft.name = String(form.querySelector('[name="dishName"]')?.value || "").trim();
  draft.query = String(form.querySelector('[name="dishSearch"]')?.value || "");
  draft.ingredients = [...form.querySelectorAll("[data-builder-ingredient]")].map((row) => ({
    id: row.dataset.builderIngredient,
    productId: draft.ingredients.find((ingredient) => ingredient.id === row.dataset.builderIngredient)?.productId || "",
    amount: optionalNumber(row.querySelector('[name="builderIngredientAmount"]')?.value)
  }));
}

function saveDishCreate(form) {
  syncDishBuilderFromForm(form);
  const draft = ensureDishBuilder();
  if (!draft.name) return toast("Введите название");
  const ingredients = draft.ingredients.filter((ingredient) => ingredient.productId && number(ingredient.amount) > 0);
  if (!ingredients.length) return toast("Добавьте ингредиенты");
  state.dishes.unshift({
    id: uid(),
    name: draft.name,
    ingredients
  });
  dishBuilder = null;
  addPanelMode = "existing";
  addFoodSource = "mine";
  addFoodQuery = "";
  blurActive();
  persist();
  render();
  toast("Блюдо сохранено");
}

function addPickedIngredientsToDish(form) {
  const data = new FormData(form);
  const draft = ensureDishBuilder();
  const items = selectedIngredientPickerItems()
    .map((item) => ({
      item,
      amount: optionalNumber(data.get(`ingredient-${item.id}`) || ingredientPicker.items[item.id])
    }))
    .filter(({ amount }) => number(amount) > 0);
  if (!items.length) return toast("Введите вес");
  for (const { item, amount } of items) {
    const product = ingredientPicker.source === "eighty" ? saveEightyProduct(item) : item;
    const existing = draft.ingredients.find((ingredient) => ingredient.productId === product.id);
    if (existing) existing.amount = amount;
    else draft.ingredients.push({ id: uid(), productId: product.id, amount });
  }
  ingredientPicker = { source: "mine", query: "", categoryId: "", items: {} };
  addPage = "dish";
  blurActive();
  persist();
  render();
  toast("Ингредиенты добавлены");
}

function deleteProduct(id) {
  state.products = state.products.filter((item) => item.id !== id);
  state.dishes = state.dishes.map((dish) => ({
    ...dish,
    ingredients: (dish.ingredients || []).filter((ingredient) => ingredient.productId !== id)
  }));
  ensureEntryDraft();
  delete entryDraft.items[id];
  deleteConfirm = null;
  libraryEditor = null;
  persist();
  render();
}

function deleteDish(id) {
  state.dishes = state.dishes.filter((item) => item.id !== id);
  deleteConfirm = null;
  libraryEditor = null;
  persist();
  render();
}

function confirmDelete() {
  if (!deleteConfirm) return;
  if (deleteConfirm.kind === "product") deleteProduct(deleteConfirm.id);
  if (deleteConfirm.kind === "dish") deleteDish(deleteConfirm.id);
  if (deleteConfirm.kind === "weight") deleteWeight(deleteConfirm.id);
  if (deleteConfirm.kind === "eighty") deleteEightyFood(deleteConfirm.id);
  if (deleteConfirm.kind === "template") deleteMealTemplate(deleteConfirm.id);
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
  const input = form.elements?.waterGoal || form.querySelector?.('[name="waterGoal"]');
  return optionalNumber(input ? input.value : state.settings.waterGoal);
}

function namedFieldValue(container, name) {
  return container.elements?.[name]?.value ?? container.querySelector?.(`[name="${name}"]`)?.value ?? "";
}

function waterAutoEnabledFromForm(form) {
  const input = form.elements?.waterAuto || form.querySelector?.('[name="waterAuto"]');
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
  const activity = namedFieldValue(form, "activity");
  if (activity !== "") state.profile.activity = activity;
  syncWaterSettingsFromForm(form);
}

function syncTargetsFromForm(form) {
  const data = new FormData(form);
  const p = state.profile;
  p.targetMode = data.get("targetMode") || "auto";
  p.goalMode = data.get("goalMode") || p.goalMode || "loss";
  p.activity = data.get("activity") || "";
  p.deficitPercent = number(data.get("deficitPercent"), p.deficitPercent);
  p.surplusPercent = number(data.get("surplusPercent"), p.surplusPercent);
  p.manualTargets.calories = optionalNumber(data.get("manualCalories"));
  p.manualTargets.protein = optionalNumber(data.get("manualProtein"));
  p.manualTargets.fat = optionalNumber(data.get("manualFat"));
  p.manualTargets.carbs = optionalNumber(data.get("manualCarbs"));
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

function setReminderPath(path, value) {
  const [group, key] = String(path).split(".");
  const reminders = state.settings.reminders;
  if (!group || !key || !reminders[group]) return;
  reminders[group][key] = key === "intervalHours" ? number(value, reminders[group][key]) : value;
  persist();
}

function toggleReminderSetting(name) {
  const reminders = state.settings.reminders;
  if (name === "enabled") reminders.enabled = !reminders.enabled;
  else if (reminders[name]) reminders[name].enabled = !reminders[name].enabled;
  persist();
  render();
}

function saveProfile(form) {
  syncProfileFromForm(form);
  state.profile.weight = number(currentWeight()) || "";
  profileDetailsOpen = false;
  blurActive();
  persist();
  render();
  toast("Сохранено");
}

function recalculateProfile(form) {
  syncProfileFromForm(form);
  state.profile.weight = number(currentWeight()) || "";
  persist();
  render();
  toast("Расчёт обновлён");
}

function syncProfileWeightFromLogs() {
  state.profile.weight = number(currentWeight()) || "";
}

function openWeightAdd() {
  weightEditor = { mode: "add", date: todayIso(), weight: "" };
  weightHistoryOpen = true;
  render();
}

function saveWeightEntry(form) {
  const date = namedFieldValue(form, "date");
  const weight = number(namedFieldValue(form, "weight"));
  if (!date || weight <= 0) return toast("Введите вес");
  const id = namedFieldValue(form, "id");
  const existing = id ? state.weightLogs.find((item) => item.id === id) : null;
  if (existing) {
    existing.date = date;
    existing.weight = weight;
    existing.createdAt = `${date}T00:00:00`;
  } else {
    state.weightLogs.push({ id: uid(), date, weight, createdAt: `${date}T00:00:00` });
  }
  weightEditor = null;
  syncProfileWeightFromLogs();
  blurActive();
  persist();
  render();
  toast(existing ? "Запись веса обновлена" : "Вес добавлен");
}

function deleteWeight(id) {
  state.weightLogs = (state.weightLogs || []).filter((item) => item.id !== id);
  deleteConfirm = null;
  weightEditor = null;
  syncProfileWeightFromLogs();
  reconcileWeightAchievements();
  persist();
  render();
  toast("Запись веса удалена");
}

function userLibraryItems(query = favoritesQuery) {
  const normalized = query.trim().toLowerCase();
  const sortByName = (a, b) => favoritesSort === "za"
    ? b.name.localeCompare(a.name, "ru")
    : a.name.localeCompare(b.name, "ru");
  const matches = (name) => !normalized || String(name || "").toLowerCase().includes(normalized);
  const products = state.products
    .map((product) => ({ kind: "product", item: product, name: product.name }))
    .filter((entry) => matches(entry.name))
    .sort(sortByName);
  const dishes = state.dishes
    .map((dish) => ({ kind: "dish", item: dish, name: dish.name }))
    .filter((entry) => matches(entry.name))
    .sort(sortByName);
  const builtin = normalized
    ? userEightyFoods()
      .filter((food) => matches(food.name))
      .map((food) => ({ kind: "eighty", item: eightyAddMealItem(food), name: food.name }))
      .sort(sortByName)
    : [];
  return [...products, ...dishes, ...builtin];
}

function onboardingProgress() {
  return `<div class="onboarding-progress">
    <span>Шаг ${onboardingStep} из 6</span>
    <div>${[1, 2, 3, 4, 5, 6].map((step) => `<i class="${step <= onboardingStep ? "active" : ""}"></i>`).join("")}</div>
  </div>`;
}

function onboardingShell(content, back = false) {
  return `<main class="onboarding-screen">
    <section class="onboarding-card">
      ${back ? `<button class="back-link onboarding-back" type="button" data-action="onboarding-back">← Назад</button>` : ""}
      ${content}
      ${onboardingProgress()}
    </section>
  </main>`;
}

function screenOnboarding() {
  ensureOnboardingDraft();
  if (onboardingStep === 2) return onboardingStepProfile();
  if (onboardingStep === 3) return onboardingStepGoal();
  if (onboardingStep === 4) return onboardingStepTarget();
  if (onboardingStep === 5) return onboardingStepActivity();
  if (onboardingStep === 6) return onboardingStepDone();
  return onboardingStepWelcome();
}

function onboardingStepWelcome() {
  return onboardingShell(`
    <div class="brand-mark onboarding-logo">80</div>
    <div class="onboarding-copy">
      <h1>Добро пожаловать в Eighty 👋</h1>
      <p>За одну минуту мы настроим приложение специально под вас.</p>
    </div>
    <div class="onboarding-feature-list">
      ${["дневную норму калорий", "КБЖУ", "норму воды", "BMR", "поддержание веса", "цель по калориям"].map((item) => `<span>• ${item}</span>`).join("")}
    </div>
    <button class="primary-btn full-btn onboarding-main-btn" type="button" data-action="onboarding-start">Начать настройку</button>
  `);
}

function onboardingStepProfile() {
  const draft = ensureOnboardingDraft();
  return onboardingShell(`
    <div class="onboarding-copy">
      <span>Основные данные</span>
      <h1>Расскажите немного о себе</h1>
    </div>
    <form class="form-grid onboarding-form" data-form="onboarding">
      <div class="field full"><label>Имя</label><input name="name" value="${escapeHtml(draft.name)}" placeholder="Ваше имя" required data-onboarding-autofocus></div>
      <div class="field"><label>Возраст</label><input name="age" type="number" inputmode="numeric" value="${escapeHtml(draft.age)}" placeholder="0" required></div>
      <div class="field"><label>Пол</label><select name="sex" required>${option("", "Выберите", draft.sex)}${option("female", "Женский", draft.sex)}${option("male", "Мужской", draft.sex)}${option("other", "Другой", draft.sex)}</select></div>
      <div class="field"><label>Рост, см</label><input name="height" type="number" inputmode="numeric" value="${escapeHtml(draft.height)}" placeholder="0" required></div>
      <div class="field"><label>Вес, кг</label><input name="weight" type="number" inputmode="decimal" step="0.1" value="${escapeHtml(draft.weight)}" placeholder="0" required></div>
      <button class="primary-btn full-btn field full onboarding-main-btn" type="submit">Далее</button>
    </form>
  `, true);
}

function onboardingChoiceCard(icon, title, value, selected, dataset) {
  return `<button class="onboarding-choice ${selected ? "selected" : ""}" type="button" ${dataset}="${value}">
    <span>${icon}</span>
    <strong>${title}</strong>
  </button>`;
}

function onboardingStepGoal() {
  const draft = ensureOnboardingDraft();
  const cards = [
    ["⬇️", "Похудение", "loss"],
    ["⚖️", "Поддержание веса", "maintain"],
    ["⬆️", "Набор массы", "gain"],
    ["📒", "Просто вести дневник", "diary"]
  ];
  return onboardingShell(`
    <div class="onboarding-copy">
      <span>Цель</span>
      <h1>Какая у вас цель?</h1>
    </div>
    <div class="onboarding-choice-grid">
      ${cards.map(([icon, title, value]) => onboardingChoiceCard(icon, title, value, draft.goalMode === value, "data-onboarding-goal")).join("")}
    </div>
    <button class="primary-btn full-btn onboarding-main-btn" type="button" data-action="onboarding-next">Далее</button>
  `, true);
}

function onboardingStepTarget() {
  const draft = ensureOnboardingDraft();
  return onboardingShell(`
    <div class="onboarding-copy">
      <span>Целевой вес</span>
      <h1>Каким должен быть ваш вес?</h1>
    </div>
    <form class="form-grid onboarding-form" data-form="onboarding">
      <div class="field full"><label>Текущий вес</label><input value="${escapeHtml(draft.weight)} кг" disabled></div>
      <div class="field full"><label>Целевой вес, кг</label><input name="targetWeight" type="number" inputmode="decimal" step="0.1" value="${escapeHtml(draft.targetWeight)}" placeholder="0" required data-onboarding-autofocus></div>
      <button class="primary-btn full-btn field full onboarding-main-btn" type="submit">Далее</button>
    </form>
  `, true);
}

function onboardingStepActivity() {
  const draft = ensureOnboardingDraft();
  const cards = [
    ["😴", "Минимальная", "minimal"],
    ["🚶", "Низкая", "low"],
    ["🏃", "Средняя", "medium"],
    ["💪", "Высокая", "high"],
    ["🏋️", "Очень высокая", "veryHigh"]
  ];
  return onboardingShell(`
    <div class="onboarding-copy">
      <span>Активность</span>
      <h1>Насколько вы активны?</h1>
    </div>
    <div class="onboarding-choice-grid">
      ${cards.map(([icon, title, value]) => onboardingChoiceCard(icon, title, value, draft.activity === value, "data-onboarding-activity")).join("")}
    </div>
    <button class="primary-btn full-btn onboarding-main-btn" type="button" data-action="onboarding-next">Рассчитать</button>
  `, true);
}

function onboardingResultRow(icon, title, value, text) {
  return `<div class="onboarding-result-row">
    <span>${icon}</span>
    <div><strong>${title}</strong><b>${value}</b>${text ? `<p>${text}</p>` : ""}</div>
  </div>`;
}

function onboardingStepDone() {
  const draft = ensureOnboardingDraft();
  const results = calcOnboardingResults();
  return onboardingShell(`
    <div class="onboarding-copy">
      <span>Ваши результаты</span>
      <h1>Всё готово</h1>
    </div>
    <div class="onboarding-results">
      ${onboardingResultRow("🔥", "BMR", targetValue(results.bmr, "ккал"), "Расход калорий в состоянии покоя.")}
      ${onboardingResultRow("⚖️", "Поддержание", targetValue(results.maintenance, "ккал"), "Норма для сохранения текущего веса.")}
      ${onboardingResultRow("🎯", "Текущая цель", `${labels.goals[draft.goalMode] || "Похудение"} · ${targetValue(results.calories, "ккал")}`, "")}
      ${onboardingResultRow("💧", "Вода", `${round(results.water / 1000, 1)} л`, "")}
      <div class="onboarding-macro-strip">
        <div><span>🥩 Белки</span><b>${round(results.protein)} г</b></div>
        <div><span>🥑 Жиры</span><b>${round(results.fat)} г</b></div>
        <div><span>🍚 Углеводы</span><b>${round(results.carbs)} г</b></div>
      </div>
    </div>
    <p class="onboarding-ready">Eighty полностью готов к работе. Все расчёты будут автоматически обновляться при изменении ваших данных. Теперь осталось только начать вести дневник питания.</p>
    <button class="primary-btn full-btn onboarding-main-btn" type="button" data-action="onboarding-finish">Начать пользоваться Eighty</button>
  `, true);
}

function render() {
  ensureShape();
  ensureEntryDraft();
  selectedDate = normalizeAvailableDay(selectedDate);
  analyticsDate = normalizeAvailableDay(analyticsDate);
  if (!state.onboardingCompleted) {
    app.innerHTML = screenOnboarding();
    focusOnboardingField();
    return;
  }
  const targets = calcTargets();
  const consumed = sumNutrients(entriesForDate());

  app.innerHTML = `
    <main class="layout ${screenTransition ? "screen-transitioning" : ""}"${screenTransition ? ` data-screen-direction="${screenTransition.direction}"` : ""}>
      ${screenDiary(targets, consumed)}
      ${screenAnalytics(targets)}
      ${screenAdd()}
      ${screenFavorites()}
      ${screenProfile(targets)}
    </main>
    ${tabs()}
    ${waterHistoryOpen ? waterHistoryModal() : ""}
    ${profileDetailsOpen ? profileDetailsModal(targets) : ""}
    ${nutritionInfoOpen ? nutritionInfoModal(targets) : ""}
    ${eightyFoodDialog ? eightyFoodModal() : ""}
    ${barcodeScannerOpen ? barcodeScannerModal() : ""}
    ${mealTemplateEditor ? mealTemplateModal() : ""}
    ${libraryEditor?.kind === "product" ? productEditModal() : ""}
    ${libraryEditor?.kind === "dish" ? dishEditModal() : ""}
    ${libraryEditor?.kind === "eighty" ? eightyEditModal() : ""}
    ${achievementsOpen ? achievementsModal(false) : ""}
    ${earnedAchievementsOpen ? achievementsModal(true) : ""}
    ${periodSheetOpen ? analyticsPeriodSheet() : ""}
    ${deleteConfirm ? deleteConfirmModal() : ""}
    ${accountDeleteOpen ? accountDeleteModal() : ""}
    ${accountDeleteBusy ? accountDeletingOverlay() : ""}
  `;
  activateTabIndicatorMotion();
}

function tabIndicatorIndex(screen) {
  return ({
    diary: 0,
    analytics: 1,
    favorites: 3,
    profile: 4
  })[screen] ?? null;
}

function screenOrderIndex(screen) {
  return ({
    diary: 0,
    analytics: 1,
    add: 2,
    favorites: 3,
    profile: 4
  })[screen] ?? 0;
}

function screenStateClass(screen) {
  return [
    "screen",
    activeScreen === screen ? "active" : "",
    daySwipeEnabled(screen) ? "day-swipe-surface" : "",
    screenTransition?.from === screen ? "transition-from" : "",
    screenTransition?.to === screen ? "transition-to" : ""
  ].filter(Boolean).join(" ");
}

function finishScreenTransition() {
  const layout = app.querySelector(".layout.screen-transitioning");
  layout?.classList.remove("screen-transitioning");
  layout?.removeAttribute("data-screen-direction");
  app.querySelectorAll(".screen.transition-from").forEach((screen) => {
    screen.classList.remove("active", "transition-from");
  });
  app.querySelectorAll(".screen.transition-to").forEach((screen) => {
    screen.classList.remove("transition-to");
  });
}

function daySwipeEnabled(screen) {
  return screen === "diary" || (screen === "analytics" && analyticsView !== "periods");
}

function activateTabIndicatorMotion() {
  const nav = app.querySelector(".tabs");
  const indicator = nav?.querySelector(".tab-indicator");
  if (!nav || !indicator) return;
  nav.classList.add("nav-no-motion");
  const previousIndicatorX = nav.style.getPropertyValue("--tab-indicator-x");
  const previousIndicatorY = nav.style.getPropertyValue("--tab-indicator-y");
  nav.style.setProperty("--tab-indicator-x", "0px");
  nav.style.setProperty("--tab-indicator-y", "0px");
  indicator.offsetWidth;
  const indicatorOriginRect = indicator.getBoundingClientRect();
  if (previousIndicatorX) nav.style.setProperty("--tab-indicator-x", previousIndicatorX);
  else nav.style.removeProperty("--tab-indicator-x");
  if (previousIndicatorY) nav.style.setProperty("--tab-indicator-y", previousIndicatorY);
  else nav.style.removeProperty("--tab-indicator-y");
  const indicatorPosition = (screen) => {
    const button = nav.querySelector(`.tab[data-screen="${screen}"]:not(.tab-action)`);
    if (!button) return null;
    const icon = button.querySelector(".tab-icon");
    if (!icon) return null;
    const buttonRect = button.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const indicatorRect = indicator.getBoundingClientRect();
    return {
      x: buttonRect.left + (buttonRect.width / 2) - indicatorOriginRect.left - (indicatorRect.width / 2),
      y: iconRect.top + (iconRect.height / 2) - indicatorOriginRect.top - (indicatorRect.height / 2)
    };
  };
  const activePosition = indicatorPosition(activeScreen);
  const fromPosition = tabIndicatorFromScreen ? indicatorPosition(tabIndicatorFromScreen) : activePosition;
  const shouldAnimate = tabIndicatorFromScreen && fromPosition && activePosition && (fromPosition.x !== activePosition.x || fromPosition.y !== activePosition.y);
  if (fromPosition) {
    nav.style.setProperty("--tab-indicator-x", `${fromPosition.x}px`);
    nav.style.setProperty("--tab-indicator-y", `${fromPosition.y}px`);
  }
  indicator.offsetWidth;
  const run = () => {
    nav.classList.add("nav-ready");
    if (!shouldAnimate) {
      if (activePosition) {
        nav.style.setProperty("--tab-indicator-x", `${activePosition.x}px`);
        nav.style.setProperty("--tab-indicator-y", `${activePosition.y}px`);
      }
      tabIndicatorFromScreen = null;
      requestAnimationFrame(() => nav.classList.remove("nav-no-motion"));
      return;
    }
    nav.classList.remove("nav-no-motion");
    if (activePosition) {
      nav.style.setProperty("--tab-indicator-x", `${activePosition.x}px`);
      nav.style.setProperty("--tab-indicator-y", `${activePosition.y}px`);
    }
    tabIndicatorFromScreen = null;
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else setTimeout(run, 0);
}

function tabs() {
  const items = [
    ["diary", icons.diary, "Дневник"],
    ["analytics", icons.analytics, "Аналитика"],
    ["add", icons.add, "Добавить"],
    ["favorites", icons.favorite, "Продукты"],
    ["profile", icons.profile, "Профиль"]
  ];
  const activeIndex = tabIndicatorIndex(activeScreen);
  const readyClass = tabIndicatorFromScreen === null ? "nav-ready" : "";
  const hiddenClass = activeIndex === null ? "indicator-hidden" : "";
  return `<nav class="tabs ${readyClass} ${hiddenClass}">
    <span class="tab-indicator" aria-hidden="true"></span>
    ${items.map(([id, icon, label]) => `
    <button class="tab ${activeScreen === id ? "active" : ""} ${id === "add" ? "tab-action" : ""}" data-screen="${id}" title="${label}">
      <span class="tab-icon">${icon}</span>${id === "add" ? "" : `<span>${label}</span>`}
    </button>
  `).join("")}</nav>`;
}

function canChangeDayBySwipe(screen, delta) {
  if (screen === "diary") return canChangeDay(selectedDate, delta);
  if (screen === "analytics") return canChangeDay(analyticsDate, delta);
  return false;
}

function applyDaySwipeChange(screen, delta) {
  if (activeScreen !== screen || !canChangeDayBySwipe(screen, delta)) return false;
  if (screen === "diary") {
    selectedDate = nearestAvailableDay(selectedDate, delta);
    ensureShape();
  }
  if (screen === "analytics") analyticsDate = nearestAvailableDay(analyticsDate, delta);
  render();
  return true;
}

function daySwipeStart(event) {
  if (!daySwipeEnabled(activeScreen)) return;
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target) return;
  if (target.closest("button, input, textarea, select, a, label, [role='dialog'], .modal-backdrop")) return;
  const node = target.closest(".screen.active.day-swipe-surface");
  if (!node) return;
  daySwipe = {
    pointerId: event.pointerId,
    screen: activeScreen,
    node,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    axis: "",
    width: Math.max(1, node.getBoundingClientRect().width)
  };
}

function daySwipeMove(event) {
  if (!daySwipe || event.pointerId !== daySwipe.pointerId) return;
  const dx = event.clientX - daySwipe.startX;
  const dy = event.clientY - daySwipe.startY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (!daySwipe.axis) {
    if (absX < 10 && absY < 10) return;
    if (absY > absX * 1.15) {
      daySwipe = null;
      return;
    }
    if (absX <= absY * 1.15) return;
    daySwipe.axis = "horizontal";
    daySwipe.node.setPointerCapture?.(event.pointerId);
  }

  if (daySwipe.axis !== "horizontal") return;
  event.preventDefault();
  daySwipe.currentX = event.clientX;
}

function daySwipeEnd(event) {
  if (!daySwipe || event.pointerId !== daySwipe.pointerId) return;
  const swipe = daySwipe;
  daySwipe = null;
  const dx = swipe.currentX - swipe.startX;
  if (swipe.axis !== "horizontal") return;
  const delta = dx < 0 ? 1 : -1;
  const threshold = Math.min(96, Math.max(64, swipe.width * 0.22));
  const complete = Math.abs(dx) >= threshold && canChangeDayBySwipe(swipe.screen, delta);
  if (complete) applyDaySwipeChange(swipe.screen, delta);
}

function screenDiary(targets, consumed) {
  const remaining = Math.max(0, targets.calories - consumed.calories);
  const calorieProgress = targets.complete ? clamp(consumed.calories / Math.max(1, targets.calories) * 100, 0, 100) : 0;
  return `<section class="${screenStateClass("diary")}">
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
      ${waterSection()}
    </div>
  </section>`;
}

function diaryDayHeader() {
  const hasPrevious = canChangeDay(selectedDate, -1);
  const hasNext = canChangeDay(selectedDate, 1);
  return `<div class="diary-day-head">
    <div class="hello-card">Привет, ${escapeHtml(state.profile.name || currentUser.name || "Пользователь")}!</div>
    <div class="day-actions">
      <button class="icon-btn" data-action="prev-date" title="Предыдущий день" ${hasPrevious ? "" : "disabled"}>${icons.prev}</button>
      <button class="icon-btn" data-action="next-date" title="Следующий день" ${hasNext ? "" : "disabled"}>${icons.next}</button>
    </div>
  </div>`;
}

function activitySummaryCard() {
  return `<div class="activity-summary">
    <div><span>🔥 Серия</span><strong>${round(state.stats.currentStreak)} дней подряд</strong></div>
    <button class="activity-achievements" type="button" data-action="earned-achievements"><span>🏆 Достижения</span><strong>${earnedAchievementCount()} получено</strong></button>
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
    ${items.length ? `<div class="meal-items">${items.map(entryRow).join("")}</div>` : `<div class="empty-line">Пока нет добавленных продуктов</div>`}
  </article>`;
}

function entryRow(item) {
  return `<div class="entry-row">
    <div class="entry-row-main">
      <div class="entry-row-head">
        <strong>${escapeHtml(item.label)}</strong>
      </div>
      <span class="entry-meta">${round(item.nutrients.calories)} ккал • ${round(item.amount, 1)} ${item.unit}</span>
      <div class="entry-macros">
        <span>Б ${round(item.nutrients.protein)}</span>
        <span>Ж ${round(item.nutrients.fat)}</span>
        <span>У ${round(item.nutrients.carbs)}</span>
      </div>
    </div>
    <button class="icon-btn compact delete-btn" data-delete-entry="${item.id}" title="Удалить">${icons.trash}</button>
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
      <input name="waterAmount" type="number" min="1" step="1" inputmode="numeric" enterkeyhint="done" placeholder="0 мл">
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
    <button class="icon-btn compact delete-btn" type="button" data-delete-water="${item.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function screenAnalytics(targets = calcTargets()) {
  analyticsDate = normalizeAvailableDay(analyticsDate);
  if (analyticsView === "periods") return screenAnalyticsPeriods();

  const dayStats = sumNutrients(state.diary[analyticsDate] || []);
  return `<section class="${screenStateClass("analytics")}">
    <div class="stack">
      <header class="screen-header profile-title">
        <div class="profile-title-row">
          <span>ВАШ ПРОГРЕСС И СТАТИСТИКА</span>
        </div>
        <h1>Аналитика</h1>
      </header>
      ${analyticsDateSwitcher()}
      ${analyticsDayCard(dayStats, targets)}
      ${todayRationBlock(analyticsDate)}
      ${analyticsWaterCard()}
      ${analyticsPeriodsCard()}
    </div>
  </section>`;
}

function analyticsDateSwitcher() {
  const hasPrevious = canChangeDay(analyticsDate, -1);
  const hasNext = canChangeDay(analyticsDate, 1);
  return `<div class="date-switcher">
    <button class="icon-btn" data-analytics-step="-1" title="Предыдущий день" ${hasPrevious ? "" : "disabled"}>${icons.prev}</button>
    <strong>${formatFullDate(analyticsDate)}</strong>
    <button class="icon-btn" data-analytics-step="1" title="Следующий день" ${hasNext ? "" : "disabled"}>${icons.next}</button>
  </div>`;
}

function analyticsDayCard(stats, targets = calcTargets()) {
  return `<section class="analytics-day-card">
    <span>${analyticsDate === todayIso() ? "Съедено сегодня" : "Съедено за день"}</span>
    <strong>${round(stats.calories)} / ${targetValue(targets.calories, "ккал")}</strong>
    <div class="day-macro-list">
      <div><span>Белки</span><b>${round(stats.protein)} / ${targetValue(targets.protein, "г")}</b></div>
      <div><span>Жиры</span><b>${round(stats.fat)} / ${targetValue(targets.fat, "г")}</b></div>
      <div><span>Углеводы</span><b>${round(stats.carbs)} / ${targetValue(targets.carbs, "г")}</b></div>
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
      <strong>${round(water)} / ${round(goal)} мл</strong>
      <p>${round(percent)}% выполнено</p>
    </div>
    <div class="progress large water" style="--value:${percent}%"><i></i></div>
  </section>`;
}

function analyticsHistory() {
  const range = analyticsPeriodRange();
  return analyticsHistoryForRange(range.start, range.end);
}

function analyticsStats(history) {
  const totals = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  let waterPercent = 0;
  let filledDays = 0;
  for (const row of history) {
    waterPercent += clamp(waterTotal(row.date) / Math.max(1, waterGoal()) * 100, 0, 100);
    if (activeDay(row.date)) filledDays++;
    totals.calories += row.nutrients.calories;
    totals.protein += row.nutrients.protein;
    totals.fat += row.nutrients.fat;
    totals.carbs += row.nutrients.carbs;
  }
  const divisor = Math.max(1, history.length);
  return {
    calories: totals.calories / divisor,
    protein: totals.protein / divisor,
    fat: totals.fat / divisor,
    carbs: totals.carbs / divisor,
    waterPercent: waterPercent / divisor,
    filledDays
  };
}

function periodSummaryCard(stats, totalDays) {
  return `<section class="section-block">
    <h2>ИТОГИ ПЕРИОДА</h2>
    <div class="summary-grid">
      ${statCard("Средние калории", `${round(stats.calories)} ккал`)}
      ${statCard("Средние белки", `${round(stats.protein)} г`)}
      ${statCard("Средние жиры", `${round(stats.fat)} г`)}
      ${statCard("Средние углеводы", `${round(stats.carbs)} г`)}
      ${statCard("Среднее выполнение воды", `${round(stats.waterPercent)}%`)}
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

function todayRationBlock(date) {
  const meals = Object.entries(labels.meals)
    .map(([meal, data]) => ({ meal, data, items: (state.diary[date] || []).filter((item) => item.meal === meal) }))
    .filter((group) => group.items.length > 0);

  return `<section class="section-block today-ration">
    <h2>Рацион за день</h2>
    <div class="today-ration-list">
      ${meals.length ? meals.map(rationMealCard).join("") : `<div class="empty-line">За этот день ещё не добавлено ни одного продукта в рацион.</div>`}
    </div>
  </section>`;
}

function rationMealCard(group) {
  const total = sumNutrients(group.items);
  return `<article class="ration-meal-card">
    <div class="ration-meal-head">
      <div>
        <h3>${group.data.label}</h3>
        <strong>${round(total.calories)} ккал</strong>
      </div>
      <div class="entry-macros">
        <span>Б ${round(total.protein)}</span>
        <span>Ж ${round(total.fat)}</span>
        <span>У ${round(total.carbs)}</span>
      </div>
    </div>
    <ul class="ration-products">
      ${group.items.map((item) => `<li>${escapeHtml(item.label)}</li>`).join("")}
    </ul>
  </article>`;
}

function analyticsPeriodsCard() {
  return `<button class="period-entry-card" type="button" data-action="open-period-analytics">
    <span>
      <strong>Аналитика по периодам</strong>
      <em>Просмотр статистики за неделю, месяц или произвольный диапазон дат.</em>
    </span>
    <b>›</b>
  </button>`;
}

function screenAnalyticsPeriods() {
  const range = analyticsPeriodRange();
  const history = analyticsHistoryForRange(range.start, range.end);
  const stats = analyticsStats(history);
  return `<section class="${screenStateClass("analytics")}">
    <div class="stack">
      <header class="analytics-page-head">
        <button class="back-link" type="button" data-action="analytics-back">Назад</button>
        <h1>Аналитика по периодам</h1>
      </header>
      <button class="period-picker-btn" type="button" data-action="open-period-sheet">
        <span>${range.label}</span>
        <b>⌄</b>
      </button>
      ${periodSummaryCard(stats, history.length)}
      ${analyticsHistoryView(history)}
      ${bestStatsBlock(history)}
    </div>
  </section>`;
}

function periodOptions() {
  return [
    ["last7", "Последние 7 дней"],
    ["last14", "Последние 14 дней"],
    ["last30", "Последние 30 дней"],
    ["last90", "Последние 90 дней"],
    ["thisMonth", "Этот месяц"],
    ["prevMonth", "Прошлый месяц"],
    ["all", "За всё время"],
    ["custom", "Выбрать диапазон"]
  ];
}

function monthStart(value) {
  const date = new Date(`${value}T00:00:00`);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function monthEnd(value) {
  const date = new Date(`${value}T00:00:00`);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function previousMonthRange() {
  const date = new Date(`${todayIso()}T00:00:00`);
  date.setMonth(date.getMonth() - 1);
  const iso = toIsoDate(date);
  return { start: monthStart(iso), end: monthEnd(iso) };
}

function analyticsPeriodRange(type = analyticsPeriod.type) {
  const min = analyticsMinDate();
  const today = todayIso();
  let start = today;
  let end = today;
  let custom = false;
  let label = periodOptions().find(([id]) => id === type)?.[1] || "Последние 7 дней";

  if (type?.startsWith("last")) {
    const days = number(type.replace("last", ""), 7);
    start = addDays(today, -(days - 1));
  } else if (type === "thisMonth") {
    start = monthStart(today);
  } else if (type === "prevMonth") {
    const range = previousMonthRange();
    start = range.start;
    end = range.end;
  } else if (type === "all") {
    start = min;
  } else if (type === "custom") {
    start = analyticsPeriod.start || min;
    end = analyticsPeriod.end || today;
    custom = true;
  }

  start = clampDate(start, min, today);
  end = clampDate(end, min, today);
  if (start > end) [start, end] = [end, start];
  if (custom) label = `${formatDayTitle(start)} — ${formatDayTitle(end)}`;
  return { start, end, label };
}

function analyticsHistoryForRange(start, end) {
  const rows = [];
  const cursor = new Date(`${end}T00:00:00`);
  const min = new Date(`${start}T00:00:00`);
  while (cursor >= min) {
    const iso = toIsoDate(cursor);
    const items = state.diary[iso] || [];
    rows.push({ date: iso, nutrients: sumNutrients(items), count: items.length });
    cursor.setDate(cursor.getDate() - 1);
  }
  return rows;
}

function analyticsPeriodSheet() {
  const min = analyticsMinDate();
  const today = todayIso();
  const showCustom = analyticsPeriod.type === "custom";
  const draftStart = clampDate(analyticsCustomDraft.start || analyticsPeriod.start || min, min, today);
  const draftEnd = clampDate(analyticsCustomDraft.end || analyticsPeriod.end || today, min, today);
  return `<div class="modal-backdrop" data-modal-close="period-sheet">
    <div class="modal-card period-sheet" role="dialog" aria-modal="true" aria-label="Выбор периода">
      <div class="modal-head">
        <div>
          <span>Период</span>
          <h3>Аналитика по периодам</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-period-sheet">×</button>
      </div>
      <div class="period-option-list">
        ${periodOptions().map(([id, label]) => `<button class="period-option ${analyticsPeriod.type === id ? "active" : ""}" type="button" data-period-type="${id}">${label}</button>`).join("")}
      </div>
      ${showCustom ? `<form class="period-custom-form" data-form="period-custom">
        <div class="form-grid">
          <div class="field"><label>Начало</label><input name="start" type="date" min="${min}" max="${today}" value="${draftStart}"></div>
          <div class="field"><label>Окончание</label><input name="end" type="date" min="${min}" max="${today}" value="${draftEnd}"></div>
        </div>
        <button class="primary-btn full-btn" type="submit">Показать</button>
      </form>` : ""}
    </div>
  </div>`;
}

function saveAnalyticsCustomRange(form) {
  const min = analyticsMinDate();
  const today = todayIso();
  let start = clampDate(form.start.value || min, min, today);
  let end = clampDate(form.end.value || today, min, today);
  if (start > end) [start, end] = [end, start];
  analyticsPeriod = { type: "custom", start, end };
  analyticsCustomDraft = { start, end };
  periodSheetOpen = false;
  render();
}

function bestStatsBlock(history) {
  const withValues = history.map((row) => ({
    ...row,
    water: waterTotal(row.date),
    calories: row.nutrients.calories,
    protein: row.nutrients.protein
  }));
  const maxProtein = maxBy(withValues, (row) => row.protein);
  const maxWater = maxBy(withValues, (row) => row.water);
  const maxCalories = maxBy(withValues, (row) => row.calories);
  return `<section class="section-block">
    <h2>ЛУЧШИЕ ПОКАЗАТЕЛИ</h2>
    <div class="best-stats-list">
      ${bestStatCard("Максимум белка", maxProtein, `${round(maxProtein?.protein)} г`)}
      ${bestStatCard("Максимум воды", maxWater, `${round(maxWater?.water)} мл`)}
      ${bestStatCard("Самый калорийный день", maxCalories, `${round(maxCalories?.calories)} ккал`)}
    </div>
  </section>`;
}

function maxBy(items, getter) {
  return items.reduce((best, item) => getter(item) > getter(best || item) ? item : best, null);
}

function bestStatCard(label, row, value) {
  return `<article class="best-stat-card">
    <span>${label}</span>
    <strong>${value || "—"}</strong>
    <em>${row ? formatDayTitle(row.date) : "Нет данных"}</em>
  </article>`;
}

function statCard(label, value) {
  return `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function screenAdd() {
  return `<section class="${screenStateClass("add")}">
    <div class="stack">
      ${addPageContent()}
    </div>
  </section>`;
}

function addPageContent() {
  if (addPage === "ration") return addRationPage();
  if (addPage === "ration-amounts") return addRationAmountsPage();
  if (addPage === "template") return createTemplatePage();
  if (addPage === "product") return createProductPage();
  if (addPage === "dish") return dishBuilderPanel();
  if (addPage === "dish-library") return dishIngredientLibraryPage();
  if (addPage === "dish-library-amounts") return dishIngredientAmountsPage();
  if (addPage === "eighty") return eightyCategoriesPage();
  if (addPage === "eighty-category") return eightyCategoryPage();
  if (addPage === "eighty-amounts") return eightyImportAmountsPage();
  return addHomePage();
}

function addBackHeader(title, backPage = "home") {
  return `<header class="screen-header add-subpage-head">
    <button class="back-link" type="button" data-add-page="${backPage}">← Назад</button>
    <h1>${title}</h1>
  </header>`;
}

function addHomePage() {
  return `
    <header class="screen-header add-home-head">
      <span>ДОБАВЛЕНИЕ В ДНЕВНИК</span>
      <div class="add-title-row">
        <h1>Выбор продуктов</h1>
        <div class="add-create-wrap" data-create-menu-root>
          <button class="add-create-btn" type="button" data-action="toggle-add-create-menu">+ Создать</button>
          ${addCreateMenuOpen ? addCreateMenu() : ""}
        </div>
      </div>
    </header>
    ${addRationPage(false)}`;
}

function addCreateMenu() {
  return `<div class="add-create-menu">
    <button type="button" data-add-page="product">🥫 Создать продукт</button>
    <button type="button" data-add-page="dish">🍽️ Создать блюдо</button>
    <button type="button" data-add-page="template">⭐ Создать шаблон</button>
  </div>`;
}

function clampTemplateDate(value) {
  return clampDate(value || todayIso(), addDays(todayIso(), -7), todayIso());
}

function templateSourceMeals(date = templateSourceDate) {
  return Object.entries(labels.meals)
    .map(([meal, data]) => ({ meal, data, items: (state.diary[date] || []).filter((item) => item.meal === meal) }))
    .filter((group) => group.items.length > 0);
}

function mealTemplateStats(items = []) {
  return sumNutrients(items.map((item) => ({ nutrients: item.nutrients || {} })));
}

function createTemplatePage() {
  templateSourceDate = clampTemplateDate(templateSourceDate);
  const groups = templateSourceMeals(templateSourceDate);
  return `
    <header class="screen-header add-subpage-head">
      <button class="back-link" type="button" data-add-page="home">← Назад</button>
      <span>ШАБЛОНЫ ПРИЁМОВ ПИЩИ</span>
      <h1>Создать шаблон</h1>
    </header>
    ${templateDateSwitcher()}
    <div class="template-source-list">
      ${groups.length
        ? groups.map(templateSourceMealCard).join("")
        : `<div class="big-empty compact-empty"><div><strong>Нет заполненных приёмов пищи</strong><span>Выберите другой день за последнюю неделю.</span></div></div>`}
    </div>`;
}

function templateDateSwitcher() {
  const min = addDays(todayIso(), -7);
  const isToday = templateSourceDate >= todayIso();
  const isMin = templateSourceDate <= min;
  return `<div class="date-switcher">
    <button class="icon-btn" type="button" data-template-date-step="-1" title="Предыдущий день" ${isMin ? "disabled" : ""}>${icons.prev}</button>
    <strong>${formatDayTitle(templateSourceDate)}</strong>
    <button class="icon-btn" type="button" data-template-date-step="1" title="Следующий день" ${isToday ? "disabled" : ""}>${icons.next}</button>
  </div>`;
}

function templateSourceMealCard(group) {
  const stats = mealTemplateStats(group.items);
  return `<button class="template-source-card" type="button" data-create-template-meal="${group.meal}">
    <span>
      <strong>${group.data.label}</strong>
      <em>${pluralProduct(group.items.length)}</em>
    </span>
    <b>${round(stats.calories)} ккал</b>
    <div class="template-macros">
      <span>Б ${round(stats.protein)}</span>
      <span>Ж ${round(stats.fat)}</span>
      <span>У ${round(stats.carbs)}</span>
    </div>
  </button>`;
}

function templatesSection() {
  const templates = state.mealTemplates || [];
  return `<section class="templates-panel">
    <div class="templates-head">
      <h2>ШАБЛОНЫ</h2>
      <button class="ios-switch ${mealTemplatesVisible ? "active" : ""}" type="button" data-action="toggle-templates" aria-label="Показать шаблоны" aria-pressed="${mealTemplatesVisible}"><i></i></button>
    </div>
    ${mealTemplatesVisible ? `<div class="template-list">
      ${templates.length ? templates.map(mealTemplateCard).join("") : `<div class="empty-line">Сохранённых шаблонов пока нет</div>`}
    </div>` : ""}
  </section>`;
}

function mealTemplateCard(template) {
  const stats = mealTemplateStats(template.items || []);
  return `<article class="template-card">
    <button class="template-card-main" type="button" data-use-template="${template.id}">
      <strong>${escapeHtml(template.name || "Шаблон")}</strong>
      <em>${pluralProduct((template.items || []).length)}</em>
      <b>${round(stats.calories)} ккал</b>
      <div class="template-macros">
        <span>Б ${round(stats.protein)}</span>
        <span>Ж ${round(stats.fat)}</span>
        <span>У ${round(stats.carbs)}</span>
      </div>
    </button>
    <div class="template-actions">
      <button class="icon-btn compact neutral" type="button" data-edit-template="${template.id}" title="Переименовать">✎</button>
      <button class="icon-btn compact delete-btn" type="button" data-confirm-delete-template="${template.id}" title="Удалить">${icons.trash}</button>
    </div>
  </article>`;
}

function openTemplateCreator(meal) {
  const group = templateSourceMeals(templateSourceDate).find((item) => item.meal === meal);
  if (!group?.items?.length) return toast("В этом приёме нет продуктов");
  mealTemplateEditor = {
    mode: "create",
    date: templateSourceDate,
    meal,
    name: group.data.label
  };
  render();
}

function openTemplateRename(id) {
  const template = (state.mealTemplates || []).find((item) => item.id === id);
  if (!template) return;
  mealTemplateEditor = { mode: "rename", id, name: template.name || "" };
  render();
}

function mealTemplateModal() {
  const editor = mealTemplateEditor;
  if (!editor) return "";
  const isCreate = editor.mode === "create";
  return `<div class="modal-backdrop" data-modal-close="meal-template">
    <div class="modal-card meal-template-modal" role="dialog" aria-modal="true" aria-label="${isCreate ? "Создание шаблона" : "Переименование шаблона"}">
      <div class="modal-head">
        <div>
          <span>${isCreate ? "⭐ Новый шаблон" : "⭐ Шаблон"}</span>
          <h3>${isCreate ? "Название шаблона" : "Переименовать"}</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-meal-template">×</button>
      </div>
      <form class="form-grid" data-form="meal-template">
        <input type="hidden" name="mode" value="${escapeHtml(editor.mode)}">
        <input type="hidden" name="id" value="${escapeHtml(editor.id || "")}">
        <input type="hidden" name="date" value="${escapeHtml(editor.date || "")}">
        <input type="hidden" name="meal" value="${escapeHtml(editor.meal || "")}">
        <div class="field full"><label>Название шаблона</label><input name="name" value="${escapeHtml(editor.name || "")}" placeholder="Любимый ужин" required></div>
        <div class="modal-actions field full">
          <button class="secondary-btn" type="button" data-action="close-meal-template">Отмена</button>
          <button class="primary-btn" type="submit">Сохранить</button>
        </div>
      </form>
    </div>
  </div>`;
}

function saveMealTemplate(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) return toast("Введите название");
  const mode = data.get("mode");
  if (mode === "rename") {
    const template = (state.mealTemplates || []).find((item) => item.id === data.get("id"));
    if (!template) return;
    template.name = name;
    mealTemplateEditor = null;
    persist();
    render();
    toast("Шаблон сохранён");
    return;
  }

  const date = clampTemplateDate(data.get("date"));
  const meal = data.get("meal");
  const items = (state.diary[date] || []).filter((item) => item.meal === meal);
  if (!items.length) return toast("В этом приёме нет продуктов");
  state.mealTemplates ||= [];
  state.mealTemplates.unshift({
    id: uid(),
    name,
    sourceDate: date,
    sourceMeal: meal,
    createdAt: new Date().toISOString(),
    items: items.map((item) => ({
      productId: item.productId || "",
      label: item.label || "",
      amount: item.amount,
      unit: item.unit || "г",
      nutrients: { ...(item.nutrients || {}) }
    }))
  });
  mealTemplateEditor = null;
  mealTemplatesVisible = true;
  persist();
  render();
  toast("Шаблон создан");
}

function useMealTemplate(id) {
  const template = (state.mealTemplates || []).find((item) => item.id === id);
  if (!template?.items?.length) return;
  const meal = entryDraft.meal || "breakfast";
  for (const item of template.items) {
    entriesForDate().push({
      id: uid(),
      meal,
      productId: item.productId || "",
      label: item.label || "Продукт",
      amount: item.amount,
      unit: item.unit || "г",
      nutrients: { ...(item.nutrients || {}) },
      createdAt: new Date().toISOString()
    });
  }
  persist();
  render();
  toast("Шаблон добавлен");
}

function deleteMealTemplate(id) {
  state.mealTemplates = (state.mealTemplates || []).filter((item) => item.id !== id);
  deleteConfirm = null;
  mealTemplateEditor = null;
  persist();
  render();
  toast("Шаблон удалён");
}

function addRationPage(showHeader = true) {
  const products = filteredAddProducts();
  const selectedCount = selectedMealItems().length;
  return `
    ${showHeader ? addBackHeader("Добавить в рацион") : ""}
    <div class="add-meal-flow add-ration-page">
      ${templatesSection()}
      ${addFoodSearchRow()}
      <div class="product-choice-list">
        ${products.length
          ? products.map(rationChoiceCard).join("")
          : `<div class="big-empty compact-empty"><div><strong>Ничего не найдено</strong><span>Попробуйте изменить запрос или открыть каталог Eighty.</span></div></div>`}
      </div>
      <button class="primary-btn full-btn add-meal-submit sticky-add-submit" type="button" data-action="ration-next" ${selectedCount ? "" : "disabled"}>Добавить (${selectedCount})</button>
    </div>`;
}

function addFoodSearchRow() {
  return productSearchToolsRow({
    inputAttrs: `data-add-food-query value="${escapeHtml(addFoodQuery)}"`,
    placeholder: "Поиск продуктов и блюд",
    libraryAttrs: `data-add-page="eighty"`
  });
}

function favoritesSearchRow() {
  return productSearchToolsRow({
    inputAttrs: `data-favorites-query value="${escapeHtml(favoritesQuery)}"`,
    placeholder: "Поиск",
    libraryAttrs: `data-favorites-page="eighty"`
  });
}

function productSearchToolsRow({ inputAttrs, placeholder, libraryAttrs }) {
  return `<div class="dish-search-row product-search-tools">
    <input class="search-input" ${inputAttrs} placeholder="${escapeHtml(placeholder)}">
    <button class="icon-btn library-open-btn barcode-open-btn" type="button" data-action="open-barcode-scanner" title="Сканировать штрихкод" aria-label="Сканировать штрихкод">📷</button>
    <button class="icon-btn library-open-btn" type="button" ${libraryAttrs} title="База Eighty" aria-label="База Eighty">📚</button>
  </div>`;
}

function rationChoiceCard(product) {
  const selected = hasDraftItem(product.id);
  const label = productChoiceLabel(product, true);
  return `<article class="product-choice ration-choice ${selected ? "selected" : ""}">
    <button class="product-choice-main" type="button" data-toggle-product="${product.id}">
      <span class="product-choice-copy">
        <strong>${escapeHtml(product.name)}</strong>
        <em>${label}</em>
        ${productMacroStrip(product)}
      </span>
      <span class="product-choice-side">
        ${builtinBadge(product)}
        <b>${round(product.calories)} ккал</b>
      </span>
      ${selected ? `<i class="choice-check">✓</i>` : ""}
    </button>
  </article>`;
}

function productMacroStrip(product) {
  return `<span class="product-choice-macros">
    <span>Б ${round(product.protein, 1)}</span>
    <span>Ж ${round(product.fat, 1)}</span>
    <span>У ${round(product.carbs, 1)}</span>
  </span>`;
}

function addRationAmountsPage() {
  const items = selectedMealItems();
  const complete = items.length && items.every(({ amount }) => number(amount, 0) > 0);
  return `
    ${addBackHeader("Количество", "ration")}
    <form class="add-meal-flow" data-form="entry">
      <input type="hidden" name="meal" value="${entryDraft.meal}">
      ${amountMealPicker()}
      <div class="product-choice-list">
        ${items.length ? items.map(rationAmountCard).join("") : `<div class="empty-line">Выберите продукты</div>`}
      </div>
      <button class="primary-btn full-btn add-meal-submit sticky-add-submit" type="submit" ${complete ? "" : "disabled"}>${mealButtonLabel(entryDraft.meal)}</button>
    </form>`;
}

function amountMealPicker() {
  const meals = Object.entries(labels.meals);
  const activeIndex = Math.max(0, meals.findIndex(([id]) => entryDraft.meal === id));
  return `<div class="amount-meal-picker" data-active-index="${activeIndex}" role="group" aria-label="Приём пищи">
    ${meals.map(([id, data]) => `<button class="${entryDraft.meal === id ? "active" : ""}" type="button" data-add-meal="${id}">
      <span>${data.icon}</span>
      <strong>${data.short}</strong>
    </button>`).join("")}
  </div>`;
}

function rationAmountCard({ product, amount }) {
  const label = product.kind === "dish" ? "Вес порции, г" : productAmountLabel(product);
  const unit = productAmountUnit(product);
  const isPiece = product.type === "piece";
  const currentAmount = normalizeProductAmount(product, amount);
  const minusDisabled = isPiece && Number(currentAmount) <= 1;
  return `<article class="product-choice selected amount-card">
    <div class="product-choice-main static-choice">
      <span>
        <strong>${escapeHtml(product.name)}</strong>
        <em>${label}</em>
      </span>
      <b>${round(product.calories)} ккал</b>
    </div>
    <div class="product-choice-amount amount-stepper ${isPiece ? "piece-stepper" : "manual-amount"}">
      ${isPiece ? `<button class="amount-step-btn" type="button" data-amount-step="${product.id}" data-step="-1" aria-label="Уменьшить количество" ${minusDisabled ? "disabled" : ""}>−</button>` : ""}
      <label class="amount-value" for="amount-${product.id}">
        <input id="amount-${product.id}" data-cart-amount="${product.id}" type="number" min="1" step="${product.type === "piece" ? "1" : "0.1"}" inputmode="${product.type === "piece" ? "numeric" : "decimal"}" enterkeyhint="next" aria-label="${label}" placeholder="${productAmountPlaceholder(product)}" value="${escapeHtml(amount)}">
        <span>${unit}</span>
      </label>
      ${isPiece ? `<button class="amount-step-btn" type="button" data-amount-step="${product.id}" data-step="1" aria-label="Увеличить количество">+</button>` : ""}
    </div>
  </article>`;
}

function existingProductPanel() {
  const products = filteredAddProducts();
  return `<form class="add-meal-flow" data-form="entry">
    <input type="hidden" name="meal" value="${entryDraft.meal}">
    ${addFoodSearchRow()}
    ${mealCartPanel()}
    ${myFoodPanel(products)}
  </form>`;
}

function filteredAddProducts() {
  const query = addFoodQuery.trim().toLowerCase();
  const personal = addMealItems();
  if (!query) return personal;
  const personalMatches = personal.filter((item) => item.name.toLowerCase().includes(query));
  const eightyMatches = userEightyFoods()
    .filter((item) => item.name.toLowerCase().includes(query))
    .map(eightyAddMealItem);
  return [...personalMatches, ...eightyMatches];
}

function myFoodPanel(products) {
  return `
    <div class="product-choice-list" data-add-products-list>
      ${products.length
        ? products.map(productChoiceCard).join("")
        : `<div class="big-empty compact-empty"><div><strong>Нет продуктов</strong><span>${addFoodQuery.trim() ? "Поиск ничего не нашёл." : "Создайте продукт в личной библиотеке."}</span></div></div>`}
    </div>
    <button class="primary-btn full-btn add-meal-submit" type="submit" ${selectedMealItems().length ? "" : "disabled"}>${mealButtonLabel(entryDraft.meal)}</button>`;
}

function eightyFoodPanel() {
  const query = addFoodQuery.trim().toLowerCase();
  const selectedCategory = eightyFoodCategories.find((category) => category.id === eightyCategoryId);
  if (!query && !selectedCategory) {
    return `<div class="eighty-category-list">
      ${eightyFoodCategories.map((category) => `<button class="eighty-category-card" type="button" data-eighty-category="${category.id}">
        <span>${category.icon}</span>
        <strong>${category.label}</strong>
      </button>`).join("")}
      <p class="eighty-source-note">Используются средние справочные значения КБЖУ на 100 г. При необходимости вы можете изменить их после добавления продукта.</p>
    </div>`;
  }

  const products = query
    ? userEightyFoods().filter((product) => product.name.toLowerCase().includes(query))
    : userEightyFoods().filter((product) => product.categoryId === selectedCategory.id);

  return `<div class="eighty-food-stack">
    ${!query && selectedCategory ? `<button class="secondary-btn compact-back" type="button" data-eighty-category="">← ${selectedCategory.icon} ${selectedCategory.label}</button>` : ""}
    <div class="product-choice-list">
      ${products.length
        ? products.map(eightyFoodCard).join("")
        : `<div class="empty-line">В базе Eighty ничего не найдено</div>`}
    </div>
  </div>`;
}

function eightyFoodCard(product) {
  return `<article class="product-choice eighty-product">
    <button class="product-choice-main" type="button" data-eighty-food="${product.id}">
      <span>
        <strong>${escapeHtml(product.name)}</strong>
        <em>${product.categoryLabel} · на 100 г</em>
      </span>
      <span class="product-choice-side">
        ${builtinBadge(product)}
        <b>${round(product.calories)} ккал</b>
      </span>
    </button>
    <div class="eighty-macro-line">
      <span>Б ${round(product.protein, 1)}</span>
      <span>Ж ${round(product.fat, 1)}</span>
      <span>У ${round(product.carbs, 1)}</span>
    </div>
  </article>`;
}

function eightyCategoriesPage() {
  const selectedCount = selectedEightyFoods().length;
  return `
    ${addBackHeader("База Eighty")}
    <div class="add-meal-flow">
      <div class="eighty-category-list">
        ${eightyFoodCategories.map((category) => `<button class="eighty-category-card" type="button" data-open-eighty-category="${category.id}">
          <span>${category.icon}</span>
          <strong>${category.label}</strong>
        </button>`).join("")}
      </div>
      ${selectedCount ? `<button class="primary-btn full-btn add-meal-submit sticky-add-submit" type="button" data-action="eighty-import-next">Добавить (${selectedCount})</button>` : ""}
    </div>`;
}

function visibleEightyProducts(categoryId) {
  const query = (eightyImport.query || "").trim().toLowerCase();
  return userEightyFoods()
    .filter((product) => product.categoryId === categoryId)
    .filter((product) => !query || product.name.toLowerCase().includes(query));
}

function selectedEightyFoods() {
  return Object.keys(eightyImport.items || {})
    .map((id) => eightyFoodById(id))
    .filter(Boolean);
}

function eightyCategoryPage() {
  const category = eightyFoodCategories.find((item) => item.id === eightyCategoryId) || eightyFoodCategories[0];
  const products = visibleEightyProducts(category.id);
  const selectedCount = selectedEightyFoods().length;
  return `
    ${addBackHeader(`${category.label}`, "eighty")}
    <div class="add-meal-flow">
      <input class="search-input" data-eighty-import-query value="${escapeHtml(eightyImport.query || "")}" placeholder="Поиск">
      <div class="product-choice-list">
        ${products.length
          ? products.map(eightyImportChoiceCard).join("")
          : `<div class="big-empty compact-empty"><div><strong>Ничего не найдено</strong><span>Измените поиск или выберите другую категорию.</span></div></div>`}
      </div>
      ${selectedCount ? `<button class="primary-btn full-btn add-meal-submit sticky-add-submit" type="button" data-action="eighty-import-next">Добавить (${selectedCount})</button>` : ""}
    </div>`;
}

function eightyImportChoiceCard(product) {
  const selected = Object.prototype.hasOwnProperty.call(eightyImport.items, product.id);
  return `<article class="product-choice ration-choice ${selected ? "selected" : ""}">
    <button class="product-choice-main" type="button" data-toggle-eighty-import="${product.id}">
      <span>
        <strong>${escapeHtml(product.name)}</strong>
        <em>${product.categoryLabel} · на 100 г</em>
      </span>
      <b>${round(product.calories)} ккал</b>
      ${selected ? `<i class="choice-check">✓</i>` : ""}
    </button>
  </article>`;
}

function eightyImportAmountsPage() {
  const products = selectedEightyFoods();
  const complete = products.length && products.every((product) => number(eightyImport.items[product.id]) > 0);
  return `
    ${addBackHeader("Вес продуктов", "eighty-category")}
    <form class="add-meal-flow" data-form="eighty-import">
      <div class="product-choice-list">
        ${products.length ? products.map(eightyImportAmountCard).join("") : `<div class="empty-line">Выберите продукты</div>`}
      </div>
      <button class="primary-btn full-btn sticky-add-submit" type="submit" ${complete ? "" : "disabled"}>${mealButtonLabel(entryDraft.meal)}</button>
    </form>`;
}

function eightyImportAmountCard(product) {
  return `<article class="product-choice selected">
    <div class="product-choice-main static-choice">
      <span>
        <strong>${escapeHtml(product.name)}</strong>
        <em>Вес</em>
      </span>
      <b>${round(product.calories)} ккал</b>
    </div>
    <div class="product-choice-amount">
      <label for="eighty-import-${product.id}">Вес, г</label>
      <input id="eighty-import-${product.id}" name="eighty-${product.id}" data-eighty-import-amount="${product.id}" type="number" min="1" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="0" value="${escapeHtml(eightyImport.items[product.id])}">
    </div>
  </article>`;
}

function savedEightyProduct(food) {
  return state.products.find((product) => product.sourceId === food.sourceId)
    || state.products.find((product) => product.name.toLowerCase() === food.name.toLowerCase() && product.type === "weight");
}

function saveEightyProduct(food) {
  const existing = savedEightyProduct(food);
  if (existing) return existing;
  const product = {
    id: uid(),
    source: "eighty",
    sourceId: food.sourceId,
    name: food.name,
    type: "weight",
    calories: food.calories,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
    cookedDryWeight: 100,
    cookedReadyWeight: 100
  };
  state.products.unshift(product);
  return product;
}

function nutritionSummary(product, amount = 100) {
  const nutrients = calcProduct(product, amount);
  return `<div class="eighty-nutrition-grid">
    <div><span>Ккал</span><b>${round(nutrients.calories)}</b></div>
    <div><span>Б</span><b>${round(nutrients.protein, 1)}</b></div>
    <div><span>Ж</span><b>${round(nutrients.fat, 1)}</b></div>
    <div><span>У</span><b>${round(nutrients.carbs, 1)}</b></div>
  </div>`;
}

function eightyFoodModal() {
  const food = eightyFoodById(eightyFoodDialog?.foodId);
  if (!food) return "";
  const amount = Math.max(0, number(eightyFoodDialog.amount, 100));
  return `<div class="modal-backdrop" data-modal-close="eighty-food">
    <div class="modal-card eighty-food-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(food.name)}">
      <div class="modal-head">
        <div>
          <span>${food.categoryLabel}</span>
          <h3>${escapeHtml(food.name)}</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-eighty-food">×</button>
      </div>
      <div class="eighty-food-section">
        <span>На 100 г</span>
        ${nutritionSummary(food, 100)}
      </div>
      <label class="field eighty-weight-field">
        <span>Вес</span>
        <input name="eightyAmount" type="number" min="1" step="0.1" inputmode="decimal" enterkeyhint="done" value="${escapeHtml(eightyFoodDialog.amount)}">
      </label>
      <div class="eighty-food-section" data-eighty-food-total>
        <span>Итого</span>
        ${nutritionSummary(food, amount)}
      </div>
      <button class="primary-btn full-btn" type="button" data-action="add-eighty-food">${mealButtonLabel(entryDraft.meal)}</button>
    </div>
  </div>`;
}

function barcodeScannerModal() {
  return `<div class="modal-backdrop" data-modal-close="barcode-scanner">
    <div class="modal-card barcode-scanner-modal" role="dialog" aria-modal="true" aria-label="Сканирование штрихкода">
      <div class="modal-head">
        <div>
          <span>ШТРИХКОД</span>
          <h3>Сканировать продукт</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-barcode-scanner">×</button>
      </div>
      <div class="barcode-reader-box">
        <div id="barcode-reader"></div>
      </div>
      <p class="barcode-scanner-message" data-barcode-message>${escapeHtml(barcodeScannerMessage || "Наведите камеру на штрихкод")}</p>
      <button class="secondary-btn full-btn" type="button" data-action="close-barcode-scanner">Отмена</button>
    </div>
  </div>`;
}

function refreshEightyFoodTotal() {
  if (!eightyFoodDialog) return;
  const modal = app.querySelector(".eighty-food-modal");
  const total = modal?.querySelector("[data-eighty-food-total]");
  const food = eightyFoodById(eightyFoodDialog.foodId);
  if (!total || !food) return;
  const amount = Math.max(0, number(eightyFoodDialog.amount, 100));
  total.innerHTML = `<span>Итого</span>${nutritionSummary(food, amount)}`;
}

function addEightyFoodToMeal() {
  const food = eightyFoodById(eightyFoodDialog?.foodId);
  if (!food) return;
  const amount = number(eightyFoodDialog.amount);
  if (amount <= 0) return toast("Введите вес");
  const product = saveEightyProduct(food);
  const meal = entryDraft.meal;
  entriesForDate().push({
    id: uid(),
    meal,
    productId: product.id,
    label: product.name,
    amount,
    unit: "г",
    nutrients: calcProduct(product, amount),
    createdAt: new Date().toISOString()
  });
  eightyFoodDialog = null;
  addFoodSource = "mine";
  blurActive();
  persist();
  render();
  toast("✅ Добавлено в рацион");
}

function saveEightyImport(form) {
  const data = new FormData(form);
  for (const product of selectedEightyFoods()) {
    const amount = optionalNumber(data.get(`eighty-${product.id}`) || eightyImport.items[product.id]);
    eightyImport.items[product.id] = amount;
  }
  const selected = selectedEightyFoods().filter((product) => number(eightyImport.items[product.id]) > 0);
  if (!selected.length) return toast("Введите вес");
  const meal = entryDraft.meal || "breakfast";
  for (const food of selected) {
    const product = saveEightyProduct(food);
    const amount = number(eightyImport.items[food.id]);
    entriesForDate().push({
      id: uid(),
      meal,
      productId: product.id,
      label: product.name,
      amount,
      unit: "г",
      nutrients: calcProduct(product, amount),
      createdAt: new Date().toISOString()
    });
  }
  eightyImport = { items: {}, query: "" };
  entryDraft = { meal, items: {} };
  addPage = "home";
  persist();
  render();
  toast("Продукты успешно добавлены.");
}

function mealCartPanel() {
  const items = selectedMealItems();
  return `<div class="meal-cart ${mealCartOpen ? "open" : ""}">
    <button class="meal-cart-toggle" type="button" data-action="toggle-cart">
      <span>Выбрано продуктов: ${items.length}</span>
      <strong>${labels.meals[entryDraft.meal]?.short || "Приём пищи"}</strong>
    </button>
    ${mealCartOpen ? `<div class="meal-cart-list">
      ${items.length
        ? items.map(({ product, amount }) => `<div><span>${escapeHtml(product.name)}</span><b>${formatCartAmount(product, amount)}</b></div>`).join("")
        : `<div class="empty-line">Выберите продукты для текущего приёма пищи</div>`}
    </div>` : ""}
  </div>`;
}

function productChoiceCard(product) {
  const selected = hasDraftItem(product.id);
  const amount = entryDraft.items[product.id];
  const label = productChoiceLabel(product);
  return `<article class="product-choice ${selected ? "selected" : ""}">
    <button class="product-choice-main" type="button" data-toggle-product="${product.id}">
      <span>
        <strong>${escapeHtml(product.name)}</strong>
        <em>${label}</em>
      </span>
      <span class="product-choice-side">
        ${builtinBadge(product)}
        <b>${round(product.calories)} ккал</b>
      </span>
    </button>
    ${selected ? `<div class="product-choice-amount">
      <label for="amount-${product.id}">${productAmountLabel(product)}</label>
      <input id="amount-${product.id}" data-cart-amount="${product.id}" type="number" min="1" step="${product.type === "piece" ? "1" : "0.1"}" inputmode="${product.type === "piece" ? "numeric" : "decimal"}" enterkeyhint="next" placeholder="${productAmountPlaceholder(product)}" value="${escapeHtml(amount)}">
    </div>` : ""}
  </article>`;
}

function manualProductForm() {
  return `<div class="panel">
    <button class="create-dish-btn" type="button" data-action="open-dish-builder">
      <strong>Создать блюдо</strong>
    </button>
    <form class="form-grid" data-form="product">
      <div class="field full"><label>Название</label><input name="name" placeholder="Спагетти" enterkeyhint="next" required></div>
      <div class="field full"><label>Тип продукта</label><select name="type">${Object.entries(labels.productTypes).map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></div>
      <div class="field"><label>Калории</label><input name="calories" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="ккал"></div>
      <div class="field"><label>Белки</label><input name="protein" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г"></div>
      <div class="field"><label>Жиры</label><input name="fat" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г"></div>
      <div class="field"><label>Углеводы</label><input name="carbs" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г"></div>
      <div class="field cooked-field"><label>Сухой вес, г</label><input name="cookedDryWeight" type="number" step="1" inputmode="numeric" placeholder="0"></div>
      <div class="field cooked-field"><label>Вес после приготовления, г</label><input name="cookedReadyWeight" type="number" step="1" inputmode="numeric" placeholder="0"></div>
      <div class="field full"><button class="primary-btn" type="submit">Сохранить продукт</button></div>
    </form>
  </div>`;
}

function createProductPage() {
  const draft = productCreateDraft || {};
  const type = draft.type || "weight";
  return `
    ${addBackHeader("Создать продукт")}
    <div class="panel">
      <form class="form-grid ${type === "cooked" ? "cooked-mode" : ""}" data-form="product">
        <div class="field full"><label>Название</label><input name="name" value="${escapeHtml(draft.name || "")}" placeholder="Спагетти" enterkeyhint="next" required></div>
        <div class="field full"><label>Тип продукта</label><select name="type">${Object.entries(labels.productTypes).map(([id, label]) => `<option value="${id}" ${id === type ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="field"><label>Калории</label><input name="calories" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="ккал" value="${escapeHtml(draft.calories || "")}"></div>
        <div class="field"><label>Белки</label><input name="protein" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г" value="${escapeHtml(draft.protein || "")}"></div>
        <div class="field"><label>Жиры</label><input name="fat" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г" value="${escapeHtml(draft.fat || "")}"></div>
        <div class="field"><label>Углеводы</label><input name="carbs" type="number" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="г" value="${escapeHtml(draft.carbs || "")}"></div>
        <div class="field cooked-field"><label>Сухой вес, г</label><input name="cookedDryWeight" type="number" step="1" inputmode="numeric" placeholder="0" value="${escapeHtml(draft.cookedDryWeight || "")}"></div>
        <div class="field cooked-field"><label>Вес после приготовления, г</label><input name="cookedReadyWeight" type="number" step="1" inputmode="numeric" placeholder="0" value="${escapeHtml(draft.cookedReadyWeight || "")}"></div>
        <div class="field full"><button class="primary-btn full-btn" type="submit">Сохранить продукт</button></div>
      </form>
    </div>`;
}

function dishBuilderPanel() {
  const draft = ensureDishBuilder();
  const totals = calcDish(builderDishDraft());
  const results = ingredientSearchItems(draft.query);
  return `
    ${addBackHeader("Создать блюдо")}
    <div class="panel dish-builder-panel">
      <form class="form-grid" data-form="dish-create">
      <div class="field full"><label>Название блюда</label><input name="dishName" value="${escapeHtml(draft.name)}" placeholder="Греческий салат" enterkeyhint="next" required></div>
      <div class="field full"><label>Поиск продукта</label><div class="dish-search-row"><input class="search-input" name="dishSearch" data-dish-search value="${escapeHtml(draft.query)}" placeholder="🔍 Поиск продукта"><button class="icon-btn library-open-btn" type="button" data-action="open-ingredient-library" title="Библиотека">📚</button></div></div>
      ${draft.query.trim() ? `<div class="field full dish-search-results">
        ${results.length
          ? results.map(dishSearchResult).join("")
          : `<div class="empty-line">Ничего не найдено</div>`}
      </div>` : ""}
      <div class="field full">
        <div class="dish-editor-head"><span>Ингредиенты</span></div>
        <div class="dish-ingredient-list">${draft.ingredients.length ? draft.ingredients.map(builderIngredientRow).join("") : `<div class="empty-line">Добавьте ингредиенты через поиск</div>`}</div>
      </div>
      <div class="field full dish-summary">
        <div><span>Общий вес блюда</span><b>${round(totals.totalWeight)} г</b></div>
        <div><span>Общие КБЖУ</span><b>${round(totals.total.calories)} ккал · Белки ${round(totals.total.protein, 1)} г · Жиры ${round(totals.total.fat, 1)} г · Углеводы ${round(totals.total.carbs, 1)} г</b></div>
        <div><span>КБЖУ на 100 г</span><b>${round(totals.per100.calories)} ккал · Б ${round(totals.per100.protein, 1)} · Ж ${round(totals.per100.fat, 1)} · У ${round(totals.per100.carbs, 1)}</b></div>
      </div>
      <div class="field full"><button class="primary-btn full-btn" type="submit">Сохранить блюдо</button></div>
    </form>
  </div>`;
}

function dishSearchResult(entry) {
  const product = entry.product;
  const label = "Мои продукты";
  return `<button class="dish-search-result" type="button" data-add-builder-product="${product.id}">
    <span><strong>${escapeHtml(product.name)}</strong><em>${label}</em></span>
    <b>${round(product.calories)} ккал</b>
  </button>`;
}

function dishIngredientLibraryItems() {
  const query = (ingredientPicker.query || "").trim().toLowerCase();
  if (ingredientPicker.source === "eighty") {
    if (!ingredientPicker.categoryId && !query) return [];
    return userEightyFoods()
      .filter((food) => !ingredientPicker.categoryId || food.categoryId === ingredientPicker.categoryId)
      .filter((food) => !query || food.name.toLowerCase().includes(query));
  }
  return addMealItems()
    .filter((item) => !query || item.name.toLowerCase().includes(query));
}

function selectedIngredientPickerItems() {
  return Object.keys(ingredientPicker.items || {})
    .map((id) => ingredientPicker.source === "eighty" ? eightyFoodById(id) : addMealItemById(id))
    .filter(Boolean);
}

function dishIngredientLibraryPage() {
  const items = dishIngredientLibraryItems();
  const selectedCount = selectedIngredientPickerItems().length;
  const category = eightyFoodCategories.find((item) => item.id === ingredientPicker.categoryId);
  return `
    ${addBackHeader("Выберите ингредиенты", "dish")}
    <div class="add-meal-flow">
      <div class="segmented food-source-segments">
        <button class="${ingredientPicker.source === "mine" ? "active" : ""}" type="button" data-ingredient-source="mine">Мои продукты</button>
        <button class="${ingredientPicker.source === "eighty" ? "active" : ""}" type="button" data-ingredient-source="eighty">📚 База Eighty</button>
      </div>
      ${ingredientPicker.source === "eighty" && !ingredientPicker.categoryId && !ingredientPicker.query.trim() ? `<div class="eighty-category-list">
        ${eightyFoodCategories.map((item) => `<button class="eighty-category-card" type="button" data-ingredient-category="${item.id}">
          <span>${item.icon}</span>
          <strong>${item.label}</strong>
        </button>`).join("")}
      </div>` : ""}
      ${ingredientPicker.source === "eighty" && category ? `<button class="secondary-btn compact-back" type="button" data-ingredient-category="">← ${category.label}</button>` : ""}
      <input class="search-input" data-ingredient-picker-query value="${escapeHtml(ingredientPicker.query || "")}" placeholder="Поиск">
      ${ingredientPicker.source === "mine" || ingredientPicker.categoryId || ingredientPicker.query.trim() ? `<div class="product-choice-list">
        ${items.length
          ? items.map(ingredientPickerCard).join("")
          : `<div class="big-empty compact-empty"><div><strong>Ничего не найдено</strong><span>${ingredientPicker.source === "eighty" ? "Выберите категорию или измените поиск." : "Здесь отображаются только ваши продукты и блюда."}</span></div></div>`}
      </div>` : ""}
      ${selectedCount ? `<button class="primary-btn full-btn add-meal-submit sticky-add-submit" type="button" data-action="ingredient-picker-next">Добавить (${selectedCount})</button>` : ""}
    </div>`;
}

function ingredientPickerCard(item) {
  const selected = Object.prototype.hasOwnProperty.call(ingredientPicker.items, item.id);
  const label = ingredientPicker.source === "eighty"
    ? `${item.categoryLabel}`
    : item.kind === "dish" ? "Блюдо" : "Продукт";
  return `<article class="product-choice ration-choice ${selected ? "selected" : ""}">
    <button class="product-choice-main" type="button" data-toggle-ingredient-picker="${item.id}">
      <span>
        <strong>${escapeHtml(item.name)}</strong>
        <em>${label} · ${round(item.calories)} ккал на 100 г</em>
      </span>
      <b>${round(item.calories)} ккал</b>
      ${selected ? `<i class="choice-check">✓</i>` : ""}
    </button>
  </article>`;
}

function dishIngredientAmountsPage() {
  const items = selectedIngredientPickerItems();
  const complete = items.length && items.every((item) => number(ingredientPicker.items[item.id]) > 0);
  return `
    ${addBackHeader("Вес ингредиентов", "dish-library")}
    <form class="add-meal-flow" data-form="dish-ingredient-add">
      <div class="product-choice-list">
        ${items.length ? items.map(ingredientPickerAmountCard).join("") : `<div class="empty-line">Выберите ингредиенты</div>`}
      </div>
      <button class="primary-btn full-btn add-meal-submit sticky-add-submit" type="submit" ${complete ? "" : "disabled"}>Добавить в блюдо</button>
    </form>`;
}

function ingredientPickerAmountCard(item) {
  return `<article class="product-choice selected">
    <div class="product-choice-main static-choice">
      <span>
        <strong>${escapeHtml(item.name)}</strong>
        <em>Вес</em>
      </span>
      <b>${round(item.calories)} ккал</b>
    </div>
    <div class="product-choice-amount">
      <label for="ingredient-picker-${item.id}">Вес, г</label>
      <input id="ingredient-picker-${item.id}" name="ingredient-${item.id}" data-ingredient-picker-amount="${item.id}" type="number" min="1" step="0.1" inputmode="decimal" enterkeyhint="next" placeholder="0" value="${escapeHtml(ingredientPicker.items[item.id])}">
    </div>
  </article>`;
}

function builderIngredientRow(ingredient) {
  const product = ingredientItemById(ingredient.productId);
  if (!product) return "";
  return `<div class="builder-ingredient-row" data-builder-ingredient="${ingredient.id}">
    <div><strong>${escapeHtml(product.name)}</strong><span>${round(product.calories)} ккал на 100 г</span></div>
    <input name="builderIngredientAmount" type="number" min="1" step="0.1" inputmode="decimal" value="${ingredient.amount || ""}" placeholder="г">
    <button class="icon-btn compact delete-btn" type="button" data-remove-builder-ingredient="${ingredient.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function screenFavorites() {
  if (favoritesPage === "eighty") return screenFavoritesEightyCategories();
  if (favoritesPage === "eighty-category") return screenFavoritesEightyCategory();
  const query = favoritesQuery.trim();
  const items = userLibraryItems(query);
  return `<section class="${screenStateClass("favorites")}">
    <div class="stack">
      <header class="screen-header profile-title">
        <div class="profile-title-row">
          <span>ВАША БИБЛИОТЕКА ПРОДУКТОВ И БЛЮД</span>
        </div>
        <h1>Продукты</h1>
      </header>
      <div class="favorites-tools">
        ${favoritesSearchRow()}
        <div class="segmented sort-segments">
          <button class="${favoritesSort === "az" ? "active" : ""}" type="button" data-favorites-sort="az">А-Я</button>
          <button class="${favoritesSort === "za" ? "active" : ""}" type="button" data-favorites-sort="za">Я-А</button>
        </div>
      </div>
      <div class="list" data-favorites-list>${items.length ? items.map(libraryRow).join("") : `<div class="empty big-empty">${query ? "Ничего не найдено." : "Пока ничего не добавлено."}</div>`}</div>
    </div>
  </section>`;
}

function favoritesBackHeader(title, backPage = "home") {
  return `<header class="screen-header add-subpage-head">
    <button class="back-link" type="button" data-favorites-page="${backPage}">← Назад</button>
    <h1>${title}</h1>
  </header>`;
}

function screenFavoritesEightyCategories() {
  return `<section class="${screenStateClass("favorites")}">
    <div class="stack">
      ${favoritesBackHeader("База Eighty")}
      <div class="eighty-category-list">
        ${eightyFoodCategories.map((category) => `<button class="eighty-category-card" type="button" data-favorites-eighty-category="${category.id}">
          <span>${category.icon}</span>
          <strong>${category.label}</strong>
        </button>`).join("")}
      </div>
    </div>
  </section>`;
}

function favoriteEightyProducts(categoryId) {
  const query = favoritesEightyQuery.trim().toLowerCase();
  return userEightyFoods()
    .filter((food) => food.categoryId === categoryId)
    .filter((food) => !query || food.name.toLowerCase().includes(query))
    .sort((a, b) => favoritesSort === "za"
      ? b.name.localeCompare(a.name, "ru")
      : a.name.localeCompare(b.name, "ru"));
}

function screenFavoritesEightyCategory() {
  const category = eightyFoodCategories.find((item) => item.id === favoritesEightyCategoryId) || eightyFoodCategories[0];
  const products = favoriteEightyProducts(category.id);
  return `<section class="${screenStateClass("favorites")}">
    <div class="stack">
      ${favoritesBackHeader(`${category.label}`, "eighty")}
      <input class="search-input" data-favorites-eighty-query value="${escapeHtml(favoritesEightyQuery)}" placeholder="Поиск">
      <div class="product-choice-list">
        ${products.length
          ? products.map(favoriteEightyCard).join("")
          : `<div class="empty big-empty">Ничего не найдено.</div>`}
      </div>
    </div>
  </section>`;
}

function favoriteEightyCard(product) {
  return `<article class="product-choice eighty-product">
    <button class="product-choice-main" type="button" data-edit-eighty-product="${product.id}">
      <span>
        <strong>${escapeHtml(product.name)}</strong>
        <em>${product.categoryLabel} · на 100 г</em>
      </span>
      <b>${round(product.calories)} ккал</b>
    </button>
    <div class="eighty-macro-line">
      <span>Б ${round(product.protein, 1)}</span>
      <span>Ж ${round(product.fat, 1)}</span>
      <span>У ${round(product.carbs, 1)}</span>
    </div>
  </article>`;
}

function libraryRow(entry) {
  if (entry.kind === "dish") return dishRow(entry.item);
  if (entry.kind === "eighty") return eightyLibraryRow(entry.item);
  return productRow(entry.item);
}

function productRow(product) {
  return `<div class="product-row item-card library-product-card">
    <button class="library-card-main" type="button" data-edit-product="${product.id}">
      <span class="library-card-head">
        <strong>${escapeHtml(product.name)}</strong>
      </span>
      <span class="library-card-meta">${round(product.calories)} ккал • ${productLibraryTypeLabel(product)}</span>
      ${macroBadges(product)}
    </button>
    <button class="icon-btn compact delete-btn" data-confirm-delete-product="${product.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function dishRow(dish) {
  const totals = calcDish(dish);
  const product = dishAsProduct(dish);
  return `<div class="product-row item-card library-product-card">
    <button class="library-card-main" type="button" data-edit-dish="${dish.id}">
      <span class="library-card-head">
        <strong>${escapeHtml(dish.name || "Блюдо")}</strong>
      </span>
      <span class="library-card-meta">${round(totals.per100.calories)} ккал • 100 г</span>
      ${macroBadges(product)}
    </button>
    <button class="icon-btn compact delete-btn" data-confirm-delete-dish="${dish.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function eightyLibraryRow(product) {
  return `<div class="product-row item-card library-product-card">
    <button class="library-card-main" type="button" data-edit-eighty-product="${product.id}">
      <span class="library-card-head">
        <strong>${escapeHtml(product.name)}</strong>
        ${builtinBadge(product)}
      </span>
      <span class="library-card-meta">${round(product.calories)} ккал • 100 г</span>
      ${macroBadges(product)}
    </button>
    <span class="library-card-action-space" aria-hidden="true"></span>
  </div>`;
}

function openProductEditor(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  libraryEditor = { kind: "product", id, draft: { ...product } };
  render();
}

function openDishEditor(id) {
  const dish = state.dishes.find((item) => item.id === id);
  if (!dish) return;
  libraryEditor = {
    kind: "dish",
    id,
    draft: {
      ...dish,
      ingredients: (dish.ingredients || []).map((ingredient) => ({ ...ingredient }))
    }
  };
  render();
}

function openEightyEditor(id) {
  const product = eightyFoodById(id);
  if (!product) return;
  libraryEditor = { kind: "eighty", id, draft: { ...product } };
  render();
}

function productEditModal() {
  const product = libraryEditor?.draft;
  if (!product) return "";
  return `<div class="modal-backdrop" data-modal-close="library-editor">
    <div class="modal-card library-edit-modal" role="dialog" aria-modal="true" aria-label="Редактирование продукта">
      <div class="modal-head">
        <div>
          <span>Продукт</span>
          <h3>${escapeHtml(product.name || "Продукт")}</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-library-editor">×</button>
      </div>
      <form class="form-grid ${product.type === "cooked" ? "cooked-mode" : ""}" data-form="product-edit">
        <input type="hidden" name="id" value="${product.id}">
        <div class="field full"><label>Название</label><input name="name" value="${escapeHtml(product.name || "")}" required></div>
        <div class="field full"><label>Тип продукта</label><select name="type">${Object.entries(labels.productTypes).map(([id, label]) => option(id, label, product.type)).join("")}</select></div>
        <div class="field"><label>Калории</label><input name="calories" type="number" step="0.1" inputmode="decimal" value="${product.calories || ""}"></div>
        <div class="field"><label>Белки</label><input name="protein" type="number" step="0.1" inputmode="decimal" value="${product.protein || ""}"></div>
        <div class="field"><label>Жиры</label><input name="fat" type="number" step="0.1" inputmode="decimal" value="${product.fat || ""}"></div>
        <div class="field"><label>Углеводы</label><input name="carbs" type="number" step="0.1" inputmode="decimal" value="${product.carbs || ""}"></div>
        <div class="field cooked-field"><label>Сухой вес, г</label><input name="cookedDryWeight" type="number" min="1" step="1" inputmode="numeric" value="${cookedWeightValue(product.cookedDryWeight, 100)}"></div>
        <div class="field cooked-field"><label>Вес после приготовления, г</label><input name="cookedReadyWeight" type="number" min="1" step="1" inputmode="numeric" value="${cookedWeightValue(product.cookedReadyWeight, 230)}"></div>
        <div class="modal-actions field full">
          <button class="danger-btn" type="button" data-confirm-delete-product="${product.id}">Удалить</button>
          <button class="primary-btn" type="submit">Сохранить</button>
        </div>
      </form>
    </div>
  </div>`;
}

function eightyEditModal() {
  const product = libraryEditor?.draft;
  if (!product) return "";
  return `<div class="modal-backdrop" data-modal-close="library-editor">
    <div class="modal-card library-edit-modal" role="dialog" aria-modal="true" aria-label="Редактирование продукта базы Eighty">
      <div class="modal-head">
        <div>
          <span>${product.categoryLabel}</span>
          <h3>${escapeHtml(product.name || "Продукт")}</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-library-editor">×</button>
      </div>
      <form class="form-grid" data-form="eighty-edit">
        <input type="hidden" name="id" value="${product.id}">
        <div class="field full"><label>Название</label><input name="name" value="${escapeHtml(product.name || "")}" required></div>
        <div class="field"><label>Калории</label><input name="calories" type="number" step="0.1" inputmode="decimal" value="${product.calories || ""}"></div>
        <div class="field"><label>Белки</label><input name="protein" type="number" step="0.1" inputmode="decimal" value="${product.protein || ""}"></div>
        <div class="field"><label>Жиры</label><input name="fat" type="number" step="0.1" inputmode="decimal" value="${product.fat || ""}"></div>
        <div class="field"><label>Углеводы</label><input name="carbs" type="number" step="0.1" inputmode="decimal" value="${product.carbs || ""}"></div>
        <div class="modal-actions field full">
          <button class="danger-btn" type="button" data-confirm-delete-eighty="${product.id}">Удалить</button>
          <button class="primary-btn" type="submit">Сохранить</button>
        </div>
      </form>
    </div>
  </div>`;
}

function dishEditModal() {
  const dish = libraryEditor?.draft;
  if (!dish) return "";
  const totals = calcDish(dish);
  return `<div class="modal-backdrop" data-modal-close="library-editor">
    <div class="modal-card library-edit-modal dish-edit-modal" role="dialog" aria-modal="true" aria-label="Редактирование блюда">
      <div class="modal-head">
        <div>
          <span>Блюдо</span>
          <h3>${escapeHtml(dish.name || "Блюдо")}</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-library-editor">×</button>
      </div>
      <form class="form-grid" data-form="dish-edit">
        <input type="hidden" name="id" value="${dish.id}">
        <div class="field full"><label>Название блюда</label><input name="name" value="${escapeHtml(dish.name || "")}" required></div>
        <div class="field full">
          <div class="dish-editor-head"><span>Ингредиенты</span><button class="secondary-btn compact-back" type="button" data-action="add-dish-ingredient">Добавить ингредиент</button></div>
          <div class="dish-ingredient-list">${dish.ingredients.length ? dish.ingredients.map(dishIngredientRow).join("") : `<div class="empty-line">Ингредиентов пока нет</div>`}</div>
        </div>
        <div class="field full dish-summary">
          <div><span>Общий вес</span><b>${round(totals.totalWeight)} г</b></div>
          <div><span>Всего</span><b>${round(totals.total.calories)} ккал · Б ${round(totals.total.protein, 1)} Ж ${round(totals.total.fat, 1)} У ${round(totals.total.carbs, 1)}</b></div>
          <div><span>На 100 г</span><b>${round(totals.per100.calories)} ккал · Б ${round(totals.per100.protein, 1)} Ж ${round(totals.per100.fat, 1)} У ${round(totals.per100.carbs, 1)}</b></div>
        </div>
        <div class="modal-actions field full">
          <button class="secondary-btn" type="button" data-action="close-library-editor">Отмена</button>
          <button class="primary-btn" type="submit">Сохранить</button>
        </div>
      </form>
    </div>
  </div>`;
}

function dishIngredientRow(ingredient) {
  const options = addMealItems().map((item) => option(item.id, item.name, ingredient.productId)).join("");
  return `<div class="dish-ingredient-row" data-dish-ingredient="${ingredient.id}">
    <select name="ingredientProduct">${options}</select>
    <input name="ingredientAmount" type="number" min="1" step="0.1" inputmode="decimal" value="${ingredient.amount || ""}" placeholder="г">
    <button class="icon-btn compact delete-btn" type="button" data-remove-dish-ingredient="${ingredient.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function deleteConfirmModal() {
  if (!deleteConfirm) return "";
  const isDish = deleteConfirm.kind === "dish";
  const isWeight = deleteConfirm.kind === "weight";
  const isEighty = deleteConfirm.kind === "eighty";
  const isTemplate = deleteConfirm.kind === "template";
  return `<div class="modal-backdrop" data-modal-close="delete-confirm">
    <div class="modal-card confirm-modal" role="dialog" aria-modal="true" aria-label="Подтверждение удаления">
      <div class="modal-head">
        <div>
          <span>${isTemplate ? "⭐ Шаблон" : isWeight ? "⚖ Вес" : isDish ? "Блюдо" : isEighty ? "📚 База Eighty" : "Продукт"}</span>
          <h3>${isTemplate ? "Удалить шаблон?" : isWeight ? "Удалить запись веса?" : isDish ? "Удалить блюдо?" : isEighty ? "Удалить продукт из вашей базы?" : "Удалить продукт?"}</h3>
        </div>
      </div>
      <div class="modal-actions">
        <button class="secondary-btn" type="button" data-action="cancel-delete">Отмена</button>
        <button class="danger-btn" type="button" data-action="confirm-delete">Удалить</button>
      </div>
    </div>
  </div>`;
}

function accountDeleteModal() {
  const items = ["Профиль", "История веса", "Дневник питания", "История воды", "Продукты", "Блюда", "Достижения", "Аналитика", "Настройки"];
  return `<div class="modal-backdrop" data-modal-close="account-delete">
    <div class="modal-card account-delete-modal" role="dialog" aria-modal="true" aria-label="Удалить аккаунт">
      <div class="modal-head">
        <div>
          <span>Сброс данных</span>
          <h3>Удалить аккаунт?</h3>
        </div>
      </div>
      <div class="account-delete-copy">
        <p>Это действие нельзя отменить.</p>
        <p>Будут безвозвратно удалены все ваши данные и настройки.</p>
      </div>
      <div class="account-delete-list">
        ${items.map((item) => `<span>• ${item}</span>`).join("")}
      </div>
      <div class="modal-actions account-delete-actions">
        <button class="secondary-btn" type="button" data-action="cancel-account-delete" autofocus>Отмена</button>
        <button class="danger-btn" type="button" data-action="confirm-account-delete">Удалить аккаунт</button>
      </div>
    </div>
  </div>`;
}

function accountDeletingOverlay() {
  return `<div class="account-delete-busy" role="status" aria-live="polite">
    <div>
      <i></i>
      <strong>Удаляем аккаунт</strong>
      <span>Очищаем данные и настройки...</span>
    </div>
  </div>`;
}

function screenProfile(targets) {
  const telegramId = state.telegram.telegramId || currentUser.telegramId || "—";
  if (weightHistoryOpen) return screenWeightHistory();
  if (remindersOpen) return screenReminders();
  return `<section class="${screenStateClass("profile")}">
    <div class="stack">
      <header class="screen-header profile-title">
        <div class="profile-title-row">
          <span>ВАШИ НАСТРОЙКИ</span>
          <b>ID ${escapeHtml(telegramId)}</b>
        </div>
        <h1>Профиль</h1>
      </header>
      ${profileCard(targets)}
      <div class="profile-actions panel">
        <button class="secondary-btn" type="button" data-action="profile-details">Основные данные</button>
        <button class="secondary-btn" type="button" data-action="achievements">Достижения</button>
        <button class="secondary-btn" type="button" data-action="reminders">🔔 Напоминания</button>
        <button class="secondary-btn" type="button" data-action="weight-history">📈 История веса</button>
      </div>
      ${targetsPanel(targets)}
      ${profileWaterPanel()}
      ${accountDeletePanel()}
      <div class="profile-app-info">
        <span>Eighty v2.3.0</span>
        <span>© 2026 by Егор Галкин</span>
      </div>
    </div>
  </section>`;
}

function profileCard(targets) {
  const name = state.profile.name || currentUser.name || "Пользователь";
  const photo = state.telegram.photoUrl || currentUser.photoUrl;
  const goal = state.profile.targetMode === "manual" ? "Ручной КБЖУ" : labels.goals[state.profile.goalMode];
  const registrationDate = formatRegistrationDate(state.createdAt);
  const current = currentWeight();
  const start = startWeight();
  const target = number(state.profile.targetWeight);
  const remaining = current > 0 && target > 0 ? Math.abs(current - target) : 0;
  const reached = targetReached();
  return `<div class="profile-card">
    <div class="profile-main">
      <div class="avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : `<span>${escapeHtml(name.slice(0, 1).toUpperCase())}</span>`}</div>
      <div>
        <span>Имя пользователя</span>
        <h2>${escapeHtml(name)}</h2>
        <p>Текущая цель: ${goal} • ${targetValue(targets.calories, "ккал")}</p>
        <p>Дата регистрации: ${registrationDate}</p>
      </div>
    </div>
    <div class="weight-goal-grid">
      ${smallStat("Начальный вес", start > 0 ? `${round(start, 1)} кг` : "—")}
      ${smallStat("Текущий вес", current > 0 ? `${round(current, 1)} кг` : "—")}
      ${smallStat("Цель", target > 0 ? `${round(target, 1)} кг` : "—")}
      ${smallStat("Осталось", reached ? "🎉 Цель достигнута" : remaining > 0 ? `${round(remaining, 1)} кг` : "—")}
    </div>
  </div>`;
}

function accountDeletePanel() {
  return `<div class="account-delete-panel">
    <button class="account-delete-btn" type="button" data-action="open-account-delete">Удалить аккаунт</button>
  </div>`;
}

function weightRows() {
  return sortedWeightLogs();
}

function screenWeightHistory() {
  const rows = weightRows();
  return `<section class="${screenStateClass("profile")}">
    <div class="stack">
      <header class="screen-header profile-title weight-page-title">
        <button class="back-link" type="button" data-action="close-weight-history">← Назад</button>
        <span>ВАША ИСТОРИЯ И ПРОГРЕСС</span>
        <div class="add-title-row">
          <h1>История веса</h1>
          <button class="add-create-btn" type="button" data-action="open-weight-add">+ Добавить</button>
        </div>
      </header>
      ${weightSummaryGrid()}
      ${weightEditor ? weightEntryForm() : ""}
      <div class="weight-history-list">
        ${rows.length ? rows.map(weightHistoryRow).join("") : `<div class="empty-line">История веса пока пуста. Добавьте первую запись, чтобы отслеживать прогресс.</div>`}
      </div>
    </div>
  </section>`;
}

function reminderLabel(enabled) {
  return enabled ? "Включено" : "Выключено";
}

function reminderSwitch(name, enabled, disabled = false) {
  return `<button class="ios-switch ${enabled ? "active" : ""}" type="button" data-reminder-toggle="${name}" aria-pressed="${enabled}" ${disabled ? "disabled" : ""}><i></i></button>`;
}

function reminderTimeField(label, name, value, disabled) {
  return `<label class="reminder-setting-row">
    <span>${label}</span>
    <input type="time" data-reminder-field="${name}" value="${escapeHtml(value || "")}" ${disabled ? "disabled" : ""}>
  </label>`;
}

function reminderSelectField(label, name, value, options, disabled) {
  return `<label class="reminder-setting-row">
    <span>${label}</span>
    <select data-reminder-field="${name}" ${disabled ? "disabled" : ""}>
      ${options.map(([id, title]) => option(id, title, value)).join("")}
    </select>
  </label>`;
}

function reminderCard(id, icon, title, body, condition) {
  const reminders = state.settings.reminders;
  const item = reminders[id];
  const disabled = !reminders.enabled;
  return `<article class="reminder-card ${disabled ? "muted" : ""}">
    <div class="reminder-card-head">
      <div>
        <h3>${icon} ${title}</h3>
        <span>${reminderLabel(item.enabled)}</span>
      </div>
      ${reminderSwitch(id, item.enabled, disabled)}
    </div>
    <div class="reminder-card-body">${body}</div>
    <p>${condition}</p>
  </article>`;
}

function screenReminders() {
  const reminders = state.settings.reminders;
  const disabled = !reminders.enabled;
  const intervals = [[1, "каждый час"], [2, "каждые 2 часа"], [3, "каждые 3 часа"], [4, "каждые 4 часа"]].map(([id, title]) => [String(id), title]);
  const weekdays = [
    ["monday", "Понедельник"],
    ["tuesday", "Вторник"],
    ["wednesday", "Среда"],
    ["thursday", "Четверг"],
    ["friday", "Пятница"],
    ["saturday", "Суббота"],
    ["sunday", "Воскресенье"]
  ];
  return `<section class="${screenStateClass("profile")}">
    <div class="stack">
      <header class="screen-header profile-title weight-page-title">
        <button class="back-link" type="button" data-action="close-reminders">← Назад</button>
        <span>ПЕРСОНАЛЬНЫЕ НАСТРОЙКИ</span>
        <h1>Напоминания</h1>
      </header>
      <section class="panel reminders-master">
        <div class="reminder-card-head">
          <div>
            <h2>🔔 Напоминания</h2>
            <span>${reminders.enabled ? "Активны" : "Отключены"}</span>
          </div>
          ${reminderSwitch("enabled", reminders.enabled)}
        </div>
      </section>
      <div class="reminders-list">
        ${reminderCard(
          "diary",
          "🍽",
          "Заполнить дневник",
          reminderTimeField("Время", "diary.time", reminders.diary.time, disabled),
          "Отправляется только если за текущий день ещё нет записей в дневнике."
        )}
        ${reminderCard(
          "water",
          "💧",
          "Вода",
          `${reminderSelectField("Интервал", "water.intervalHours", String(reminders.water.intervalHours), intervals, disabled)}
           ${reminderTimeField("Начало", "water.start", reminders.water.start, disabled)}
           ${reminderTimeField("Конец", "water.end", reminders.water.end, disabled)}`,
          "Останавливается на день, когда дневная норма воды уже выполнена."
        )}
        ${reminderCard(
          "weight",
          "⚖️",
          "Взвешивание",
          `${reminderSelectField("День недели", "weight.weekday", reminders.weight.weekday, weekdays, disabled)}
           ${reminderTimeField("Время", "weight.time", reminders.weight.time, disabled)}`,
          "Помогает регулярно обновлять историю веса."
        )}
        ${reminderCard(
          "streak",
          "🔥",
          "Серия",
          reminderTimeField("Время", "streak.time", reminders.streak.time, disabled),
          "Отправляется только если серия уже есть, а за сегодня ещё нет записей."
        )}
        ${reminderCard(
          "goal",
          "🎯",
          "Цель дня",
          reminderTimeField("Время", "goal.time", reminders.goal.time, disabled),
          "Отправляется только если к выбранному времени дневная цель по питанию ещё не выполнена."
        )}
      </div>
    </div>
  </section>`;
}

function weightSummaryGrid() {
  const start = startWeight();
  const current = currentWeight();
  const target = number(state.profile.targetWeight);
  const change = start > 0 && current > 0 ? current - start : 0;
  const remaining = current > 0 && target > 0 ? Math.abs(current - target) : 0;
  return `<div class="summary-grid weight-summary-grid">
    ${statCard("Начальный вес", start > 0 ? `${round(start, 1)} кг` : "—")}
    ${statCard("Текущий вес", current > 0 ? `${round(current, 1)} кг` : "—")}
    ${statCard("Изменение", start > 0 && current > 0 ? `${change > 0 ? "+" : ""}${round(change, 1)} кг` : "—")}
    ${statCard("До цели осталось", targetReached() ? "0 кг" : remaining > 0 ? `${round(remaining, 1)} кг` : "—")}
  </div>`;
}

function weightEntryForm() {
  const isEdit = weightEditor?.mode === "edit";
  return `<form class="form-grid weight-entry-form panel" data-form="weight-entry">
    <input type="hidden" name="id" value="${escapeHtml(weightEditor?.id || "")}">
    <div class="field"><label>Дата</label><input name="date" type="date" value="${escapeHtml(weightEditor?.date || todayIso())}" required></div>
    <div class="field"><label>Вес, кг</label><input name="weight" type="number" inputmode="decimal" step="0.1" value="${escapeHtml(weightEditor?.weight || "")}" placeholder="0" required></div>
    <div class="modal-actions field full">
      <button class="secondary-btn" type="button" data-action="close-weight-editor">Отмена</button>
      <button class="primary-btn" type="submit">${isEdit ? "Сохранить" : "Сохранить"}</button>
    </div>
  </form>`;
}

function weightHistoryRow(item) {
  const first = sortedWeightLogs()[0];
  const isInitial = first?.id === item.id;
  return `<article class="weight-history-card">
    <div class="weight-history-main">
      <span>${formatDate(item.date)}</span>
      ${isInitial ? `<em>Начальный вес</em>` : ""}
      <strong>${round(item.weight, 1)} кг</strong>
    </div>
    <button class="icon-btn compact delete-btn" type="button" data-delete-weight="${item.id}" title="Удалить">${icons.trash}</button>
  </article>`;
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

function achievementCategoryMeta() {
  return {
    earned: { title: "🏆 Полученные", empty: "Полученных достижений пока нет" },
    series: { title: "🔥 Серия", empty: "Достижений серии пока нет" },
    food: { title: "🍽 Питание", empty: "Достижений питания пока нет" },
    water: { title: "💧 Вода", empty: "Достижений воды пока нет" },
    weight: { title: "⚖ Вес", empty: "Достижений веса пока нет" },
    secret: { title: "❓ Скрытые", empty: "Скрытых достижений пока нет" }
  };
}

function achievementFresh(item) {
  const unlockedAt = state.achievements?.unlocked?.[item.id];
  if (!unlockedAt) return false;
  return Date.now() - new Date(unlockedAt).getTime() < 4000;
}

function achievementCard(item) {
  const done = isAchievementUnlocked(item.id);
  const secret = item.hidden && !done;
  const progress = done ? 100 : clamp(item.value / Math.max(1, item.target) * 100, 0, 100);
  const value = item.id.startsWith("loss") ? round(item.value, 1) : round(item.value);
  const title = secret ? "❓ Секретное достижение" : item.title;
  const description = secret ? "???" : item.description;
  const progressText = secret ? "???" : done ? "Получено" : `${value} / ${item.target}`;
  return `<div class="achievement-card ${done ? "done" : ""} ${secret ? "secret" : ""} ${achievementFresh(item) ? "fresh" : ""}">
    <div class="achievement-main">
      <div>
        <strong>${title}</strong>
        <em>${description || ""}</em>
      </div>
      <span>${done ? "<b>✓</b>" : ""}${progressText}</span>
    </div>
    <div class="progress" style="--value:${progress}%"><i></i></div>
  </div>`;
}

function achievementList(items, emptyText) {
  return items.length
    ? `<div class="achievements-list">${items.map(achievementCard).join("")}</div>`
    : `<div class="empty-line">${emptyText}</div>`;
}

function achievementSection(id, items) {
  const meta = achievementCategoryMeta()[id];
  return `<section class="achievement-section">
    <h4>${meta.title}</h4>
    ${achievementList(items, meta.empty)}
  </section>`;
}

function achievementsModal(earnedOnly = false) {
  const items = achievementDefinitions();
  const earned = items.filter((item) => isAchievementUnlocked(item.id));
  const body = earnedOnly
    ? achievementSection("earned", earned)
    : [
      achievementSection("earned", earned),
      ...["series", "food", "water", "weight", "secret"].map((category) => achievementSection(
        category,
        items.filter((item) => item.category === category && !isAchievementUnlocked(item.id))
      ))
    ].join("");
  return `<div class="modal-backdrop" data-modal-close="${earnedOnly ? "earned-achievements" : "achievements"}">
    <div class="modal-card achievements-modal" role="dialog" aria-modal="true" aria-label="Достижения">
      <div class="modal-head achievements-modal-head">
        <div>
          <span>${earned.length} / ${items.length}</span>
          <h3>Достижения</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="${earnedOnly ? "close-earned-achievements" : "close-achievements"}">×</button>
      </div>
      <div class="achievements-modal-body">${body}</div>
    </div>
  </div>`;
}

function targetsPanel(targets) {
  const p = state.profile;
  const open = Boolean(state.settings.targetsPanelOpen);
  return `<form class="panel targets-panel ${open ? "open" : "collapsed"}" data-form="targets" data-targets-panel>
    <button class="targets-panel-toggle" type="button" data-action="toggle-targets-panel" aria-expanded="${open}" aria-controls="targets-panel-body">
      <span>
        <h2>КБЖУ · Расчёт</h2>
        <em>${targetsGoalLabel(p)}</em>
        <strong>${targetsSummaryLine(targets)}</strong>
      </span>
      <i aria-hidden="true">▼</i>
    </button>
    <div class="targets-panel-body" id="targets-panel-body" aria-hidden="${!open}" ${open ? "" : "inert"}>
      <div class="targets-panel-inner">
        <div class="section-title nutrition-title">
          <h2>КБЖУ · Расчёт</h2>
          <div class="section-title-actions">
            <span>${!targets.complete ? "Заполните данные" : targets.manual ? "Ручной режим" : `BMR ${round(targets.bmr)} ккал`}</span>
            <button class="icon-btn compact neutral nutrition-info-btn" type="button" data-action="nutrition-info" title="О расчёте КБЖУ" aria-label="О расчёте КБЖУ">ℹ️</button>
          </div>
        </div>
        <div class="segmented">
          <label><input type="radio" name="targetMode" value="auto" ${p.targetMode !== "manual" ? "checked" : ""}>Автоматический расчёт</label>
          <label><input type="radio" name="targetMode" value="manual" ${p.targetMode === "manual" ? "checked" : ""}>Ручной режим</label>
        </div>
        ${p.targetMode === "manual" ? manualTargetsFields(p) : autoTargetsFields(p)}
        <div class="target-grid">${targetCards(targets)}</div>
        <button class="secondary-btn recalc-btn" type="button" data-action="recalculate">Обновить расчёт</button>
      </div>
    </div>
  </form>`;
}

function targetsGoalLabel(profile) {
  if (profile.targetMode === "manual") return "Текущая цель: ручной режим";
  return `Текущая цель: ${labels.goals[profile.goalMode] || "не выбрана"}`;
}

function targetsSummaryLine(targets) {
  return `${targetValue(targets.calories, "ккал")} • Б ${targetValue(targets.protein)} • Ж ${targetValue(targets.fat)} • У ${targetValue(targets.carbs)}`;
}

function autoTargetsFields(p) {
  return `<div class="form-grid target-controls">
    <div class="field"><label>Цель</label><select name="goalMode">${Object.entries(labels.goals).map(([id, label]) => option(id, label, p.goalMode)).join("")}</select></div>
    <div class="field"><label>Активность</label><select name="activity">${option("", "Не выбрана", p.activity)}${Object.entries(labels.activities).map(([id, label]) => option(id, label, p.activity)).join("")}</select></div>
    ${goalControls(p)}
    <input type="hidden" name="manualCalories" value="${p.manualTargets.calories}">
    <input type="hidden" name="manualProtein" value="${p.manualTargets.protein}">
    <input type="hidden" name="manualFat" value="${p.manualTargets.fat}">
    <input type="hidden" name="manualCarbs" value="${p.manualTargets.carbs}">
  </div>`;
}

function manualTargetsFields(p) {
  return `<div class="form-grid target-controls">
    <div class="field"><label>Цель</label><select name="goalMode">${Object.entries(labels.goals).map(([id, label]) => option(id, label, p.goalMode)).join("")}</select></div>
    <div class="field"><label>Активность</label><select name="activity">${option("", "Не выбрана", p.activity)}${Object.entries(labels.activities).map(([id, label]) => option(id, label, p.activity)).join("")}</select></div>
    <input type="hidden" name="deficitPercent" value="${p.deficitPercent}">
    <input type="hidden" name="surplusPercent" value="${p.surplusPercent}">
    <div class="field"><label>Калории</label><input name="manualCalories" type="number" inputmode="numeric" value="${p.manualTargets.calories || ""}" placeholder="0"></div>
    <div class="field"><label>Белки</label><input name="manualProtein" type="number" inputmode="decimal" step="0.1" value="${p.manualTargets.protein || ""}" placeholder="0"></div>
    <div class="field"><label>Жиры</label><input name="manualFat" type="number" inputmode="decimal" step="0.1" value="${p.manualTargets.fat || ""}" placeholder="0"></div>
    <div class="field"><label>Углеводы</label><input name="manualCarbs" type="number" inputmode="decimal" step="0.1" value="${p.manualTargets.carbs || ""}" placeholder="0"></div>
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

function profileMetric(value, unit) {
  const numeric = number(value);
  return numeric > 0 ? `${round(numeric)} ${unit}` : "—";
}

function yearsText(value) {
  const age = number(value);
  if (age <= 0) return "—";
  const mod10 = age % 10;
  const mod100 = age % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? "год"
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? "года"
      : "лет";
  return `${round(age)} ${word}`;
}

function nutritionInfoRow(icon, title, value, description) {
  return `<div class="nutrition-info-row">
    <div class="nutrition-icon">${icon}</div>
    <div>
      <div class="nutrition-row-head"><strong>${title}</strong><b>${value}</b></div>
      <p>${description}</p>
    </div>
  </div>`;
}

function nutritionDataRow(label, value) {
  return `<div><span>${label}</span><b>${value}</b></div>`;
}

function nutritionInfoModal(targets) {
  const p = state.profile;
  const modes = calcAutoNutritionModes();
  const currentMode = labels.goals[p.goalMode] || "Похудение";
  const rows = [
    ["⚡", "BMR", targetValue(modes.bmr, "ккал"), "Калории в состоянии покоя."],
    ["=", "Поддержание", targetValue(modes.maintenance, "ккал"), "Норма для сохранения текущего веса."],
    ["↓", "Похудение", targetValue(modes.loss, "ккал"), "Рекомендуемая норма для снижения веса."],
    ["↑", "Набор массы", targetValue(modes.gain, "ккал"), "Рекомендуемая норма для набора веса."],
    ["◎", "Текущий режим", currentMode, "Выбранная цель в профиле."],
    ["80", "Текущая норма", targetValue(targets.calories, "ккал"), "Фактическая норма в приложении."]
  ];

  return `<div class="modal-backdrop" data-modal-close="nutrition-info">
    <div class="modal-card nutrition-info-modal" role="dialog" aria-modal="true" aria-label="Расчёт КБЖУ">
      <div class="modal-head nutrition-info-head">
        <div>
          <span>Расчёт нормы</span>
          <h3>КБЖУ</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-nutrition-info">×</button>
      </div>
      <div class="nutrition-info-list">
        ${rows.map((row) => nutritionInfoRow(...row)).join("")}
      </div>
      <div class="nutrition-data">
        <h4>Ваши данные</h4>
        <div class="nutrition-data-grid">
          ${nutritionDataRow("Вес", profileMetric(currentWeight(), "кг"))}
          ${nutritionDataRow("Рост", profileMetric(p.height, "см"))}
          ${nutritionDataRow("Возраст", yearsText(p.age))}
          ${nutritionDataRow("Активность", labels.activities[p.activity] || "Не выбрана")}
        </div>
      </div>
    </div>
  </div>`;
}

function profileDetailsModal() {
  const p = state.profile;
  return `<div class="modal-backdrop" data-modal-close="profile-details">
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Основные данные">
      <div class="modal-head">
        <div>
          <span>Профиль</span>
          <h3>Основные данные</h3>
        </div>
        <button class="icon-btn compact neutral" type="button" data-action="close-profile-details">×</button>
      </div>
      <form class="form-grid profile-fields" data-form="profile">
        <div class="field full"><label>Имя</label><input name="name" value="${escapeHtml(p.name || currentUser.name || "")}" placeholder="Ваше имя" enterkeyhint="next"></div>
        <div class="field"><label>Возраст</label><input name="age" type="number" inputmode="numeric" value="${p.age || ""}" placeholder="0" enterkeyhint="next"></div>
        <div class="field"><label>Пол</label><select name="sex">${option("", "Не выбран", p.sex)}${option("female", "Женский", p.sex)}${option("male", "Мужской", p.sex)}${option("other", "Другой", p.sex)}</select></div>
        <div class="field"><label>Рост, см</label><input name="height" type="number" inputmode="numeric" value="${p.height || ""}" placeholder="0" enterkeyhint="next"></div>
        <div class="field"><label>Цель, кг</label><input name="targetWeight" type="number" inputmode="decimal" step="0.1" value="${p.targetWeight || ""}" placeholder="0" enterkeyhint="next"></div>
        <input type="hidden" name="goalMode" value="${p.goalMode || "loss"}">
        <input type="hidden" name="activity" value="${p.activity || ""}">
        <input type="hidden" name="targetMode" value="${p.targetMode || "auto"}">
        <input type="hidden" name="deficitPercent" value="${p.deficitPercent}">
        <input type="hidden" name="surplusPercent" value="${p.surplusPercent}">
        <input type="hidden" name="manualCalories" value="${p.manualTargets.calories}">
        <input type="hidden" name="manualProtein" value="${p.manualTargets.protein}">
        <input type="hidden" name="manualFat" value="${p.manualTargets.fat}">
        <input type="hidden" name="manualCarbs" value="${p.manualTargets.carbs}">
        <div class="field full"><button class="primary-btn full-btn" type="submit">Сохранить</button></div>
      </form>
    </div>
  </div>`;
}

function profileWaterPanel() {
  const auto = !state.settings.waterManual;
  return `<div class="panel" data-profile-water>
    <div class="section-title"><h2>Вода</h2><span data-water-goal-label>${round(waterGoal() / 1000, 1)} л в день</span></div>
    <label class="check-row"><input name="waterAuto" type="checkbox" ${auto ? "checked" : ""}><span>Автоматический расчёт</span></label>
    <div class="field"><label>Своя цель воды, мл</label><input name="waterGoal" type="number" inputmode="numeric" value="${state.settings.waterGoal || ""}" placeholder="0" enterkeyhint="done" ${auto ? "disabled" : ""}></div>
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

function option(value, label, selected) {
  return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
}

function toast(message) {
  document.querySelectorAll(".toast").forEach((item) => item.remove());
  const text = String(message || "").replace(/^[✅✓]\s*/u, "").trim();
  const node = document.createElement("div");
  node.className = "toast";
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  node.innerHTML = `<span aria-hidden="true">✓</span><strong>${escapeHtml(text)}</strong>`;
  document.body.append(node);
  window.setTimeout(() => {
    node.classList.add("leaving");
    window.setTimeout(() => node.remove(), 220);
  }, 2000);
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
  if (type === "period-custom") saveAnalyticsCustomRange(form);
  if (type === "profile") saveProfile(form);
  if (type === "weight-entry") saveWeightEntry(form);
  if (type === "meal-template") saveMealTemplate(form);
  if (type === "product-edit") saveProductEdit(form);
  if (type === "eighty-edit") saveEightyEdit(form);
  if (type === "dish-edit") saveDishEdit(form);
  if (type === "dish-create") saveDishCreate(form);
  if (type === "dish-ingredient-add") addPickedIngredientsToDish(form);
  if (type === "eighty-import") saveEightyImport(form);
  if (type === "onboarding") advanceOnboarding(form);
});

app.addEventListener("pointerdown", daySwipeStart);
app.addEventListener("pointermove", daySwipeMove);
app.addEventListener("pointerup", daySwipeEnd);
app.addEventListener("pointercancel", daySwipeEnd);

app.addEventListener("click", async (event) => {
  if (event.target.dataset.modalClose) {
    if (event.target.dataset.modalClose === "barcode-scanner") {
      await closeBarcodeScanner(false);
      return;
    }
    closeModal(event.target.dataset.modalClose);
    render();
    return;
  }
  if (addCreateMenuOpen && !event.target.closest("[data-create-menu-root]")) {
    addCreateMenuOpen = false;
    render();
    return;
  }
  const button = event.target.closest("button");
  if (!button) return;
  if (accountDeleteBusy) return;
  if (button.dataset.amountStep) {
    stepCartAmount(button.dataset.amountStep, number(button.dataset.step));
    return;
  }
  if (button.dataset.keyboardDone) {
    blurActive();
    setKeyboardMode(false);
    return;
  }
  if (button.dataset.action === "onboarding-start") {
    onboardingStep = 2;
    render();
    focusOnboardingField();
    return;
  }
  if (button.dataset.action === "onboarding-back") {
    goBackOnboarding();
    return;
  }
  if (button.dataset.onboardingGoal) {
    selectOnboardingGoal(button.dataset.onboardingGoal);
    return;
  }
  if (button.dataset.onboardingActivity) {
    selectOnboardingActivity(button.dataset.onboardingActivity);
    return;
  }
  if (button.dataset.action === "onboarding-next") {
    advanceOnboarding(button.closest("form"));
    return;
  }
  if (button.dataset.action === "onboarding-finish") {
    finishOnboarding();
    return;
  }
  if (button.dataset.screen) setScreen(button.dataset.screen);
  if (button.dataset.favoritesPage) {
    favoritesPage = button.dataset.favoritesPage;
    if (favoritesPage === "home") {
      favoritesEightyCategoryId = "";
      favoritesEightyQuery = "";
    }
    if (favoritesPage === "eighty") favoritesEightyQuery = "";
    render();
  }
  if (button.dataset.favoritesEightyCategory) {
    favoritesEightyCategoryId = button.dataset.favoritesEightyCategory;
    favoritesEightyQuery = "";
    favoritesPage = "eighty-category";
    render();
  }
  if (button.dataset.action === "toggle-add-create-menu") {
    addCreateMenuOpen = !addCreateMenuOpen;
    render();
    return;
  }
  if (button.dataset.action === "open-barcode-scanner") {
    openBarcodeScanner();
    return;
  }
  if (button.dataset.action === "close-barcode-scanner") {
    await closeBarcodeScanner(true);
    return;
  }
  if (button.dataset.addPage) {
    addCreateMenuOpen = false;
    setAddPage(button.dataset.addPage);
    return;
  }
  if (button.dataset.action === "toggle-templates") {
    mealTemplatesVisible = !mealTemplatesVisible;
    render();
    return;
  }
  if (button.dataset.templateDateStep) {
    templateSourceDate = clampTemplateDate(addDays(templateSourceDate, number(button.dataset.templateDateStep)));
    render();
    return;
  }
  if (button.dataset.createTemplateMeal) {
    openTemplateCreator(button.dataset.createTemplateMeal);
    return;
  }
  if (button.dataset.useTemplate) {
    useMealTemplate(button.dataset.useTemplate);
    return;
  }
  if (button.dataset.editTemplate) {
    openTemplateRename(button.dataset.editTemplate);
    return;
  }
  if (button.dataset.action === "close-meal-template") {
    mealTemplateEditor = null;
    render();
    return;
  }
  if (button.dataset.action === "prev-date") changeDate(-1);
  if (button.dataset.action === "next-date") changeDate(1);
  if (button.dataset.action === "toggle-targets-panel") {
    const open = !state.settings.targetsPanelOpen;
    state.settings.targetsPanelOpen = open;
    persist();
    const panel = button.closest("[data-targets-panel]");
    if (panel) {
      panel.classList.toggle("open", open);
      panel.classList.toggle("collapsed", !open);
      button.setAttribute("aria-expanded", String(open));
      const body = panel.querySelector(".targets-panel-body");
      if (body) {
        body.setAttribute("aria-hidden", String(!open));
        body.toggleAttribute("inert", !open);
      }
    }
    return;
  }
  if (button.dataset.action === "recalculate") {
    const form = button.closest("form");
    if (form?.dataset.form === "targets") {
      syncTargetsFromForm(form);
      persist();
      render();
      toast("Расчёт обновлён");
    } else if (form) {
      recalculateProfile(form);
    }
  }
  if (button.dataset.action === "open-weight-add") openWeightAdd();
  if (button.dataset.action === "close-weight-editor") {
    weightEditor = null;
    render();
  }
  if (button.dataset.action === "water-history") {
    waterHistoryOpen = true;
    render();
  }
  if (button.dataset.action === "open-period-analytics") {
    analyticsView = "periods";
    periodSheetOpen = false;
    render();
    return;
  }
  if (button.dataset.action === "analytics-back") {
    analyticsView = "daily";
    periodSheetOpen = false;
    render();
    return;
  }
  if (button.dataset.action === "open-period-sheet") {
    const range = analyticsPeriodRange();
    analyticsCustomDraft = { start: analyticsPeriod.start || range.start, end: analyticsPeriod.end || range.end };
    periodSheetOpen = true;
    render();
    return;
  }
  if (button.dataset.action === "close-period-sheet") {
    periodSheetOpen = false;
    render();
    return;
  }
  if (button.dataset.periodType) {
    if (button.dataset.periodType === "custom") {
      const range = analyticsPeriodRange();
      analyticsPeriod = { type: "custom", start: analyticsPeriod.start || range.start, end: analyticsPeriod.end || range.end };
      analyticsCustomDraft = { start: analyticsPeriod.start, end: analyticsPeriod.end };
      periodSheetOpen = true;
    } else {
      analyticsPeriod = { type: button.dataset.periodType, start: "", end: "" };
      analyticsCustomDraft = { start: "", end: "" };
      periodSheetOpen = false;
    }
    render();
    return;
  }
  if (button.dataset.action === "profile-details") {
    profileDetailsOpen = true;
    render();
  }
  if (button.dataset.action === "nutrition-info") {
    nutritionInfoOpen = true;
    render();
  }
  if (button.dataset.action === "weight-history") {
    weightHistoryOpen = true;
    render();
  }
  if (button.dataset.action === "reminders") {
    remindersOpen = true;
    render();
  }
  if (button.dataset.action === "close-reminders") {
    remindersOpen = false;
    render();
  }
  if (button.dataset.reminderToggle) {
    toggleReminderSetting(button.dataset.reminderToggle);
    return;
  }
  if (button.dataset.action === "achievements") {
    achievementsOpen = true;
    render();
  }
  if (button.dataset.action === "earned-achievements") {
    earnedAchievementsOpen = true;
    render();
  }
  if (button.dataset.action === "open-account-delete") {
    accountDeleteOpen = true;
    render();
  }
  if (button.dataset.action === "cancel-account-delete") {
    accountDeleteOpen = false;
    render();
  }
  if (button.dataset.action === "confirm-account-delete") {
    deleteAccount();
    return;
  }
  if (button.dataset.action === "close-water-history") {
    waterHistoryOpen = false;
    render();
  }
  if (button.dataset.action === "close-profile-details") {
    profileDetailsOpen = false;
    render();
  }
  if (button.dataset.action === "close-nutrition-info") {
    nutritionInfoOpen = false;
    render();
  }
  if (button.dataset.action === "close-weight-history") {
    weightHistoryOpen = false;
    weightEditor = null;
    render();
  }
  if (button.dataset.action === "close-achievements") {
    achievementsOpen = false;
    render();
  }
  if (button.dataset.action === "close-earned-achievements") {
    earnedAchievementsOpen = false;
    render();
  }
  if (button.dataset.openAdd) openAdd(button.dataset.openAdd);
  if (button.dataset.water) addWater(number(button.dataset.water));
  if (button.dataset.deleteEntry) deleteEntry(button.dataset.deleteEntry);
  if (button.dataset.deleteProduct) deleteProduct(button.dataset.deleteProduct);
  if (button.dataset.deleteWeight) deleteWeight(button.dataset.deleteWeight);
  if (button.dataset.confirmDeleteProduct) {
    deleteConfirm = { kind: "product", id: button.dataset.confirmDeleteProduct };
    render();
  }
  if (button.dataset.confirmDeleteDish) {
    deleteConfirm = { kind: "dish", id: button.dataset.confirmDeleteDish };
    render();
  }
  if (button.dataset.editProduct) openProductEditor(button.dataset.editProduct);
  if (button.dataset.editDish) openDishEditor(button.dataset.editDish);
  if (button.dataset.editEightyProduct) openEightyEditor(button.dataset.editEightyProduct);
  if (button.dataset.deleteWater) deleteWaterEntry(button.dataset.deleteWater);
  if (button.dataset.confirmDeleteEighty) {
    deleteConfirm = { kind: "eighty", id: button.dataset.confirmDeleteEighty };
    render();
  }
  if (button.dataset.confirmDeleteTemplate) {
    deleteConfirm = { kind: "template", id: button.dataset.confirmDeleteTemplate };
    render();
  }
  if (button.dataset.analyticsStep) {
    changeAnalyticsDate(number(button.dataset.analyticsStep));
  }
  if (button.dataset.addPanel) {
    addPanelMode = button.dataset.addPanel;
    if (addPanelMode === "existing") {
      addFoodSource = "mine";
      eightyCategoryId = "";
    }
    render();
  }
  if (button.dataset.action === "ration-next") {
    if (!selectedMealItems().length) return toast("Выберите продукты");
    addPage = "ration-amounts";
    render();
  }
  if (button.dataset.openEightyCategory) {
    eightyCategoryId = button.dataset.openEightyCategory;
    eightyImport.query = "";
    addPage = "eighty-category";
    render();
  }
  if (button.dataset.toggleEightyImport) {
    const id = button.dataset.toggleEightyImport;
    if (Object.prototype.hasOwnProperty.call(eightyImport.items, id)) delete eightyImport.items[id];
    else eightyImport.items[id] = "";
    render();
  }
  if (button.dataset.action === "eighty-import-next") {
    if (!selectedEightyFoods().length) return toast("Выберите продукты");
    addPage = "eighty-amounts";
    render();
  }
  if (button.dataset.action === "open-dish-builder") {
    dishBuilder = { name: "", query: "", ingredients: [] };
    addPanelMode = "dish";
    render();
  }
  if (button.dataset.action === "open-ingredient-library") {
    const form = button.closest('form[data-form="dish-create"]');
    if (form) syncDishBuilderFromForm(form);
    ingredientPicker = { source: "mine", query: "", categoryId: "", items: {} };
    addPage = "dish-library";
    render();
  }
  if (button.dataset.ingredientSource) {
    ingredientPicker.source = button.dataset.ingredientSource;
    ingredientPicker.query = "";
    ingredientPicker.categoryId = "";
    ingredientPicker.items = {};
    render();
  }
  if (button.dataset.ingredientCategory !== undefined) {
    ingredientPicker.categoryId = button.dataset.ingredientCategory;
    ingredientPicker.query = "";
    render();
  }
  if (button.dataset.toggleIngredientPicker) {
    const id = button.dataset.toggleIngredientPicker;
    if (Object.prototype.hasOwnProperty.call(ingredientPicker.items, id)) delete ingredientPicker.items[id];
    else ingredientPicker.items[id] = "";
    render();
  }
  if (button.dataset.action === "ingredient-picker-next") {
    if (!selectedIngredientPickerItems().length) return toast("Выберите ингредиенты");
    addPage = "dish-library-amounts";
    render();
  }
  if (button.dataset.addBuilderProduct) {
    const form = button.closest('form[data-form="dish-create"]');
    if (form) syncDishBuilderFromForm(form);
    const product = productById(button.dataset.addBuilderProduct);
    if (product) addIngredientToBuilder(product);
    render();
  }
  if (button.dataset.addBuilderEighty) {
    const form = button.closest('form[data-form="dish-create"]');
    if (form) syncDishBuilderFromForm(form);
    const food = eightyFoodById(button.dataset.addBuilderEighty);
    if (food) {
      addIngredientToBuilder(saveEightyProduct(food));
      persist();
    }
    render();
  }
  if (button.dataset.removeBuilderIngredient) {
    const form = button.closest('form[data-form="dish-create"]');
    if (form) syncDishBuilderFromForm(form);
    const draft = ensureDishBuilder();
    draft.ingredients = draft.ingredients.filter((ingredient) => ingredient.id !== button.dataset.removeBuilderIngredient);
    render();
  }
  if (button.dataset.foodSource) {
    addFoodSource = button.dataset.foodSource;
    if (addFoodSource === "mine") eightyCategoryId = "";
    render();
  }
  if (button.dataset.eightyCategory !== undefined) {
    eightyCategoryId = button.dataset.eightyCategory;
    render();
  }
  if (button.dataset.eightyFood) {
    eightyFoodDialog = { foodId: button.dataset.eightyFood, amount: "100" };
    render();
  }
  if (button.dataset.action === "toggle-cart") {
    mealCartOpen = !mealCartOpen;
    render();
  }
  if (button.dataset.action === "add-eighty-food") {
    addEightyFoodToMeal();
  }
  if (button.dataset.action === "close-eighty-food") {
    eightyFoodDialog = null;
    render();
  }
  if (button.dataset.action === "close-library-editor") {
    libraryEditor = null;
    render();
  }
  if (button.dataset.action === "cancel-delete") {
    deleteConfirm = null;
    render();
  }
  if (button.dataset.action === "confirm-delete") {
    confirmDelete();
  }
  if (button.dataset.action === "add-dish-ingredient") {
    const form = button.closest('form[data-form="dish-edit"]');
    if (form) syncDishDraftFromForm(form);
    const firstProduct = state.products[0];
    if (libraryEditor?.kind === "dish" && firstProduct) {
      libraryEditor.draft.ingredients.push({ id: uid(), productId: firstProduct.id, amount: 100 });
      render();
    } else {
      toast("Добавьте продукт");
    }
  }
  if (button.dataset.removeDishIngredient) {
    const form = button.closest('form[data-form="dish-edit"]');
    if (form) syncDishDraftFromForm(form);
    if (libraryEditor?.kind === "dish") {
      libraryEditor.draft.ingredients = libraryEditor.draft.ingredients.filter((ingredient) => ingredient.id !== button.dataset.removeDishIngredient);
      render();
    }
  }
  if (button.dataset.toggleProduct) toggleProduct(button.dataset.toggleProduct);
  if (button.dataset.addMeal) {
    entryDraft.meal = button.dataset.addMeal;
    const form = button.closest('form[data-form="entry"]');
    const picker = button.closest(".amount-meal-picker");
    if (!form || !picker) {
      render();
      return;
    }
    const buttons = [...picker.querySelectorAll("[data-add-meal]")];
    const activeIndex = Math.max(0, buttons.findIndex((item) => item.dataset.addMeal === entryDraft.meal));
    picker.dataset.activeIndex = String(activeIndex);
    buttons.forEach((item) => item.classList.toggle("active", item === button));
    const mealInput = form.querySelector('input[name="meal"]');
    if (mealInput) mealInput.value = entryDraft.meal;
    const submit = form.querySelector(".add-meal-submit");
    if (submit) submit.textContent = mealButtonLabel(entryDraft.meal);
    return;
  }
  if (button.dataset.favoritesSort) {
    favoritesSort = button.dataset.favoritesSort;
    render();
  }
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (target.dataset.reminderField) {
    setReminderPath(target.dataset.reminderField, target.value);
    return;
  }
  const entryForm = target.closest('form[data-form="entry"]');
  if (entryForm && target.dataset.cartAmount) return;

  const productForm = target.closest('form[data-form="product"]');
  if (productForm && target.name === "type") productForm.classList.toggle("cooked-mode", target.value === "cooked");

  const productEditForm = target.closest('form[data-form="product-edit"]');
  if (productEditForm && target.name === "type") productEditForm.classList.toggle("cooked-mode", target.value === "cooked");

  const profileForm = target.closest('form[data-form="profile"]');
  if (profileForm && ["goalMode", "targetMode"].includes(target.name)) {
    syncProfileFromForm(profileForm);
    render();
  }
  if (profileForm && ["waterAuto", "activity"].includes(target.name)) {
    updateProfileWaterFromForm(profileForm);
  }
  const waterPanel = target.closest("[data-profile-water]");
  if (waterPanel && target.name === "waterAuto") {
    updateProfileWaterFromForm(waterPanel);
  }
  const targetsForm = target.closest('form[data-form="targets"]');
  if (targetsForm && ["goalMode", "targetMode", "activity"].includes(target.name)) {
    syncTargetsFromForm(targetsForm);
    persist();
    render();
  }
  const dishCreateForm = target.closest('form[data-form="dish-create"]');
  if (dishCreateForm && ["builderIngredientAmount"].includes(target.name)) {
    syncDishBuilderFromForm(dishCreateForm);
    render();
  }
  const dishEditForm = target.closest('form[data-form="dish-edit"]');
  if (dishEditForm && ["ingredientProduct", "ingredientAmount"].includes(target.name)) {
    syncDishDraftFromForm(dishEditForm);
    render();
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-favorites-query]")) {
    favoritesQuery = target.value;
    const cursor = target.selectionStart;
    render();
    const nextSearch = app.querySelector("[data-favorites-query]");
    nextSearch?.focus();
    nextSearch?.setSelectionRange?.(cursor, cursor);
    return;
  }
  if (target.matches("[data-favorites-eighty-query]")) {
    favoritesEightyQuery = target.value;
    const cursor = target.selectionStart;
    render();
    const nextSearch = app.querySelector("[data-favorites-eighty-query]");
    nextSearch?.focus();
    nextSearch?.setSelectionRange?.(cursor, cursor);
    return;
  }
  if (target.matches("[data-add-food-query]")) {
    addFoodQuery = target.value;
    const cursor = target.selectionStart;
    render();
    const nextSearch = app.querySelector("[data-add-food-query]");
    nextSearch?.focus();
    nextSearch?.setSelectionRange?.(cursor, cursor);
    return;
  }
  if (target.matches("[data-eighty-import-query]")) {
    eightyImport.query = target.value;
    const cursor = target.selectionStart;
    render();
    const nextSearch = app.querySelector("[data-eighty-import-query]");
    nextSearch?.focus();
    nextSearch?.setSelectionRange?.(cursor, cursor);
    return;
  }
  if (target.dataset.eightyImportAmount) {
    eightyImport.items[target.dataset.eightyImportAmount] = target.value;
    const submit = app.querySelector('form[data-form="eighty-import"] .sticky-add-submit');
    if (submit) submit.disabled = !selectedEightyFoods().length || selectedEightyFoods().some((product) => number(eightyImport.items[product.id]) <= 0);
    return;
  }
  if (target.name === "eightyAmount") {
    if (eightyFoodDialog) {
      eightyFoodDialog.amount = target.value;
      refreshEightyFoodTotal();
    }
    return;
  }
  if (target.matches("[data-dish-search]") || target.name === "dishName") {
    const form = target.closest('form[data-form="dish-create"]');
    if (form) syncDishBuilderFromForm(form);
    const name = target.name;
    const cursor = target.selectionStart;
    render();
    const selector = name === "dishName" ? '[name="dishName"]' : "[data-dish-search]";
    const nextInput = app.querySelector(selector);
    nextInput?.focus();
    nextInput?.setSelectionRange?.(cursor, cursor);
    return;
  }
  if (target.matches("[data-ingredient-picker-query]")) {
    ingredientPicker.query = target.value;
    const cursor = target.selectionStart;
    render();
    const nextSearch = app.querySelector("[data-ingredient-picker-query]");
    nextSearch?.focus();
    nextSearch?.setSelectionRange?.(cursor, cursor);
    return;
  }
  if (target.dataset.ingredientPickerAmount) {
    ingredientPicker.items[target.dataset.ingredientPickerAmount] = target.value;
    const submit = app.querySelector('form[data-form="dish-ingredient-add"] .sticky-add-submit');
    if (submit) submit.disabled = !selectedIngredientPickerItems().length || selectedIngredientPickerItems().some((item) => number(ingredientPicker.items[item.id]) <= 0);
    return;
  }
  if (target.name === "builderIngredientAmount") {
    const form = target.closest('form[data-form="dish-create"]');
    const row = target.closest("[data-builder-ingredient]");
    const rowId = row?.dataset.builderIngredient;
    const cursor = target.selectionStart;
    if (form) syncDishBuilderFromForm(form);
    render();
    const nextInput = rowId ? app.querySelector(`[data-builder-ingredient="${rowId}"] [name="builderIngredientAmount"]`) : null;
    nextInput?.focus();
    nextInput?.setSelectionRange?.(cursor, cursor);
    return;
  }
  if (target.name === "ingredientAmount") {
    const form = target.closest('form[data-form="dish-edit"]');
    const row = target.closest("[data-dish-ingredient]");
    const rowId = row?.dataset.dishIngredient;
    const cursor = target.selectionStart;
    if (form) syncDishDraftFromForm(form);
    render();
    const nextInput = rowId ? app.querySelector(`[data-dish-ingredient="${rowId}"] [name="ingredientAmount"]`) : null;
    nextInput?.focus();
    nextInput?.setSelectionRange?.(cursor, cursor);
    return;
  }
  const entryForm = target.closest('form[data-form="entry"]');
  if (entryForm && target.dataset.cartAmount) {
    entryDraft.items[target.dataset.cartAmount] = target.value;
    const cart = app.querySelector(".meal-cart");
    if (cart && mealCartOpen) cart.outerHTML = mealCartPanel();
    const submit = app.querySelector(".add-meal-submit");
    if (submit) submit.disabled = selectedMealItems().length === 0 || selectedMealItems().some(({ amount }) => number(amount, 0) <= 0);
    return;
  }

  const profileForm = target.closest('form[data-form="profile"]');
  if (profileForm && target.name === "waterGoal") {
    updateProfileWaterFromForm(profileForm);
  }
  const waterPanel = target.closest("[data-profile-water]");
  if (waterPanel && target.name === "waterGoal") {
    updateProfileWaterFromForm(waterPanel);
  }
});

setupKeyboardBehavior();

bootstrap().catch((error) => {
  app.innerHTML = `<div class="boot-screen"><div class="brand-mark">80</div><div><strong>Не удалось запустить Eighty</strong><span>${escapeHtml(error.message)}</span></div></div>`;
});
