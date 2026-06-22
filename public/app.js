const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const app = document.querySelector("#app");
const todayIso = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 0) => Number(value || 0).toFixed(digits).replace(/\.0+$/, "");
const formatDate = (value) => new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

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
    breakfast: "Завтрак",
    lunch: "Обед",
    dinner: "Ужин",
    snacks: "Перекусы"
  },
  productTypes: {
    weight: "По весу",
    cooked: "После приготовления",
    piece: "Поштучный"
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
let currentUser = { id: "demo-user", telegramId: "", name: "Пользователь" };
let activeScreen = "diary";
let selectedDate = todayIso();
let saveTimer = null;
let showAddForm = false;
let addMealDefault = "breakfast";

async function bootstrap() {
  const initData = tg?.initData || "";
  const response = await fetch("/api/bootstrap", {
    headers: initData ? { "X-Telegram-Init-Data": initData } : {}
  });
  const payload = await response.json();
  currentUser = payload.user || currentUser;
  state = payload.state;

  const local = localStorage.getItem("eighty-state-v2");
  if (!initData && local) {
    try {
      state = JSON.parse(local);
    } catch {
      localStorage.removeItem("eighty-state-v2");
    }
  }

  ensureShape();
  render();
}

function ensureShape() {
  state ||= {};
  state.version = 2;
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
    deficitPercent: 15,
    surplusPercent: 10,
    ...(state.profile || {})
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
  state.weightLogs ||= [];
  state.diary[selectedDate] ||= [];
  state.water[selectedDate] ||= 0;
  if (!state.weightLogs.length) state.weightLogs.push({ date: selectedDate, weight: state.profile.weight });
}

function persist() {
  ensureShape();
  localStorage.setItem("eighty-state-v2", JSON.stringify(state));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const initData = tg?.initData || "";
    await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(initData ? { "X-Telegram-Init-Data": initData } : {})
      },
      body: JSON.stringify({ state })
    }).catch(() => {});
  }, 300);
}

function calcTargets() {
  const p = state.profile;
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
  return { bmr, maintenance, calories, protein, fat, carbs };
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

function entriesForDate() {
  ensureShape();
  return state.diary[selectedDate];
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
  if (screen !== "add") showAddForm = false;
  render();
}

function openAdd(meal = "breakfast") {
  activeScreen = "add";
  addMealDefault = meal;
  showAddForm = true;
  render();
}

function changeDate(delta) {
  const date = new Date(`${selectedDate}T00:00:00`);
  date.setDate(date.getDate() + delta);
  selectedDate = date.toISOString().slice(0, 10);
  ensureShape();
  render();
}

function addEntry(form) {
  const data = new FormData(form);
  const product = state.products.find((item) => item.id === data.get("productId"));
  if (!product) return toast("Сначала добавьте продукт в Избранное");
  const amount = number(data.get("amount"), 1);
  entriesForDate().push({
    id: uid(),
    meal: data.get("meal"),
    productId: product.id,
    label: product.name,
    amount,
    unit: product.type === "piece" ? "шт." : "г",
    nutrients: calcProduct(product, amount)
  });
  form.reset();
  showAddForm = false;
  activeScreen = "diary";
  persist();
  render();
  toast("Добавлено в дневник");
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
    name: data.get("name").trim(),
    type: data.get("type"),
    calories: number(data.get("calories")),
    protein: number(data.get("protein")),
    fat: number(data.get("fat")),
    carbs: number(data.get("carbs")),
    cookedDryWeight: number(data.get("cookedDryWeight"), 100),
    cookedReadyWeight: number(data.get("cookedReadyWeight"), 230)
  };
  if (!product.name) return toast("Введите название продукта");
  state.products.unshift(product);
  form.reset();
  persist();
  render();
  toast("Продукт сохранён");
}

function deleteProduct(id) {
  state.products = state.products.filter((item) => item.id !== id);
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
  form.reset();
}

