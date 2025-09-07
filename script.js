// ===== Beállítások =====
const SPIN_INTERVAL_MS = 70;     // adott oszlop frissítésének sebessége
const SPIN_DURATION_MS = 1200;   // egy oszlop pörgési ideje
const UNIQUE_WINNERS   = true;   // próbáljon különböző neveket adni
const ORDER = [0, 2, 1];         // oszlopok sorrendje: 0=bal, 1=közép, 2=jobb

// ===== DOM =====
const grid     = document.getElementById("grid");
const mid0     = document.getElementById("mid0");
const mid1     = document.getElementById("mid1");
const mid2     = document.getElementById("mid2");
const lever    = document.getElementById("lever");
const statusEl = document.getElementById("status");

// ===== Állapot =====
let NAMES = [];
let spinning = false;
let spinTimer = null;

let winners = ["", "", ""]; // oszloponkénti végleges középső név
let nextIndex = 0;          // hanyadik oszlop jön (ORDER indexe)
let lockedCols = [false, false, false]; // kipörgött oszlopok

// ===== Segédek =====
const randItem = arr => arr[Math.floor(Math.random() * arr.length)];

function uniquePick(excludeSet){
  const pool = NAMES.filter(n => !excludeSet.has(n));
  return (pool.length ? randItem(pool) : randItem(NAMES));
}

// Visszaadja egy oszlop (0..2) 3 celláját: [felső, középső, alsó]
function getColEls(col){
  const cells = Array.from(document.querySelectorAll(".cell"));
  // rács: soronként 3 cella, ezért indexek: col, 3+col, 6+col
  return [cells[col], cells[3+col], cells[6+col]];
}

function updateStatus() {
  const shown = winners.filter(Boolean);
  statusEl.textContent = shown.length ? shown.join(" | ") : "Pörgetésre kész";
}

// ===== Nevek betöltése =====
fetch("names.json")
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(list => {
    NAMES = Array.isArray(list) ? list : [];
    if (NAMES.length === 0) throw new Error("Üres névlista");
    // kezdeti feltöltés minden cellába
    document.querySelectorAll(".cell").forEach(c => c.textContent = randItem(NAMES));
    updateStatus();
  })
  .catch(err => {
    console.error("names.json betöltési hiba:", err);
    NAMES = ["Anna","Bence","Csilla","Dávid","Eszter","Ferenc"]; // fallback
    document.querySelectorAll(".cell").forEach(c => c.textContent = randItem(NAMES));
    statusEl.textContent = "⚠ Nem sikerült betölteni a names.json fájlt (fallback).";
  });

// ===== Egy oszlop pörgetése karhúzásra =====
function spinOne(){
  if (spinning) return;
  if (NAMES.length === 0) return;
  if (nextIndex >= ORDER.length) {
    statusEl.textContent = "Már megvan a TOP 3! (reset szükséges)";
    return;
  }

  const col = ORDER[nextIndex];
  if (lockedCols[col]) { // elvben nem fordul elő, de óvatosan
    nextIndex++;
    return spinOne();
  }

  spinning = true;
  statusEl.textContent = "Pörög…";

  // csak az AKTUÁLIS oszlop 3 celláját frissítjük
  const [topEl, midEl, botEl] = getColEls(col);
  [topEl, midEl, botEl].forEach(el => el.classList.add("rolling"));


  spinTimer = setInterval(() => {
    // csak ezt a 3 cellát „tekerjük”
    topEl.textContent = randItem(NAMES);
    midEl.textContent = randItem(NAMES);
    botEl.textContent = randItem(NAMES);
  }, SPIN_INTERVAL_MS);

  setTimeout(() => {
    clearInterval(spinTimer);

    // véglegesítsük a KÖZÉPSŐ cellát
    let pick;
    if (UNIQUE_WINNERS) {
      const used = new Set(winners.filter(Boolean));
      pick = uniquePick(used);
    } else {
      pick = randItem(NAMES);
    }
    midEl.textContent = pick;

    // ez az oszlop „zárolva”
    winners[col] = pick;
    lockedCols[col] = true;

    // vizuális kiemelés le
    [topEl, midEl, botEl].forEach(el => el.classList.remove("rolling"));

    // következő oszlopra lépés
    nextIndex++;

    updateStatus();
    spinning = false;
  }, SPIN_DURATION_MS);
}

// ===== Reset (új kör indításához) =====
function resetMachine(){
  winners = ["","",""];
  lockedCols = [false,false,false];
  nextIndex = 0;
  document.querySelectorAll(".cell").forEach(c => c.textContent = randItem(NAMES));
  updateStatus();
}

// ===== Esemény =====
lever.addEventListener("click", spinOne);

// Ha lesz külön „Újra” gombod, kösd rá:
// document.getElementById("resetBtn").addEventListener("click", resetMachine);
