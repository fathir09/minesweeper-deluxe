const BOARD_MODES = {
  beginner:     { rows: 9,  cols: 9,  mines: 10,    label: 'Principiante (9x9)' },
  intermediate: { rows: 16, cols: 16, mines: 40,   label: 'Intermedio (16x16)' },
  expert:       { rows: 16, cols: 30, mines: 99,   label: 'Esperto (16x30)'    }
};

let boardMode = 'beginner'; // Modalità attuale
let rows = BOARD_MODES[boardMode].rows;
let cols = BOARD_MODES[boardMode].cols;
let minesCount = BOARD_MODES[boardMode].mines;
const board = [];
let score = 0;
let gameActive = true;

const gameBoard = document.getElementById('gameBoard');
const scoreSpan = document.getElementById('score');
const leaderboardList = document.getElementById('leaderboard');
const overlay = document.getElementById('overlay');
const timerSpan = document.getElementById('timer');
const banner = document.getElementById('banner');
const modeLabelLeaderboard = document.getElementById('mode-label-leaderboard');
const boardModeSelect = document.getElementById('boardMode');

let timer = 0;
let timerInterval = null;
let firstMove = true;

// Leaderboard separata per ogni modalità
function getLeaderboardKey() {
  return "minesweeperLeaderboard_" + boardMode;
}

function getLeaderboard() {
  const data = localStorage.getItem(getLeaderboardKey());
  return data ? JSON.parse(data) : [];
}

function saveLeaderboard(leaderboard) {
  localStorage.setItem(getLeaderboardKey(), JSON.stringify(leaderboard));
}

function addScoreToLeaderboard(score, name, duration) {
  let leaderboard = getLeaderboard();
  const time = new Date().toLocaleString();
  leaderboard.push({ score, name, time, duration });
  leaderboard = leaderboard
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.duration - b.duration;
    })
    .slice(0, 10); // Top 10 per modalità
  saveLeaderboard(leaderboard);
  renderLeaderboard();
}

function renderLeaderboard() {
  if (!leaderboardList) return;
  leaderboardList.innerHTML = '';
  // Label modalità sopra la lista
  if (modeLabelLeaderboard) {
    modeLabelLeaderboard.textContent = "CLASSIFICA " + BOARD_MODES[boardMode].label;
  }
  const leaderboard = getLeaderboard();
  leaderboard.forEach(entry => {
    const tempo = entry.duration !== undefined ? ` – ${entry.duration}s` : '';
    leaderboardList.innerHTML += `<li>${entry.name ?? 'Anonimo'}${tempo} – ${entry.score} – ${entry.time}</li>`;
  });
}

function updateScoreDisplay() {
  scoreSpan.textContent = score;
}

function createBoard() {
  board.length = 0;
  score = 0;
  updateScoreDisplay();
  for (let r = 0; r < rows; r++) {
    board[r] = [];
    for (let c = 0; c < cols; c++) {
      board[r][c] = {
        mine: false,
        adjacent: 0,
        revealed: false,
        flagged: false,
        element: null
      };
    }
  }
  let placed = 0;
  while (placed < minesCount) {
    let r = Math.floor(Math.random() * rows);
    let c = Math.floor(Math.random() * cols);
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          let nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine)
            count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
}

function updateCellView(r, c) {
  const cell = board[r][c];
  if (cell.revealed) {
    cell.element.classList.add("revealed");
    cell.element.classList.remove("mine");
    cell.element.removeAttribute('data-adjacent');
    if (cell.mine) {
      cell.element.classList.add("mine");
      cell.element.innerHTML = "<img src='bomb.png' alt='mina' style='width:24px;height:24px;'>";
    } else {
      if (cell.adjacent > 0) {
        cell.element.innerHTML = cell.adjacent;
        cell.element.setAttribute('data-adjacent', cell.adjacent);
      } else {
        cell.element.innerHTML = "";
      }
    }
  } else if (cell.flagged) {
    cell.element.innerHTML = "<img src='red-flag.png' alt='flag' style='width:24px;height:24px;'>";
    cell.element.classList.remove("revealed", "mine");
    cell.element.removeAttribute('data-adjacent');
  } else {
    cell.element.innerHTML = "";
    cell.element.classList.remove("revealed", "mine");
    cell.element.removeAttribute('data-adjacent');
  }
}

function toggleFlag(r, c) {
  const cell = board[r][c];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  updateCellView(r, c);
}

function checkWin() {
  let unrevealedCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (!cell.mine && !cell.revealed) {
        unrevealedCount++;
      }
    }
  }
  if (unrevealedCount === 0) {
    gameActive = false;
    stopTimer();
    showOverlay(
      `Complimenti, hai vinto!<br>Punteggio: <strong>${score}</strong><br>Tempo: <strong>${timer}</strong> secondi`
    );
    showBanner && showBanner("🎉 Vittoria! Nuovo record?");
    return true;
  }
  return false;
}

