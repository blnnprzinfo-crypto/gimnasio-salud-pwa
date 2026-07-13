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
  startDate: yesterdayKey(),
  migratedBackDay: true,
  weights: [{ date: yesterdayKey(), value: 80 }],
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

const latestWeight = () => state.weights[state.weights.length - 1]?.value || 80;
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
  .filter((exercise) => normalize(exercise.name) === normalize(name) && parseKg(exercise.value))
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

const workoutVolume = (workout) => (workout.exercises || []).reduce((total, exercise) => {
  const sets = Number(exercise.sets) || 1;
  const reps = Number(exercise.reps) || 1;
  return total + (parseKg(exercise.value) * sets * reps);
}, 0);

const workoutSets = (workout) => (workout.exercises || []).reduce((total, exercise) => total + (Number(exercise.sets) || 1), 0);

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
  const firstWeight = state.weights[0]?.value || weight;
  const workout = getWorkout() || { title: "", exercises: [] };
  const dayNumber = Math.max(1, daysBetween(state.startDate, selectedDate) + 1);
  const isToday = selectedDate === todayKey();
  const isYesterday = selectedDate === yesterdayKey();

  setText("dayLabel", `Dia ${dayNumber} - ${isToday ? "hoy" : formatDate(selectedDate)}`);
  setText("selectedDateLabel", isToday ? "Hoy" : isYesterday ? "Ayer" : formatDate(selectedDate));
  setText("selectedDateDetail", selectedDate);
  setText("currentWeight", `${weight.toFixed(1).replace(".0", "")} kg`);
  setText("activeWorkoutTitle", workout.title || "Elige grupo");
  setText("activeWorkoutMeta", `${workout.exercises.length} ejercicios · objetivo ${state.targetWeight} kg`);
  setText("sessionCount", String(workout.exercises.length));
  setText("totalVolume", `${Math.round(workoutVolume(workout))} kg`);
  setText("setsToday", String(workoutSets(workout)));

  const sessionProgress = Math.min(100, workout.exercises.length * 20);
  const sessionRing = document.querySelector(".session-ring");
  if (sessionRing) {
    sessionRing.style.background = `conic-gradient(var(--green) ${sessionProgress * 3.6}deg, #f1f1f2 0deg)`;
  }

  const delta = weight - firstWeight;
  setText("weightDelta", delta === 0 ? "Sin cambios" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg total`);
  setText("streakHero", `${state.workouts.filter((item) => item.title || item.exercises?.length).length}`);
  const topRecord = records()[0];
  setText("recordHero", topRecord ? `${topRecord.kg} kg` : "0 kg");
  setText("workoutTitleLabel", workout.title || "Sin entreno");
  document.getElementById("workoutTitleInput").value = workout.title || "";
  document.querySelectorAll("[data-plan]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.plan === workout.title);
  });
  renderGymTimer();

  document.getElementById("exerciseList").innerHTML = workout.exercises.map((item, index) => {
    const kg = parseKg(item.value);
    const volume = Math.round(kg * (Number(item.sets) || 1) * (Number(item.reps) || 1));
    return `<div class="exercise-item">
      <div class="exercise-thumb exercise-thumb-${exerciseKind(item.name)}" aria-hidden="true"></div>
      <div>
        <strong>${item.name}</strong>
        <span>${[
          item.sets ? `${item.sets} series` : "1 serie",
          item.reps ? `${item.reps} reps` : "",
          item.value
        ].filter(Boolean).join(" · ")}</span>
        <small>${kg ? `Volumen aprox. ${volume} kg` : "Cardio / tiempo"}</small>
      </div>
      <button class="remove-exercise" data-remove-exercise="${index}" type="button" aria-label="Eliminar ejercicio">&#10005;</button>
    </div>`;
  }).join("") || `<div class="module-empty">Aun no has marcado ejercicios para este dia.</div>`;

  renderExercisePicker(workout);
  renderRecords();
}

function renderGymTimer() {
  const active = state.gymTimer?.active;
  const startedAt = state.gymTimer?.startedAt;
  const elapsed = active && startedAt ? Date.now() - startedAt : (state.gymTimer?.elapsed || 0);
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  setText("gymTimerLabel", `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
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
          <span>${done ? "Registrado" : `Tocar para añadir · ${exercise.value || "sin peso"}`}</span>
        </div>
        <em>${done ? "OK" : "+"}</em>
      </button>`;
  }).join("");
}

function renderRecords() {
  const list = document.getElementById("recordsList");
  const best = records();
  list.innerHTML = best.length ? best.slice(0, 8).map((item) => {
    const history = exerciseHistory(item.name).slice(-5);
    return `<div class="record-item">
      <div class="exercise-thumb exercise-thumb-${exerciseKind(item.name)}" aria-hidden="true"></div>
      <div>
        <strong>${item.name}</strong>
        <span>${item.kg} kg · ${item.workout || "Entreno"} · ${item.date}</span>
        <div class="record-bars">${history.map((entry) => {
          const kg = parseKg(entry.value);
          const height = Math.max(18, Math.round((kg / Math.max(item.kg, 1)) * 100));
          return `<i style="height:${height}%"><b>${kg}</b></i>`;
        }).join("")}</div>
      </div>
    </div>`;
  }).join("") : `<div class="module-empty">Cuando guardes pesos en kg, aqui apareceran tus records por ejercicio.</div>`;
}

document.querySelectorAll("[data-plan]").forEach((button) => {
  button.addEventListener("click", () => {
    const workout = ensureWorkout();
    const canResetTemplate = workout.title !== button.dataset.plan && matchesTemplateExercises(workout);
    workout.title = button.dataset.plan;
    if (canResetTemplate) {
      workout.exercises = [];
    }
    save();
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

document.getElementById("exerciseList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-exercise]");
  if (!button) return;
  const workout = ensureWorkout();
  workout.exercises.splice(Number(button.dataset.removeExercise), 1);
  save();
});

document.getElementById("clearWorkoutButton").addEventListener("click", () => {
  const workout = getWorkout();
  if (!workout || (!workout.title && !workout.exercises.length)) return;
  if (!confirm("Vaciar el entreno de este dia?")) return;
  workout.title = "";
  workout.exercises = [];
  save();
});

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

document.getElementById("prevDayButton").addEventListener("click", () => {
  selectedDate = addDays(selectedDate, -1);
  render();
});

document.getElementById("nextDayButton").addEventListener("click", () => {
  selectedDate = addDays(selectedDate, 1);
  render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

render();
if (state.gymTimer?.active) {
  gymTimerInterval = setInterval(renderGymTimer, 1000);
}

