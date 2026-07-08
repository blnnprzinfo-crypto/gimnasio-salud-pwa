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
  modules: [],
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

const planTemplates = {
  Pierna: legDayExercises,
  Espalda: [
    { name: "Jalon al pecho", value: "30 kg", sets: "", reps: "" },
    { name: "Biceps en polea curl", value: "20 kg", sets: "", reps: "" },
    { name: "Remo", value: "25 kg", sets: "", reps: "" },
    { name: "Pull down", value: "20 kg", sets: "", reps: "" },
    { name: "Correr cinta", value: "17 min", sets: "", reps: "" }
  ],
  Pecho: [
    { name: "Press banca", value: "0 kg", sets: "", reps: "" },
    { name: "Press inclinado", value: "0 kg", sets: "", reps: "" },
    { name: "Aperturas", value: "0 kg", sets: "", reps: "" },
    { name: "Fondos asistidos", value: "0 kg", sets: "", reps: "" }
  ],
  Triceps: [
    { name: "Triceps en polea", value: "0 kg", sets: "", reps: "" },
    { name: "Extension cuerda", value: "0 kg", sets: "", reps: "" },
    { name: "Press frances", value: "0 kg", sets: "", reps: "" },
    { name: "Fondos asistidos", value: "0 kg", sets: "", reps: "" }
  ],
  Gluteo: [
    { name: "Hip thrust", value: "10 kg", sets: "", reps: "" },
    { name: "Patada de rana", value: "25 kg", sets: "", reps: "" },
    { name: "Abducciones", value: "25 kg", sets: "", reps: "" },
    { name: "Peso muerto rumano", value: "0 kg", sets: "", reps: "" }
  ],
  Cardio: [
    { name: "Correr cinta", value: "0 min", sets: "", reps: "" },
    { name: "Escaleras", value: "0 min", sets: "", reps: "" },
    { name: "Bicicleta", value: "0 min", sets: "", reps: "" }
  ]
};

const load = () => {
  const saved = localStorage.getItem("gym-pwa-data");
  const data = saved ? JSON.parse(saved) : seed;
  data.modules = data.modules || seed.modules;
  data.modules = data.modules.filter((module) => module.id !== "sleep" && module.title !== "Sueno");
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
    data.workouts.push({ date: todayKey(), title: "Pierna", exercises: [] });
    data.suggestedLegDay = true;
    changed = true;
  }

  if (changed) {
    localStorage.setItem("gym-pwa-data", JSON.stringify(data));
  }

  return data;
};

let state = load();
let selectedDate = todayKey();
let gymTimerInterval = null;

const save = () => {
  localStorage.setItem("gym-pwa-data", JSON.stringify(state));
  render();
};

