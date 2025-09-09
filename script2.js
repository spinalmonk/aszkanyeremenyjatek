// ===== Beállítások =====
const SPIN_INTERVAL_MS  = 70;            // frissítés sebessége az aktuális oszlopnál
const SPIN_DURATION_MS  = 30000;        // 5 perc / oszlop
const ORDER             = [0, 2, 1];     // pörgés sorrend: bal -> jobb -> közép

// >>> Előre megadott nyertesek (EZZEL IRÁNYÍTOD, KI JÖJJÖN KI) <<<
const PRESET = {
  first:  "Gábor",  // 1. hely (középső oszlop)
  second: "Bence",  // 2. hely (jobb oszlop)
  third:  "Anna"    // 3. hely (bal oszlop)
};

// ===== Hangok =====
const bgMusic      = document.getElementById("bgMusic");
const leverSound   = document.getElementById("leverSound");
const spinSound    = document.getElementById("spinSound");
const timeoutSound = document.getElementById("timeoutSound");
if (spinSound) spinSound.loop = true;

// ===== DOM =====
const grid     = document.getElementById("grid");
const mid0     = document.getElementById("mid0");
const mid1     = document.getElementById("mid1");
const mid2     = document.getElementById("mid2");
const lever    = document.getElementById("lever");
const statusEl = document.getElementById("status");

// ===== Állapot =====
let NAMES = [];                        // csak az animáció „peregjen” tőlük
let spinning = false;
let spinTimer = null;

let winners = ["", "", ""];            // 0=bal(3.), 1=közép(1.), 2=jobb(2.)
let lockedCols = [false,false,false];
let nextIndex = 0;                     // hanyadik elem az ORDER-ben

// --- visszaszámláló a status helyén ---
let countdownTimer = null;
let remainingMs = 0;

// ===== Segédek =====
const randItem = arr => arr[Math.floor(Math.random() * arr.length)];

// Visszaadja egy oszlop (0..2) 3 celláját: [felső, középső, alsó]
function getColEls(col){
  const cells = Array.from(document.querySelectorAll(".cell"));
  return [cells[col], cells[3+col], cells[6+col]];
}

// A PRESET alapján megmondjuk, az adott oszlopnál melyik név a végleges
function presetForColumn(col){
  if (col === 0) return PRESET.third;   // bal -> 3.
  if (col === 2) return PRESET.second;  // jobb -> 2.
  return PRESET.first;                   // közép -> 1.
}

// Státusz kiírás: 3. (bal) 2. (jobb) 1. (közép)
function updateStatus() {
  const [left, middle, right] = winners;
  const parts = [];
  if (left)  parts.push(`3. ${left}`);
  if (right) parts.push(`2. ${right}`);
  if (middle) parts.push(`1. ${middle}`);
  statusEl.textContent = parts.length ? parts.join(" ") : "⏳05:00";
}

