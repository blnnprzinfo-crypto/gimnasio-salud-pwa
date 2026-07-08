const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayKey = () => dateKey();
const addDays = (key, days) => {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return dateKey(date);
};
const formatDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
};
const daysBetween = (start, end) => Math.floor((new Date(end) - new Date(start)) / 86400000);

const yesterdayKey = () => addDays(todayKey(), -1);
const seed = {
  targetWeight: 65,
  waterGoal: 2000,
  startDate: yesterdayKey(),
  migratedBackDay: true,
  weights: [{ date: yesterdayKey(), value: 80 }],
  water: {},
  modules: [
    {
      id: "sleep",
      title: "Sueno",
      type: "numero",
      placeholder: "Ej: 7.5 h",
      entries: {}
    }
  ],
  workouts: [
    {
      date: yesterdayKey(),
      title: "Espalda",
      exercises: [
        { name: "Jalon al pecho", value: "30 kg" },
        { name: "Biceps en polea curl", value: "20 kg" },
        { name: "Remo", value: "25 kg" },
        { name: "Pull down", value: "20 kg" },
        { name: "Correr cinta", value: "17 min" }
      ]
    }
  ]
};

const legDayExercises = [
  { name: "Hip thrust", value: "10 kg", sets: "", reps: "" },
  { name: "Peso muerto", value: "9 kg", sets: "", reps: "" },
  { name: "Patada de rana", value: "25 kg", sets: "", reps: "" },
  { name: "Abducciones", value: "25 kg", sets: "", reps: "" },
  { name: "Escaleras", value: "2,5 min", sets: "", reps: "" }
];

const load = () => {
  const saved = localStorage.getItem("gym-pwa-data");
  const data = saved ? JSON.parse(saved) : seed;
  data.modules = data.modules || seed.modules;
  data.water = data.water || {};
  data.weights = data.weights || seed.weights;
  data.workouts = data.workouts || seed.workouts;
  data.startDate = data.startDate || data.workouts[0]?.date || data.weights[0]?.date || todayKey();

  const hasOnlyDefaultBackDay = data.workouts.length === 1
    && data.workouts[0].title === "Espalda"
    && data.workouts[0].date === todayKey()
    && data.workouts[0].exercises?.length === 5
    && !data.migratedBackDay;
  let changed = false;

  if (hasOnlyDefaultBackDay) {
    data.workouts[0].date = yesterdayKey();
    data.weights = data.weights.map((item) => item.date === todayKey() ? { ...item, date: yesterdayKey() } : item);
    data.startDate = yesterdayKey();
    data.migratedBackDay = true;
    changed = true;
  }

  const hasTodayWorkout = data.workouts.some((item) => item.date === todayKey());
  if (!hasTodayWorkout && !data.suggestedLegDay) {
    data.workouts.push({ date: todayKey(), title: "Pierna", exercises: legDayExercises });
    data.suggestedLegDay = true;
    changed = true;
  }

  const todayWorkout = data.workouts.find((item) => item.date === todayKey());
  if (todayWorkout?.title === "Pierna" && !todayWorkout.seededLegExercises && (!todayWorkout.exercises || todayWorkout.exercises.length === 0)) {
    todayWorkout.exercises = legDayExercises;
    todayWorkout.seededLegExercises = true;
    changed = true;
  }

  if (changed) {
    localStorage.setItem("gym-pwa-data", JSON.stringify(data));
  }

  return data;
};

let state = load();
let selectedDate = todayKey();

const save = () => {
  localStorage.setItem("gym-pwa-data", JSON.stringify(state));
  render();
};

const latestWeight = () => state.weights[state.weights.length - 1]?.value || 80;
const selectedWater = () => state.water[selectedDate] || 0;
const getWorkout = (date = selectedDate) => state.workouts.find((item) => item.date === date);
const ensureWorkout = () => {
  let workout = state.workouts.find((item) => item.date === selectedDate);
  if (!workout) {
    workout = { date: selectedDate, title: "", exercises: [] };
    state.workouts.push(workout);
  }
  return workout;
};

const setText = (id, text) => {
  document.getElementById(id).textContent = text;
};

