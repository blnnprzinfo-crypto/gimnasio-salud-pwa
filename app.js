const todayKey = () => new Date().toISOString().slice(0, 10);
const seed = {
  targetWeight: 65,
  waterGoal: 2000,
  weights: [{ date: todayKey(), value: 80 }],
  water: {},
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
  return saved ? JSON.parse(saved) : seed;
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

  const weights = state.weights.slice(-8);
  const min = Math.min(...weights.map((item) => item.value), state.targetWeight);
  const max = Math.max(...weights.map((item) => item.value), 80);
  document.getElementById("weightChart").innerHTML = weights.map((item) => {
    const height = 20 + ((max - item.value) / Math.max(1, max - min)) * 110;
    return `<div style="height:${height}px" title="${item.date}: ${item.value} kg"></div>`;
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

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.view}View`).classList.add("active");
  });
});

document.getElementById("installHelpButton").addEventListener("click", () => {
  document.getElementById("installDialog").showModal();
});

document.getElementById("closeInstallDialog").addEventListener("click", () => {
  document.getElementById("installDialog").close();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

render();
