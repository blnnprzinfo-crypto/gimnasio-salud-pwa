const todayKey = () => new Date().toISOString().slice(0, 10);
const seed = {
  targetWeight: 65,
  waterGoal: 2000,
  weights: [{ date: todayKey(), value: 80 }],
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
      date: todayKey(),
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

const load = () => {
  const saved = localStorage.getItem("gym-pwa-data");
  const data = saved ? JSON.parse(saved) : seed;
  data.modules = data.modules || seed.modules;
  return data;
};

let state = load();

const save = () => {
  localStorage.setItem("gym-pwa-data", JSON.stringify(state));
  render();
};

const latestWeight = () => state.weights[state.weights.length - 1]?.value || 80;
const todayWater = () => state.water[todayKey()] || 0;
const todayWorkout = () => {
  let workout = state.workouts.find((item) => item.date === todayKey());
  if (!workout) {
    workout = { date: todayKey(), title: "Entreno", exercises: [] };
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
  const water = todayWater();
  const waterPct = Math.min(100, Math.round((water / state.waterGoal) * 100));
  const workout = todayWorkout();

  setText("currentWeight", `${weight.toFixed(1).replace(".0", "")} kg`);
  setText("weightProgress", `${progress}%`);
  document.querySelector(".progress-ring").style.background = `conic-gradient(var(--green) ${progress * 3.6}deg, rgba(255,255,255,0.12) 0deg)`;
  setText("waterSummary", `${water} / ${state.waterGoal} ml`);
  document.getElementById("waterBar").style.width = `${waterPct}%`;
  setText("waterMessage", water >= state.waterGoal ? "Objetivo de agua cumplido. Buen trabajo." : `Te faltan ${state.waterGoal - water} ml para cumplir tu objetivo.`);

  const firstWeight = state.weights[0]?.value || weight;
  const delta = weight - firstWeight;
  setText("weightDelta", delta === 0 ? "Sin cambios" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg total`);
  setText("weightMessage", weight <= firstWeight ? "Vas en buena direccion. Lo importante es registrar, no hacerlo perfecto." : "Sin drama: registra el dato y seguimos con el plan.");

  setText("workoutsWeek", String(state.workouts.length));
  setText("waterStreak", water >= state.waterGoal ? "1" : "0");
  setText("weightStreak", String(state.weights.length));
  setText("streakSummary", `Dia ${state.workouts.length}`);

  document.getElementById("todaySummary").innerHTML = [
    `Has entrenado ${state.workouts.length} vez esta semana.`,
    water >= state.waterGoal ? "Has cumplido el agua de hoy." : `Te faltan ${state.waterGoal - water} ml de agua.`,
    `Hoy tienes ${workout.exercises.length} ejercicios registrados.`
  ].map((item) => `<li>${item}</li>`).join("");

  document.getElementById("exerciseList").innerHTML = workout.exercises.map((item) => (
    `<div class="exercise-item"><strong>${item.name}</strong><span>${item.value}</span></div>`
  )).join("");

  renderModules();

  const weights = state.weights.slice(-8);
  const min = Math.min(...weights.map((item) => item.value), state.targetWeight);
  const max = Math.max(...weights.map((item) => item.value), 80);
  document.getElementById("weightChart").innerHTML = weights.map((item) => {
    const height = 20 + ((max - item.value) / Math.max(1, max - min)) * 110;
    return `<div style="height:${height}px" title="${item.date}: ${item.value} kg"></div>`;
  }).join("");
}

function renderModules() {
  const list = document.getElementById("moduleList");
  if (!state.modules.length) {
    list.innerHTML = `<div class="module-empty">Toca el lapiz para crear un modulo: sueno, pasos, medidas, comida o lo que quieras.</div>`;
    return;
  }

  list.innerHTML = state.modules.map((module) => {
    const value = module.entries?.[todayKey()] || "";
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
    state.water[todayKey()] = todayWater() + Number(button.dataset.water);
    save();
  });
});

document.getElementById("weightForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("weightInput");
  const value = Number(String(input.value).replace(",", "."));
  if (!value) return;
  state.weights = state.weights.filter((item) => item.date !== todayKey());
  state.weights.push({ date: todayKey(), value });
  input.value = "";
  save();
});

document.getElementById("exerciseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("exerciseName");
  const value = document.getElementById("exerciseWeight");
  if (!name.value.trim() || !value.value.trim()) return;
  todayWorkout().exercises.push({ name: name.value.trim(), value: value.value.trim() });
  name.value = "";
  value.value = "";
  save();
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
    module.entries[todayKey()] = input.value.trim();
    save();
  }

  if (toggleId) {
    const module = state.modules.find((item) => item.id === toggleId);
    if (!module) return;
    module.entries = module.entries || {};
    module.entries[todayKey()] = module.entries[todayKey()] ? "" : "Hecho";
    save();
  }

  if (deleteId) {
    state.modules = state.modules.filter((item) => item.id !== deleteId);
    save();
  }
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