function revealCell(r, c) {
  if (!gameActive) return;
  if (firstMove) {
    startTimer();
    firstMove = false;
  }
  const cell = board[r][c];
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  updateCellView(r, c);

  if (!cell.mine) {
    score++;
    updateScoreDisplay();
    if (checkWin()) return;
  }

  if (cell.mine) {
    gameActive = false;
    stopTimer();
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (board[i][j].mine) {
          board[i][j].revealed = true;
          if (i === r && j === c) {
            board[i][j].element.innerHTML = "<img src='blast.png' alt='explosion' style='width:24px;height:24px;'>";
          } else {
            board[i][j].element.innerHTML = "<img src='bomb.png' alt='mina' style='width:24px;height:24px;'>";
          }
        }
      }
    }
    showOverlayGameOver();
    showBanner && showBanner("💥 Game Over! Riprova!");
    return;
  }
  if (cell.adjacent > 0) {
    return;
  } else {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        let nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          revealCell(nr, nc);
        }
      }
    }
  }
}

function renderBoard() {
  gameBoard.innerHTML = '';
  gameBoard.style.gridTemplateColumns = `repeat(${cols}, 38px)`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.tabIndex = 0;
      div.onclick = () => { if (gameActive) revealCell(r, c); };
      div.onauxclick = (e) => {
        if (gameActive && e.button === 1) {
          e.preventDefault();
          toggleFlag(r, c);
        }
      };
      div.onkeydown = (e) => {
        if (!gameActive) return;
        if (e.key === "Enter" || e.key === " ") revealCell(r, c);
        else if (e.key.toLowerCase() === "f") toggleFlag(r, c);
      };
      board[r][c].element = div;
      updateCellView(r, c);
      gameBoard.appendChild(div);
    }
  }
}

function restartGame() {
  gameActive = true;
  firstMove = true;
  resetTimer();
  createBoard();
  renderBoard();
  updateScoreDisplay();
  hideOverlay();
  renderLeaderboard();
}

// Modalità dinamica
if (boardModeSelect) {
  boardModeSelect.value = boardMode;
  boardModeSelect.addEventListener('change', function () {
    boardMode = this.value;
    rows = BOARD_MODES[boardMode].rows;
    cols = BOARD_MODES[boardMode].cols;
    minesCount = BOARD_MODES[boardMode].mines;
    restartGame();
  });
}

// Leaderboard popup (pagina separata)
function openLeaderboard() {
  window.open('leaderboard.html', 'Leaderboard', 'width=650,height=750');
}

// Overlay Game Over (grafica avanzata, pulsanti distanziati)
function showOverlayGameOver() {
  if (!overlay) return;
  overlay.innerHTML = `
  <div id="overlayContent" class="animated-overlay">
    <div class="gameover-icon">💥</div>
    <div class="gameover-title">GAME OVER</div>
    <div class="stats-row">
      <div class="stats-label">Punteggio</div>
      <div class="stats-value">${score}</div>
      <div class="stats-label">Tempo</div>
      <div class="stats-value">${timer}s</div>
    </div>
    <div style="margin:16px 0;">
      <input id="playerName" type="text" placeholder="Il tuo nome..."
        style="font-size:1em; padding:6px 16px; border-radius:12px; border:1px solid #b9d8ef;">
    </div>
    <div class="overlayButtonsRow">
      <button class="overlayButton" onclick="submitScore()">Salva e nuova partita</button>
      <button class="overlayButton" onclick="openLeaderboard()">Leaderboard</button>
    </div>
  </div>`;
  overlay.style.display = "flex";
}


// Overlay vittoria
function showOverlay(msg) {
  if (!overlay) return;
  overlay.innerHTML = `<div id="overlayContent" class="animated-overlay">
    <div class="gameover-icon" style="font-size:2em;">🏅</div>
    <div class="gameover-title" style="background:linear-gradient(90deg,#35a7ff,#e3414b);color:#fff;">VITTORIA!</div>
    <div class="gameover-msg">${msg}</div>
    <div class="gameover-pills">
      <span class="pill-score">🎯 <b>${score}</b> punti</span>
      <span class="pill-time">⏱️ <b>${timer}</b>s</span>
    </div>
    <div style="margin:14px 0;">
      <input id="playerName" type="text" placeholder="Il tuo nome..." style="font-size:1em; padding:6px 16px; border-radius:12px; border:1px solid #b9d8ef;">
    </div>
    <div class="overlayButtonsRow">
      <button class="overlayButton" onclick="submitScore()">Salva e nuova partita</button>
      <button class="overlayButton" onclick="openLeaderboard()">Leaderboard</button>
    </div>
  </div>`;
  overlay.style.display = "flex";
}

function hideOverlay() {
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.innerHTML = "";
}

function submitScore() {
  const input = document.getElementById('playerName');
  let name = input ? input.value.trim() : '';
  if (!name) name = 'Anonimo';
  addScoreToLeaderboard(score, name, timer);
  restartGame();
  hideOverlay();
}

function showBanner(msg) {
  if (!banner) return;
  banner.textContent = msg;
  banner.style.display = "block";
  setTimeout(() => { banner.style.display = "none"; }, 2000);
}

function startTimer() {
  timer = 0;
  timerSpan.textContent = timer;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer++;
    timerSpan.textContent = timer;
  }, 1000);
}

function stopTimer() { clearInterval(timerInterval); }
function resetTimer() {
  timer = 0;
  timerSpan.textContent = timer;
  clearInterval(timerInterval);
}

// Inizializza il gioco
createBoard();
renderBoard();
renderLeaderboard();
stopTimer();