function render() {
  const weight = latestWeight();
  const totalToLose = 80 - state.targetWeight;
  const lost = 80 - weight;
  const progress = Math.max(0, Math.min(100, Math.round((lost / totalToLose) * 100)));
  const water = selectedWater();
  const waterPct = Math.min(100, Math.round((water / state.waterGoal) * 100));
  const workout = getWorkout() || { title: "", exercises: [] };
  const dayNumber = Math.max(1, daysBetween(state.startDate, selectedDate) + 1);
  const isToday = selectedDate === todayKey();
  const isYesterday = selectedDate === yesterdayKey();

  setText("dayLabel", `Dia ${dayNumber} - ${isToday ? "hoy" : formatDate(selectedDate)}`);
  setText("selectedDateLabel", isToday ? "Hoy" : isYesterday ? "Ayer" : formatDate(selectedDate));
  setText("selectedDateDetail", selectedDate);

  setText("currentWeight", `${weight.toFixed(1).replace(".0", "")} kg`);
  setText("weightProgress", `${progress}%`);
  document.querySelector(".progress-ring").style.background = `conic-gradient(var(--green) ${progress * 3.6}deg, rgba(255,255,255,0.12) 0deg)`;
  setText("waterSummary", `${water} / ${state.waterGoal} ml`);
  document.getElementById("waterBar").style.width = `${waterPct}%`;
  setText("waterMessage", water >= state.waterGoal ? "Objetivo de agua cumplido. Buen trabajo." : `Faltan ${state.waterGoal - water} ml para cumplir este dia.`);

  const firstWeight = state.weights[0]?.value || weight;
  const delta = weight - firstWeight;
  setText("weightDelta", delta === 0 ? "Sin cambios" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg total`);
  setText("weightMessage", weight <= firstWeight ? "Vas en buena direccion. Lo importante es registrar, no hacerlo perfecto." : "Sin drama: registra el dato y seguimos con el plan.");

  setText("workoutsWeek", String(state.workouts.length));
  setText("waterStreak", water >= state.waterGoal ? "1" : "0");
  setText("weightStreak", String(state.weights.length));
  setText("streakSummary", `Dia ${dayNumber}`);
  setText("workoutTitleLabel", workout.title || "Sin entreno");
  setText("todayWorkoutMini", workout.title || "Sin entreno");
  document.getElementById("workoutTitleInput").value = workout.title || "";

  document.getElementById("todaySummary").innerHTML = [
    `${isToday ? "Hoy" : "Este dia"}: ${workout.title || "sin entreno marcado"}.`,
    water >= state.waterGoal ? "Has cumplido el agua de hoy." : `Te faltan ${state.waterGoal - water} ml de agua.`,
    `${workout.exercises.length} ejercicios registrados.`
  ].map((item) => `<li>${item}</li>`).join("");

  document.getElementById("exerciseList").innerHTML = workout.exercises.map((item) => (
    `<div class="exercise-item"><strong>${item.name}</strong><span>${[
      item.sets ? `${item.sets} series` : "",
      item.reps ? `${item.reps} reps` : "",
      item.value
    ].filter(Boolean).join(" · ")}</span></div>`
  )).join("");

  renderModules();
  renderHistory();
  renderStreakDots();

  const weights = state.weights.slice(-8);
  const min = Math.min(...weights.map((item) => item.value), state.targetWeight);
  const max = Math.max(...weights.map((item) => item.value), 80);
  document.getElementById("weightChart").innerHTML = weights.map((item) => {
    const height = 20 + ((max - item.value) / Math.max(1, max - min)) * 110;
    return `<div style="height:${height}px" title="${item.date}: ${item.value} kg"></div>`;
  }).join("");
}

function renderStreakDots() {
  const days = Array.from({ length: 7 }, (_, index) => addDays(todayKey(), index - 6));
  document.getElementById("streakColors").innerHTML = days.map((date) => {
    const trained = state.workouts.some((item) => item.date === date && (item.title || item.exercises?.length));
    return `<span class="streak-dot ${trained ? "done" : ""}" title="${date}"></span>`;
  }).join("");
}

function renderHistory() {
  const dates = [...new Set([
    ...state.workouts.map((item) => item.date),
    ...state.weights.map((item) => item.date),
    ...Object.keys(state.water)
  ])].sort().reverse().slice(0, 10);

  document.getElementById("historyList").innerHTML = dates.map((date) => {
  const workout = getWorkout(date);
    const weight = state.weights.find((item) => item.date === date);
    const water = state.water[date] || 0;
    return `
      <button class="history-item" data-go-date="${date}" type="button">
        <strong>${date === todayKey() ? "Hoy" : date === yesterdayKey() ? "Ayer" : formatDate(date)}</strong>
        <span>${workout?.title || "Sin entreno"} · ${workout?.exercises?.length || 0} ejercicios · ${water} ml agua${weight ? ` · ${weight.value} kg` : ""}</span>
      </button>`;
  }).join("") || `<div class="module-empty">Aun no hay historial. Empieza registrando hoy.</div>`;
}

function renderModules() {
  const list = document.getElementById("moduleList");
  if (!state.modules.length) {
    list.innerHTML = `<div class="module-empty">Toca el lapiz para crear un modulo: sueno, pasos, medidas, comida o lo que quieras.</div>`;
    return;
  }

  list.innerHTML = state.modules.map((module) => {
    const value = module.entries?.[selectedDate] || "";
    if (module.type === "check") {
      return `
        <div class="module-item" data-module-id="${module.id}">
          <div class="panel-title">
            <div><strong>${module.title}</strong><span>${value ? "Completado hoy" : module.placeholder}</span></div>
            <button class="delete-module" data-delete-module="${module.id}" type="button">Borrar</button>
          </div>
          <div class="module-check">
            <button data-toggle-module="${module.id}" type="button">${value ? "Hecho" : "Marcar hecho"}</button>
          </div>
        </div>`;
    }
    return `
      <div class="module-item" data-module-id="${module.id}">
        <div class="panel-title">
          <div><strong>${module.title}</strong><span>${value || "Sin dato hoy"}</span></div>
          <button class="delete-module" data-delete-module="${module.id}" type="button">Borrar</button>
        </div>
        <div class="module-row">
          <input data-module-input="${module.id}" inputmode="${module.type === "numero" ? "decimal" : "text"}" placeholder="${module.placeholder}" value="${value}">
          <button data-save-module="${module.id}" type="button">OK</button>
        </div>
      </div>`;
  }).join("");
}

document.querySelectorAll("[data-water]").forEach((button) => {
  button.addEventListener("click", () => {
    state.water[selectedDate] = selectedWater() + Number(button.dataset.water);
    save();
  });
});

document.getElementById("weightForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("weightInput");
  const value = Number(String(input.value).replace(",", "."));
  if (!value) return;
  state.weights = state.weights.filter((item) => item.date !== selectedDate);
  state.weights.push({ date: selectedDate, value });
  state.weights.sort((a, b) => a.date.localeCompare(b.date));
  input.value = "";
  save();
});

document.getElementById("workoutTitleForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("workoutTitleInput");
  ensureWorkout().title = input.value.trim();
  save();
});

document.getElementById("exerciseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("exerciseName");
  const sets = document.getElementById("exerciseSets");
  const reps = document.getElementById("exerciseReps");
  const value = document.getElementById("exerciseWeight");
  if (!name.value.trim() || !value.value.trim()) return;
  ensureWorkout().exercises.push({
    name: name.value.trim(),
    sets: sets.value.trim(),
    reps: reps.value.trim(),
    value: value.value.trim()
  });
  name.value = "";
  sets.value = "";
  reps.value = "";
  value.value = "";
  save();
});

document.getElementById("goWorkoutButton").addEventListener("click", () => {
  document.querySelector('[data-view="workouts"]').click();
});

document.getElementById("moduleList").addEventListener("click", (event) => {
  const saveId = event.target.dataset.saveModule;
  const toggleId = event.target.dataset.toggleModule;
  const deleteId = event.target.dataset.deleteModule;

  if (saveId) {
    const module = state.modules.find((item) => item.id === saveId);
    const input = document.querySelector(`[data-module-input="${saveId}"]`);
    if (!module || !input.value.trim()) return;
    module.entries = module.entries || {};
    module.entries[selectedDate] = input.value.trim();
    save();
  }

  if (toggleId) {
    const module = state.modules.find((item) => item.id === toggleId);
    if (!module) return;
    module.entries = module.entries || {};
    module.entries[selectedDate] = module.entries[selectedDate] ? "" : "Hecho";
    save();
  }

  if (deleteId) {
    state.modules = state.modules.filter((item) => item.id !== deleteId);
    save();
  }
});

document.getElementById("prevDayButton").addEventListener("click", () => {
  selectedDate = addDays(selectedDate, -1);
  render();
});

document.getElementById("nextDayButton").addEventListener("click", () => {
  selectedDate = addDays(selectedDate, 1);
  render();
});

document.getElementById("historyList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-go-date]");
  if (!button) return;
  selectedDate = button.dataset.goDate;
  document.querySelector('[data-view="today"]').click();
  render();
});

document.getElementById("editModulesButton").addEventListener("click", () => {
  document.getElementById("moduleDialog").showModal();
});

document.getElementById("addModuleInlineButton").addEventListener("click", () => {
  document.getElementById("moduleDialog").showModal();
});

document.getElementById("closeModuleDialog").addEventListener("click", () => {
  document.getElementById("moduleDialog").close();
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const [title, type, placeholder] = button.dataset.preset.split("|");
    document.getElementById("moduleTitle").value = title;
    document.getElementById("moduleType").value = type;
    document.getElementById("modulePlaceholder").value = placeholder;
  });
});

document.getElementById("moduleForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("moduleTitle").value.trim();
  const type = document.getElementById("moduleType").value;
  const placeholder = document.getElementById("modulePlaceholder").value.trim() || "Escribe el dato de hoy";
  if (!title) return;

  state.modules.push({
    id: `${Date.now()}`,
    title,
    type,
    placeholder,
    entries: {}
  });

  document.getElementById("moduleTitle").value = "";
  document.getElementById("moduleType").value = "numero";
  document.getElementById("modulePlaceholder").value = "";
  document.getElementById("moduleDialog").close();
  save();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.view}View`).classList.add("active");
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

render();