// --- visszaszámláló a status helyén ---
function formatTime(ms){
  const total = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(total/60);
  const s = total % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function showCountdown(){
  statusEl.textContent = `⏳ ${formatTime(remainingMs)}`;
  statusEl.classList.add("counting");
}
function startCountdown(durationMs){
  stopCountdown();
  remainingMs = durationMs;
  showCountdown();
  countdownTimer = setInterval(() => {
    remainingMs -= 1000;
    showCountdown();
    if (remainingMs <= 0){
      stopCountdown(); // visszaáll a normál státuszra
    }
  }, 1000);
}
function stopCountdown(){
  if (countdownTimer){
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  statusEl.classList.remove("counting");
  remainingMs = 0;
  updateStatus();
}

// ===== Nevek betöltése =====
fetch("names.json")
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
  .then(list => {
    NAMES = Array.isArray(list) && list.length ? list : ["Anna","Bence","Csilla","Dávid","Eszter","Ferenc"];
    // kezdeti feltöltés: minden cella kap random nevet és marad homályos
    document.querySelectorAll(".cell").forEach(c => {
      c.textContent = randItem(NAMES);
      c.classList.remove("revealed","rolling");
    });
    updateStatus();
  })
  .catch(err => {
    console.error("names.json betöltési hiba:", err);
    NAMES = ["Anna","Bence","Csilla","Dávid","Eszter","Ferenc"]; // fallback
    document.querySelectorAll(".cell").forEach(c => {
      c.textContent = randItem(NAMES);
      c.classList.remove("revealed","rolling");
    });
    statusEl.textContent = "⚠ Nem sikerült betölteni a names.json fájlt (fallback).";
  });

// ===== Egy oszlop pörgetése karhúzásra (mindig PRESET-et fed fel) =====
function spinOne(){
  ensureMusicPlaying();

  if (spinning) return;

  // kar hang
  if (leverSound){
    try { leverSound.volume = 0.3; leverSound.currentTime = 0; leverSound.play(); } catch {}
  }

  if (nextIndex >= ORDER.length) {
    statusEl.textContent = "Már megvan a TOP 3! (reset szükséges)";
    return;
  }

  const col = ORDER[nextIndex];
  if (lockedCols[col]) { nextIndex++; return spinOne(); }

  spinning = true;

  // csak az AKTUÁLIS oszlop 3 celláját frissítjük
  const [topEl, midEl, botEl] = getColEls(col);

  // pörgés közben homályosítás az adott oszlopra
  [topEl, midEl, botEl].forEach(el => el.classList.add("rolling"));
  // a végleges középső majd felfedődik -> most biztosítsuk, hogy rejtett
  midEl.classList.remove("revealed");

  // visszaszámláló indítása a státuszon
  startCountdown(SPIN_DURATION_MS);

  // pörgés hang indítása
  if (spinSound){
    try { spinSound.volume = 0.3; spinSound.currentTime = 0; spinSound.play(); } catch {}
  }

  // vizuális pörgés: csak ezt a 3 cellát "tekerjük"
  spinTimer = setInterval(() => {
    topEl.textContent = randItem(NAMES);
    midEl.textContent = randItem(NAMES);
    botEl.textContent = randItem(NAMES);
  }, SPIN_INTERVAL_MS);

  // a kör vége: megállítás
  setTimeout(() => {
    clearInterval(spinTimer);

    // pörgés hang leállítása
    if (spinSound){
      try { spinSound.pause(); spinSound.currentTime = 0; } catch {}
    }

    const timedOut = remainingMs <= 0; // lejárt-e a visszaszámláló
    stopCountdown(); // visszaáll normál státuszra (és kiírja a kész/eredményt)

    if (timedOut && timeoutSound){
      try { timeoutSound.currentTime = 0; timeoutSound.play(); } catch {}
    }

    // <<< VÉGLEGES NÉV: PRESET szerint
    const pick = presetForColumn(col);
    midEl.textContent = pick;
    midEl.classList.add("revealed"); // felfedés

    // lockoljuk ezt az oszlopot
    winners[col] = pick;
    lockedCols[col] = true;

    // pörgés effekt le az aktuális oszlopról
    [topEl, midEl, botEl].forEach(el => el.classList.remove("rolling"));

    nextIndex++;
    spinning = false;

    // frissítsük a helyezettek kiírását
    updateStatus();
  }, SPIN_DURATION_MS);
}

// ===== Reset (új kör indításához) =====
function resetMachine(){
  winners = ["","",""];
  lockedCols = [false,false,false];
  nextIndex = 0;

  // pörgés hang biztosan álljon
  if (spinSound){ try { spinSound.pause(); spinSound.currentTime = 0; } catch {} }

  stopCountdown();

  document.querySelectorAll(".cell").forEach(c => {
    c.textContent = randItem(NAMES);
    c.classList.remove("revealed","rolling");
  });
  updateStatus();
}

// ===== Esemény =====
lever.addEventListener("click", spinOne);

// ===== Zene indítása első interakciónál =====
function ensureMusicPlaying() {
  if (!bgMusic) return;
  if (bgMusic.paused) {
    try { bgMusic.volume = 0.1; bgMusic.play(); } catch (e) { console.log("Autoplay blokkolva:", e); }
  }
}