const fileToDataUrl = (file) => new Promise((resolve) => {
  if (!file) {
    resolve("");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

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

const parseKg = (value = "") => {
  const match = String(value).replace(",", ".").match(/(\d+(?:\.\d+)?)\s*kg/i);
  return match ? Number(match[1]) : 0;
};

const normalize = (value = "") => String(value).trim().toLowerCase();

const exerciseKind = (name = "") => {
  const clean = name.toLowerCase();
  if (clean.includes("jalon") || clean.includes("pull")) return "lat";
  if (clean.includes("remo")) return "row";
  if (clean.includes("biceps") || clean.includes("curl")) return "cable";
  if (clean.includes("hip") || clean.includes("glute")) return "hip";
  if (clean.includes("peso muerto")) return "deadlift";
  if (clean.includes("abdu")) return "abductor";
  if (clean.includes("prensa") || clean.includes("pierna")) return "leg";
  if (clean.includes("cinta") || clean.includes("correr")) return "run";
  if (clean.includes("escalera")) return "stairs";
  return "machine";
};

const allExercises = () => state.workouts.flatMap((workout) =>
  (workout.exercises || []).map((exercise) => ({ ...exercise, date: workout.date, workout: workout.title }))
);

const exerciseHistory = (name) => allExercises()
  .filter((exercise) => exercise.name.toLowerCase().trim() === name.toLowerCase().trim() && parseKg(exercise.value))
  .sort((a, b) => a.date.localeCompare(b.date));

const records = () => {
  const byName = new Map();
  allExercises().forEach((exercise) => {
    const kg = parseKg(exercise.value);
    if (!kg) return;
    const key = exercise.name.toLowerCase().trim();
    const current = byName.get(key);
    if (!current || kg > current.kg) {
      byName.set(key, { ...exercise, kg });
    }
  });
  return [...byName.values()].sort((a, b) => b.kg - a.kg);
};

const workoutGroupCounts = () => {
  const counts = new Map();
  state.workouts.forEach((workout) => {
    if (!workout.title && !workout.exercises?.length) return;
    const title = workout.title || "Entreno";
    counts.set(title, (counts.get(title) || 0) + 1);
  });
  return [...counts.entries()].map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count);
};

const matchesTemplateExercises = (workout) => {
  const template = planTemplates[workout.title] || [];
  if (!template.length || workout.exercises.length !== template.length) return false;
  return template.every((exercise, index) => {
    const current = workout.exercises[index];
    return normalize(current?.name) === normalize(exercise.name)
      && String(current?.value || "") === String(exercise.value || "")
      && !current?.sets
      && !current?.reps;
  });
};

function render() {
  const weight = latestWeight();
  const totalToLose = 80 - state.targetWeight;
  const lost = 80 - weight;
  const progress = Math.max(0, Math.min(100, Math.round((lost / totalToLose) * 100)));
  const water = selectedWater();
  const workout = getWorkout() || { title: "", exercises: [] };
  const dayNumber = Math.max(1, daysBetween(state.startDate, selectedDate) + 1);
  const isToday = selectedDate === todayKey();
  const isYesterday = selectedDate === yesterdayKey();

  setText("dayLabel", `Dia ${dayNumber} - ${isToday ? "hoy" : formatDate(selectedDate)}`);
  setText("selectedDateLabel", isToday ? "Hoy" : isYesterday ? "Ayer" : formatDate(selectedDate));
  setText("selectedDateDetail", selectedDate);

  setText("currentWeight", `${weight.toFixed(1).replace(".0", "")} kg`);
  setText("weightProgress", `${progress}%`);
  const progressRing = document.querySelector(".progress-ring");
  if (progressRing) {
    progressRing.style.background = `conic-gradient(var(--green) ${progress * 3.6}deg, #f1f1f2 0deg)`;
  }
  setText("waterSummary", "");
  setText("waterMessage", "");

  const firstWeight = state.weights[0]?.value || weight;
  const delta = weight - firstWeight;
  setText("weightDelta", delta === 0 ? "Sin cambios" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg total`);
  setText("weightMessage", weight <= firstWeight ? "Vas en buena direccion. Lo importante es registrar, no hacerlo perfecto." : "Sin drama: registra el dato y seguimos con el plan.");

  setText("workoutsWeek", String(state.workouts.length));
  setText("waterStreak", water >= state.waterGoal ? "1" : "0");
  setText("weightStreak", String(state.weights.length));
  setText("streakSummary", `Dia ${dayNumber}`);
  setText("streakHero", `${state.workouts.filter((item) => item.title || item.exercises?.length).length}`);
  const topRecord = records()[0];
  setText("recordHero", topRecord ? `${topRecord.kg} kg` : "0 kg");
  setText("workoutTitleLabel", workout.title || "Sin entreno");
  setText("todayWorkoutMini", workout.title || "Sin entreno");
  document.getElementById("workoutTitleInput").value = workout.title || "";
  document.querySelectorAll("[data-plan]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.plan === workout.title);
  });
  updateHealthLinks(weight, water, workout);
  renderGymTimer();

  document.getElementById("todaySummary").innerHTML = [
    `${isToday ? "Hoy" : "Este dia"}: ${workout.title || "sin entreno marcado"}.`,
    `${workout.exercises.length} ejercicios registrados.`
  ].map((item) => `<li>${item}</li>`).join("");

  document.getElementById("exerciseList").innerHTML = workout.exercises.map((item) => (
    `<div class="exercise-item">
      <div class="exercise-thumb exercise-thumb-${exerciseKind(item.name)}" aria-hidden="true"></div>
      <div><strong>${item.name}</strong><span>${[
        item.sets ? `${item.sets} series` : "",
        item.reps ? `${item.reps} reps` : "",
        item.value
      ].filter(Boolean).join(" · ")}</span></div>
    </div>`
  )).join("") || `<div class="module-empty">Aun no has marcado ejercicios para este dia.</div>`;

  renderExercisePicker(workout);
  renderRecords();
  renderHomeRecords();
  renderGroupCounts();
  renderFeaturedExercise(workout);
  renderCalendar();

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

function renderGymTimer() {
  const active = state.gymTimer?.active;
  const startedAt = state.gymTimer?.startedAt;
  const elapsed = active && startedAt ? Date.now() - startedAt : (state.gymTimer?.elapsed || 0);
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  setText("gymTimerLabel", `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
  setText("gymTimerMessage", active ? "Modo gym activo. Cuando acabes, toca Terminar." : "Cuenta cuanto tiempo estas entrenando hoy.");
}

function renderFeaturedExercise(workout) {
  const featured = workout.exercises.find((item) => parseKg(item.value)) || workout.exercises[0] || records()[0];
  const title = featured?.name || "Elige un ejercicio";
  const featuredKg = featured ? (featured.kg || parseKg(featured.value)) : 0;
  const history = featured ? exerciseHistory(featured.name) : [];
  const values = history.length > 1 ? history.map((item) => item.kg) : [0, Math.max(1, Math.round(featuredKg * 0.6)), featuredKg];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  setText("featuredExerciseTitle", workout.title ? `${workout.title}: ejercicio destacado` : "Progreso de fuerza");
  setText("featuredExerciseName", title);
  setText("featuredExerciseDate", featured?.date || "nuevo");
  setText("featuredExercisePr", featuredKg ? `${featuredKg} kg` : "0 kg");
  document.getElementById("featuredMachineFigure").className = `exercise-thumb exercise-thumb-${exerciseKind(title)}`;

  document.getElementById("strengthChart").innerHTML = values.map((value, index) => {
    const height = 12 + ((value - min) / range) * 72;
    return `<div class="simple-bar ${index === values.length - 1 ? "best" : ""}" style="height:${height}%"><span>${value || ""}</span></div>`;
  }).join("");
}

function renderExercisePicker(workout) {
  const plan = planTemplates[workout.title] ? workout.title : "Pierna";
  const suggestions = planTemplates[plan] || [];
  const list = document.getElementById("exercisePickerList");
  setText("exercisePickerPlan", workout.title || "Sin grupo");

  if (!suggestions.length) {
    list.innerHTML = `<div class="module-empty">Escribe el dia arriba o anade tu ejercicio nuevo abajo.</div>`;
    return;
  }

  list.innerHTML = suggestions.map((exercise) => {
    const done = workout.exercises.some((item) => normalize(item.name) === normalize(exercise.name));
    return `
      <button class="exercise-pick ${done ? "done" : ""}" data-template-exercise="${exercise.name}" type="button">
        <div class="exercise-thumb exercise-thumb-${exerciseKind(exercise.name)}" aria-hidden="true"></div>
        <div>
          <strong>${exercise.name}</strong>
          <span>${done ? "Registrado" : `Tocar para anadir · ${exercise.value || "sin peso"}`}</span>
        </div>
        <em>${done ? "OK" : "+"}</em>
      </button>`;
  }).join("");
}

function renderGroupCounts() {
  const list = document.getElementById("groupCountList");
  const counts = workoutGroupCounts();
  const max = Math.max(...counts.map((item) => item.count), 1);
  list.innerHTML = counts.length ? counts.map((item) => `
    <div class="group-count-row">
      <div>
        <strong>${item.title}</strong>
        <span>${item.count} ${item.count === 1 ? "dia" : "dias"}</span>
      </div>
      <div class="group-count-bar"><i style="width:${Math.max(18, (item.count / max) * 100)}%"></i></div>
    </div>
  `).join("") : `<div class="module-empty">Cuando guardes entrenos, aqui veras que grupos repites mas.</div>`;
}

function renderHomeRecords() {
  const list = document.getElementById("homeRecordsList");
  const best = records().slice(0, 3);
  list.innerHTML = best.length ? best.map((item) => `
    <div class="record-item">
      <div class="exercise-thumb exercise-thumb-${exerciseKind(item.name)}" aria-hidden="true"></div>
      <div>
        <strong>${item.name}</strong>
        <span>${item.kg} kg · ${item.workout || "Entreno"}</span>
      </div>
    </div>
  `).join("") : `<div class="module-empty">Tus PRs apareceran aqui cuando guardes ejercicios con kg.</div>`;
}

function renderCalendar() {
  const days = Array.from({ length: 7 }, (_, index) => addDays(todayKey(), index - 3));
  document.getElementById("calendarStrip").innerHTML = days.map((date) => {
    const workout = getWorkout(date);
    const hasWorkout = !!(workout?.title || workout?.exercises?.length);
    const hasWater = (state.water[date] || 0) >= state.waterGoal;
    const isSelected = date === selectedDate;
    return `
      <button class="calendar-day ${isSelected ? "selected" : ""}" data-calendar-date="${date}" type="button">
        <span>${formatDate(date).split(" ")[0]}</span>
        <strong>${Number(date.slice(-2))}</strong>
        <small>${hasWorkout ? "🏋️" : hasWater ? "💧" : "·"}</small>
      </button>`;
  }).join("");
}

function renderRecords() {
  const list = document.getElementById("recordsList");
  const best = records();
  list.innerHTML = best.length ? best.slice(0, 8).map((item) => `
    <div class="record-item">
      <div class="exercise-thumb exercise-thumb-${exerciseKind(item.name)}" aria-hidden="true"></div>
      <div>
        <strong>${item.name}</strong>
        <span>${item.kg} kg · ${item.workout || "Entreno"} · ${item.date}</span>
      </div>
    </div>
  `).join("") : `<div class="module-empty">Cuando guardes pesos en kg, aqui apareceran tus records por ejercicio.</div>`;
}

function shortcutUrl(name, text) {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(text)}`;
}

function updateHealthLinks(weight, water, workout) {
  ["shortcutWaterLink", "shortcutWeightLink", "shortcutWorkoutLink", "shortcutFocusLink", "shortcutWater250Link", "shortcutWater500Link", "shortcutWater750Link", "shortcutWater1000Link"].forEach((id) => {
    document.getElementById(id).textContent = "";
  });
}

function renderStreakDots() {
  const days = Array.from({ length: 7 }, (_, index) => addDays(todayKey(), index - 6));
  document.getElementById("streakColors").innerHTML = days.map((date) => {
    const trained = state.workouts.some((item) => item.date === date && (item.title || item.exercises?.length));
    return `<span class="streak-dot ${trained ? "done" : ""}" title="${date}">${trained ? "🔥" : "·"}</span>`;
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
        <span>${workout?.title || "Sin entreno"} · ${workout?.exercises?.length || 0} ejercicios${weight ? ` · ${weight.value} kg` : ""}</span>
      </button>`;
  }).join("") || `<div class="module-empty">Aun no hay historial. Empieza registrando hoy.</div>`;
}