function saveProfile(form) {
  const data = new FormData(form);
  state.profile.name = data.get("name").trim() || "Пользователь";
  state.profile.sex = data.get("sex");
  state.profile.age = number(data.get("age"), 28);
  state.profile.height = number(data.get("height"), 170);
  state.profile.weight = number(data.get("weight"), 75);
  state.profile.targetWeight = number(data.get("targetWeight"), 65);
  state.profile.activity = data.get("activity");
  state.profile.goalMode = data.get("goalMode");
  state.profile.deficitPercent = number(data.get("deficitPercent"), 15);
  state.profile.surplusPercent = number(data.get("surplusPercent"), 10);
  state.settings.waterManual = data.get("waterManual") === "on";
  state.settings.waterGoal = number(data.get("waterGoal"), 2200);

  const existing = state.weightLogs.find((item) => item.date === selectedDate);
  if (existing) existing.weight = state.profile.weight;
  else state.weightLogs.push({ date: selectedDate, weight: state.profile.weight });

  persist();
  render();
  toast("Изменения сохранены");
}

function addWeight(form) {
  const data = new FormData(form);
  const date = data.get("date");
  const weight = number(data.get("weight"));
  const existing = state.weightLogs.find((item) => item.date === date);
  if (existing) existing.weight = weight;
  else state.weightLogs.push({ date, weight });
  state.profile.weight = currentWeight();
  form.reset();
  persist();
  render();
}

function deleteWeight(date) {
  state.weightLogs = state.weightLogs.filter((item) => item.date !== date);
  persist();
  render();
}

function render() {
  ensureShape();
  const targets = calcTargets();
  const consumed = sumNutrients(entriesForDate());

  app.innerHTML = `
    <main class="layout">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">80</div>
          <div class="brand-copy">
            <h1>Eighty</h1>
            <p>Твой путь к цели. Контроль питания, веса и прогресса.</p>
          </div>
        </div>
        <div class="date-switcher">
          <button class="icon-btn" data-action="prev-date" title="Предыдущий день">${icons.prev}</button>
          <input class="date-pill" type="date" value="${selectedDate}" data-action="pick-date" />
          <button class="icon-btn" data-action="next-date" title="Следующий день">${icons.next}</button>
        </div>
      </header>

      ${screenDiary(targets, consumed)}
      ${screenAnalytics(targets)}
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
    <button class="tab ${activeScreen === id ? "active" : ""} ${id === "add" ? "tab-add" : ""}" data-screen="${id}">
      ${icon}<span>${label}</span>
    </button>
  `).join("")}</nav>`;
}

function screenDiary(targets, consumed) {
  const remaining = Math.max(0, targets.calories - consumed.calories);
  const calorieProgress = clamp(consumed.calories / Math.max(1, targets.calories) * 100, 0, 100);
  const water = number(state.water[selectedDate]);
  const goalWater = waterGoal();

  return `<section class="screen ${activeScreen === "diary" ? "active" : ""}">
    <div class="stack">
      <div class="panel calories-card">
        <div class="ring" style="--progress:${calorieProgress}">
          <div class="ring-content">
            <strong>${round(consumed.calories)}</strong>
            <span>съедено</span>
          </div>
        </div>
        <div class="calorie-details">
          <h2>Калории</h2>
          <div class="calorie-grid">
            ${smallStat("Съедено", round(consumed.calories))}
            ${smallStat("Осталось", round(remaining))}
            ${smallStat("Цель", round(targets.calories))}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="section-title"><h2>Приёмы пищи</h2></div>
        <div class="meal-list">${Object.entries(labels.meals).map(([meal, label]) => mealBlock(meal, label)).join("")}</div>
      </div>

      <div class="panel">
        <div class="section-title"><h2>Вода</h2><span>Выпито: ${round(water / 1000, 1)} / ${round(goalWater / 1000, 1)} л</span></div>
        <div class="progress large" style="--value:${clamp(water / Math.max(1, goalWater) * 100, 0, 100)}%"><i></i></div>
        <div class="chip-row">
          <button class="chip-btn" data-water="250">+250 мл</button>
          <button class="chip-btn" data-water="500">+500 мл</button>
          <button class="chip-btn" data-water="1000">+1000 мл</button>
        </div>
        <form class="inline-form" data-form="water">
          <input name="waterAmount" type="number" min="1" step="1" placeholder="Например, 750 мл">
          <button class="secondary-btn" type="submit">Добавить</button>
        </form>
      </div>

      <div class="panel">
        <div class="section-title"><h2>БЖУ</h2><span>Факт / цель</span></div>
        ${macroBar("Белки", consumed.protein, targets.protein, "г")}
        ${macroBar("Жиры", consumed.fat, targets.fat, "г")}
        ${macroBar("Углеводы", consumed.carbs, targets.carbs, "г")}
      </div>

      ${weightSummary()}
    </div>
  </section>`;
}

function smallStat(label, value) {
  return `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function mealBlock(meal, label) {
  const items = entriesForDate().filter((item) => item.meal === meal);
  const total = sumNutrients(items);
  return `<div class="meal-block">
    <div class="meal-header">
      <div>
        <h3>${label}</h3>
        <span>${round(total.calories)} ккал · Б ${round(total.protein)} Ж ${round(total.fat)} У ${round(total.carbs)}</span>
      </div>
      <button class="small-add" data-open-add="${meal}">Добавить</button>
    </div>
    <div class="meal-items">${items.length ? items.map(entryRow).join("") : `<div class="empty-line">Нет продуктов</div>`}</div>
  </div>`;
}

