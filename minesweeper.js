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
const timerSpan = document.getElementById('timer');
const banner = document.getElementById('banner');
const boardModeSelect = document.getElementById('boardMode');
const overlay = document.getElementById('overlay');

let timer = 0;
let timerInterval = null;
let firstMove = true;

// Leaderboard locale in localStorage
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
    .slice(0, 10);
  saveLeaderboard(leaderboard);
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
    showOverlayWin(
      `Complimenti!<br>Punteggio: <strong>${score}</strong> · Tempo: <strong>${timer}s</strong>`
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

  let cellSize;
  if (boardMode === 'expert') {
    cellSize = 32;
    gameBoard.style.width = (cellSize * cols) + 'px';
    gameBoard.style.maxWidth = '100vw';
  } else {
    const boardWidth = Math.min(window.innerWidth * 0.98, 450);
    cellSize = boardWidth / cols;
    gameBoard.style.width = '';
    gameBoard.style.maxWidth = '';
  }
  gameBoard.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;

  /* CREA celle DOM e collega al modello dati */

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellDiv = document.createElement('div');
      cellDiv.className = 'cell';
      // Collega alla cella logica:
      board[r][c].element = cellDiv;
      // Aggiorna aspetto
      updateCellView(r, c);
      // Collega gli eventi click
      cellDiv.addEventListener('click', function(e) {
        if (e.button === 0) revealCell(r, c);
      });
      cellDiv.addEventListener('contextmenu', function(e){
        e.preventDefault();
        toggleFlag(r, c);
      });
      gameBoard.appendChild(cellDiv);
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
}

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

// Overlay Game Over grafica deluxe, NO duplicazione info
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
      <button class="overlayButton" onclick="showLocalLeaderboardOverlay()">Classifica</button>
    </div>
  </div>`;
  overlay.style.display = "flex";
}

// Overlay vittoria, stesso stile
function showOverlayWin(msg) {
  if (!overlay) return;
  overlay.innerHTML = `
  <div id="overlayContent" class="animated-overlay">
    <div class="gameover-icon" style="font-size:2em;">🏆</div>
    <div class="gameover-title" style="background:linear-gradient(90deg,#35a7ff,#e3414b);color:#fff;">VITTORIA!</div>
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
      <button class="overlayButton" onclick="showLocalLeaderboardOverlay()">Classifica</button>
    </div>
  </div>`;
  overlay.style.display = "flex";
}

function hideOverlay() {
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.innerHTML = "";
}

function showLocalLeaderboardOverlay() {
  const overlayLb = document.getElementById('localLeaderboardOverlay');
  const leaderboard = getLeaderboard();
  let list = "";
  if (!leaderboard.length) {
    list = '<li>Nessun punteggio registrato.</li>';
  } else {
    leaderboard.forEach((entry, i) => {
      let prefix = '';
      if (i === 0) prefix = '🥇 ';
      else if (i === 1) prefix = '🥈 ';
      else if (i === 2) prefix = '🥉 ';
      const tempo = entry.duration !== undefined ? `${entry.duration}s` : '-';
      list += `<li>${prefix}${entry.name ?? "Anonimo"} – ${tempo} – ${entry.score} · ${entry.time}</li>`;
    });
  }

  overlayLb.innerHTML = `
    <div class="leaderboardOverlayBox">
      <h2>Classifica Locale</h2>
      <div class="lb-mode-label">${BOARD_MODES[boardMode].label}</div>
      <ul>${list}</ul>
      <button class="overlayButton" onclick="closeLocalLeaderboardOverlay()">Chiudi</button>
    </div>
  `;
  overlayLb.style.display = "flex";
}

function closeLocalLeaderboardOverlay() {
  document.getElementById('localLeaderboardOverlay').style.display = "none";
}

async function submitScore() {
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
function resetTimer() { timer = 0; timerSpan.textContent = timer; clearInterval(timerInterval); }

function showRules() {
  const rulesOverlay = document.getElementById('rulesOverlay');
  rulesOverlay.innerHTML = `
    <div class="rulesContent">
      <h2 style="color:#35a7ff;">Come si gioca a Minesweeper?</h2>
      <ul style="text-align:left;font-size:1.07em;line-height:1.5;color:#193972;padding-left:20px;">
        <li>Scopo: <b>Scoprire tutte le celle senza mine</b>, piazzando bandierine dove pensi ci siano mine.</li>
        <li><b>Click singolo</b> su una cella per scoprirla.<br>
        <b>Long press</b> (tocco prolungato su smartphone) o <b>tasto centrale del mouse</b> per mettere/rimuovere una bandierina.</li>
        <li>Se scopri una mina: <b>Game Over!</b></li>
        <li>Ogni cella mostra un numero: indica quante mine ci sono nelle celle adiacenti.</li>
        <li>Vinci se scopri tutte le celle libere (<b>senza mine</b>).</li>
      </ul>
      <div style="margin:18px 0 5px 0;">
        <button onclick="hideRules()" class="overlayButton">OK, ho capito!</button>
      </div>
    </div>
  `;
  rulesOverlay.style.display = "flex";
}
function hideRules() {
  document.getElementById('rulesOverlay').style.display = "none";
}

document.addEventListener('keydown', function(e){
  if(e.key === "Escape" && document.getElementById('localLeaderboardOverlay').style.display === "flex") {
    closeLocalLeaderboardOverlay();
  }
});

window.addEventListener('resize', renderBoard);

// Inizializza il gioco
createBoard();
renderBoard();
stopTimer();