function renderModules() {
  const list = document.getElementById("moduleList");
  if (!state.modules.length) {
    list.innerHTML = `<div class="module-empty">Toca el lapiz para crear un modulo: pasos, medidas, comida o lo que quieras.</div>`;
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
    save();
  });
});

document.querySelectorAll("[data-plan]").forEach((button) => {
  button.addEventListener("click", () => {
    const workout = ensureWorkout();
    const canResetTemplate = workout.title !== button.dataset.plan && matchesTemplateExercises(workout);
    workout.title = button.dataset.plan;
    if (canResetTemplate) {
      workout.exercises = [];
    }
    save();
    document.querySelector('[data-view="workouts"]').click();
  });
});

document.getElementById("exercisePickerList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-template-exercise]");
  if (!button) return;
  const workout = ensureWorkout();
  const plan = planTemplates[workout.title] ? workout.title : "Pierna";
  const template = (planTemplates[plan] || []).find((exercise) => exercise.name === button.dataset.templateExercise);
  if (!template) return;
  const exists = workout.exercises.some((item) => normalize(item.name) === normalize(template.name));
  if (!exists) {
    workout.exercises.push({ ...template });
  }
  save();
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

document.getElementById("exerciseForm").addEventListener("submit", async (event) => {
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

document.getElementById("quickWorkoutButton").addEventListener("click", () => {
  document.querySelector('[data-view="workouts"]').click();
});

document.getElementById("quickWeightButton").addEventListener("click", () => {
  document.getElementById("weightInput").focus();
});

document.getElementById("healthHelpButton").addEventListener("click", () => {});

document.getElementById("startGymTimerButton").addEventListener("click", () => {
  state.gymTimer = { active: true, startedAt: Date.now(), elapsed: state.gymTimer?.elapsed || 0 };
  save();
  clearInterval(gymTimerInterval);
  gymTimerInterval = setInterval(renderGymTimer, 1000);
});

document.getElementById("stopGymTimerButton").addEventListener("click", () => {
  if (state.gymTimer?.active) {
    const elapsed = Date.now() - state.gymTimer.startedAt;
    state.gymTimer = { active: false, elapsed };
    const workout = ensureWorkout();
    workout.durationMin = Math.round(elapsed / 60000);
    save();
  }
  clearInterval(gymTimerInterval);
});

document.getElementById("enableNotificationsButton").addEventListener("click", async () => {
  const message = document.getElementById("notificationMessage");
  if (!("Notification" in window)) {
    message.textContent = "Este navegador no permite notificaciones web.";
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    message.textContent = "Notificaciones activadas. Te mostrare un aviso de prueba.";
    new Notification("Gimnasio", { body: "Recuerda registrar tu progreso." });
  } else {
    message.textContent = "No se han activado. Revisa permisos de Safari/iPhone.";
  }
});

document.getElementById("closeHealthDialog").addEventListener("click", () => {});

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

document.getElementById("calendarStrip").addEventListener("click", (event) => {
  const button = event.target.closest("[data-calendar-date]");
  if (!button) return;
  selectedDate = button.dataset.calendarDate;
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
if (state.gymTimer?.active) {
  gymTimerInterval = setInterval(renderGymTimer, 1000);
}