function entryRow(item) {
  return `<div class="entry-row">
    <div>
      <strong>${item.label}</strong>
      <span>${round(item.amount, 1)} ${item.unit} · ${round(item.nutrients.calories)} ккал · Б ${round(item.nutrients.protein)} Ж ${round(item.nutrients.fat)} У ${round(item.nutrients.carbs)}</span>
    </div>
    <button class="icon-btn compact" data-delete-entry="${item.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function macroBar(label, value, target, unit) {
  const progress = clamp(value / Math.max(1, target) * 100, 0, 100);
  return `<div class="macro-bar">
    <div><strong>${label}</strong><span>${round(value)} / ${round(target)} ${unit}</span></div>
    <div class="progress" style="--value:${progress}%"><i></i></div>
  </div>`;
}

function weightSummary() {
  const sorted = [...state.weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  const start = number(sorted[0]?.weight, state.profile.weight);
  const now = currentWeight();
  const target = number(state.profile.targetWeight);
  const total = Math.abs(start - target) || 1;
  const done = clamp(Math.abs(start - now) / total * 100, 0, 100);
  return `<div class="panel">
    <div class="section-title"><h2>Вес</h2><span>Прогресс до цели</span></div>
    <div class="weight-grid">
      ${smallStat("Текущий вес", `${round(now, 1)} кг`)}
      ${smallStat("Целевой вес", `${round(target, 1)} кг`)}
      ${smallStat("Прогресс", `${round(done)}%`)}
    </div>
    <div class="progress large" style="--value:${done}%"><i></i></div>
  </div>`;
}

function screenAdd() {
  return `<section class="screen ${activeScreen === "add" ? "active" : ""}">
    <div class="center-add ${showAddForm ? "hidden" : ""}">
      <button class="big-add-button" data-action="show-add">${icons.add}</button>
      <h2>Добавить еду</h2>
    </div>
    <div class="${showAddForm ? "" : "hidden"}">
      <div class="panel">
        <div class="section-title"><h2>Добавить еду</h2><span>${selectedDate}</span></div>
        <form class="form-grid" data-form="entry">
          <div class="field"><label>Приём пищи</label><select name="meal">${mealOptions(addMealDefault)}</select></div>
          <div class="field"><label>Продукт</label><select name="productId">${productOptions()}</select></div>
          <div class="field"><label>Граммы или штуки</label><input name="amount" type="number" min="0" step="0.1" value="100"></div>
          <div class="field full"><button class="primary-btn" type="submit">Добавить</button></div>
        </form>
      </div>
    </div>
  </section>`;
}

function screenFavorites() {
  return `<section class="screen ${activeScreen === "favorites" ? "active" : ""}">
    <div class="stack">
      <div class="panel">
        <div class="section-title"><h2>Избранное</h2><span>${state.products.length} продуктов</span></div>
        <div class="list">${state.products.length ? state.products.map(productRow).join("") : `<div class="empty">Здесь будут продукты пользователя: котлета, спагетти, яйцо, энергетик, курица.</div>`}</div>
      </div>
      <div class="panel">
        <div class="section-title"><h2>Новый продукт</h2><span>Личная база</span></div>
        <form class="form-grid" data-form="product">
          <div class="field full"><label>Название</label><input name="name" placeholder="Курица" required></div>
          <div class="field full"><label>Тип продукта</label><select name="type">${Object.entries(labels.productTypes).map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></div>
          <div class="field"><label>Калории</label><input name="calories" type="number" step="0.1" value="0"></div>
          <div class="field"><label>Белки</label><input name="protein" type="number" step="0.1" value="0"></div>
          <div class="field"><label>Жиры</label><input name="fat" type="number" step="0.1" value="0"></div>
          <div class="field"><label>Углеводы</label><input name="carbs" type="number" step="0.1" value="0"></div>
          <div class="field"><label>Сухой вес, г</label><input name="cookedDryWeight" type="number" step="1" value="100"></div>
          <div class="field"><label>Готовый вес, г</label><input name="cookedReadyWeight" type="number" step="1" value="230"></div>
          <div class="field full"><button class="primary-btn" type="submit">Сохранить продукт</button></div>
        </form>
      </div>
    </div>
  </section>`;
}

function productRow(product) {
  return `<div class="product-row item-card">
    <div>
      <strong>${product.name}</strong>
      <span>${labels.productTypes[product.type]} · ${round(product.calories)} ккал · Б ${round(product.protein)} Ж ${round(product.fat)} У ${round(product.carbs)}</span>
    </div>
    <button class="icon-btn compact" data-delete-product="${product.id}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function screenProfile(targets) {
  const p = state.profile;
  return `<section class="screen ${activeScreen === "profile" ? "active" : ""}">
    <form class="stack" data-form="profile">
      <div class="panel">
        <div class="section-title"><h2>Профиль</h2><span>ID: ${currentUser.telegramId || "demo-user"}</span></div>
        <div class="profile-meta">
          ${smallStat("Имя пользователя", p.name)}
          ${smallStat("Telegram ID", currentUser.telegramId || "demo-user")}
          ${smallStat("Дата регистрации", formatDate(state.createdAt))}
        </div>
        <div class="form-grid">
          <div class="field"><label>Имя</label><input name="name" value="${p.name}"></div>
          <div class="field"><label>Пол</label><select name="sex">${option("female", "Женский", p.sex)}${option("male", "Мужской", p.sex)}${option("other", "Другой", p.sex)}</select></div>
          <div class="field"><label>Возраст</label><input name="age" type="number" value="${p.age}"></div>
          <div class="field"><label>Рост, см</label><input name="height" type="number" value="${p.height}"></div>
          <div class="field"><label>Вес, кг</label><input name="weight" type="number" step="0.1" value="${p.weight}"></div>
          <div class="field"><label>Цель, кг</label><input name="targetWeight" type="number" step="0.1" value="${p.targetWeight}"></div>
          <div class="field full"><label>Активность</label><select name="activity">${Object.entries(labels.activities).map(([id, label]) => option(id, label, p.activity)).join("")}</select></div>
        </div>
      </div>

      <div class="panel">
        <div class="section-title"><h2>Расчёт КБЖУ</h2><span>BMR ${round(targets.bmr)} ккал</span></div>
        <div class="field full"><label>Режим</label><select name="goalMode">${Object.entries(labels.goals).map(([id, label]) => option(id, label, p.goalMode)).join("")}</select></div>
        <div class="split-controls">
          <div class="field"><label>Дефицит для похудения</label><select name="deficitPercent">${[15, 20, 25, 30].map((v) => option(String(v), `${v}%`, String(p.deficitPercent))).join("")}</select></div>
          <div class="field"><label>Профицит для набора</label><select name="surplusPercent">${[5, 10, 15].map((v) => option(String(v), `${v}%`, String(p.surplusPercent))).join("")}</select></div>
        </div>
        <p class="hint">Рекомендуемые значения для набора массы: 5–15%.</p>
        <div class="target-grid">
          ${smallStat("Калории", round(targets.calories))}
          ${smallStat("Белки", `${round(targets.protein)} г`)}
          ${smallStat("Жиры", `${round(targets.fat)} г`)}
          ${smallStat("Углеводы", `${round(targets.carbs)} г`)}
        </div>
        <p class="formula">Расчёт выполнен по формуле Миффлина — Сан Жеора.</p>
      </div>

      <div class="panel">
        <div class="section-title"><h2>Вода</h2><span>${round(waterGoal() / 1000, 1)} л в день</span></div>
        <label class="check-row"><input name="waterManual" type="checkbox" ${state.settings.waterManual ? "checked" : ""}><span>Задать цель воды вручную</span></label>
        <div class="field"><label>Цель воды, мл</label><input name="waterGoal" type="number" value="${state.settings.waterGoal}"></div>
      </div>

      <button class="primary-btn sticky-save" type="submit">Сохранить изменения</button>
    </form>
  </section>`;
}

function screenAnalytics(targets) {
  const sorted = [...state.weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  const start = number(sorted[0]?.weight, state.profile.weight);
  const now = currentWeight();
  const target = number(state.profile.targetWeight);
  const delta = start - now;
  return `<section class="screen ${activeScreen === "analytics" ? "active" : ""}">
    <div class="stack">
      <div class="panel">
        <div class="section-title"><h2>Аналитика</h2><span>Вес и прогресс</span></div>
        <div class="target-grid">
          ${smallStat("Начальный вес", `${round(start, 1)} кг`)}
          ${smallStat("Текущий вес", `${round(now, 1)} кг`)}
          ${smallStat("Целевой вес", `${round(target, 1)} кг`)}
          ${smallStat(delta >= 0 ? "Сброшено" : "Набрано", `${round(Math.abs(delta), 1)} кг`)}
        </div>
      </div>
      <div class="panel">${weightChart(sorted)}</div>
      <div class="panel">
        <div class="section-title"><h2>Добавить вес</h2><span>История</span></div>
        <form class="form-grid" data-form="weight">
          <div class="field"><label>Дата</label><input name="date" type="date" value="${selectedDate}"></div>
          <div class="field"><label>Вес, кг</label><input name="weight" type="number" step="0.1" value="${round(now, 1)}"></div>
          <div class="field full"><button class="primary-btn" type="submit">Сохранить вес</button></div>
        </form>
        <div class="list history">${sorted.length ? [...sorted].reverse().map(weightRow).join("") : `<div class="empty">Нет записей веса</div>`}</div>
      </div>
    </div>
  </section>`;
}

function weightChart(items) {
  if (items.length < 2) return `<div class="empty">Для графика нужны минимум две записи веса.</div>`;
  const width = 720;
  const height = 230;
  const pad = 30;
  const weights = items.map((item) => number(item.weight));
  const min = Math.min(...weights, number(state.profile.targetWeight)) - 1;
  const max = Math.max(...weights, number(state.profile.targetWeight)) + 1;
  const x = (index) => pad + index * ((width - pad * 2) / Math.max(1, items.length - 1));
  const y = (weight) => height - pad - ((weight - min) / Math.max(1, max - min)) * (height - pad * 2);
  const points = items.map((item, index) => `${x(index)},${y(number(item.weight))}`).join(" ");
  const area = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="График веса">
    <polygon class="area" points="${area}"/>
    <polyline class="line" points="${points}"/>
    ${items.map((item, index) => `<circle class="dot" cx="${x(index)}" cy="${y(number(item.weight))}" r="5"><title>${item.date}: ${round(item.weight, 1)} кг</title></circle>`).join("")}
    <text x="${pad}" y="18">${round(max, 1)} кг</text>
    <text x="${pad}" y="${height - 8}">${round(min, 1)} кг</text>
  </svg>`;
}

function weightRow(item) {
  return `<div class="weight-row item-card">
    <div><strong>${round(item.weight, 1)} кг</strong><span>${item.date}</span></div>
    <button class="icon-btn compact" data-delete-weight="${item.date}" title="Удалить">${icons.trash}</button>
  </div>`;
}

function productOptions() {
  return state.products.length
    ? state.products.map((item) => `<option value="${item.id}">${item.name}</option>`).join("")
    : `<option value="">Нет продуктов</option>`;
}

function mealOptions(selected = "breakfast") {
  return Object.entries(labels.meals).map(([id, label]) => option(id, label, selected)).join("");
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
  if (button.dataset.action === "show-add") {
    showAddForm = true;
    render();
  }
  if (button.dataset.action === "prev-date") changeDate(-1);
  if (button.dataset.action === "next-date") changeDate(1);
  if (button.dataset.openAdd) openAdd(button.dataset.openAdd);
  if (button.dataset.water) addWater(number(button.dataset.water));
  if (button.dataset.deleteEntry) deleteEntry(button.dataset.deleteEntry);
  if (button.dataset.deleteProduct) deleteProduct(button.dataset.deleteProduct);
  if (button.dataset.deleteWeight) deleteWeight(button.dataset.deleteWeight);
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (target.dataset.action === "pick-date") {
    selectedDate = target.value || todayIso();
    ensureShape();
    render();
  }
});

bootstrap().catch((error) => {
  app.innerHTML = `<div class="boot-screen"><div class="brand-mark">80</div><div><strong>Не удалось запустить Eighty</strong><span>${error.message}</span></div></div>`;
});
