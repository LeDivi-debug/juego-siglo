document.addEventListener('DOMContentLoaded', () => {
    // Socket Initialization
    const socket = io();

    // Pantallas
    const menuScreen = document.getElementById('menu-screen');
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');

    // Log System
    const gameLog = document.getElementById('game-log');

    // Modales
    const inventoryModal = document.getElementById('inventory-modal');
    const resultsModal = document.getElementById('results-modal');
    const pauseModal = document.getElementById('pause-modal');

    // Elementos Inventario
    const btnCloseInventory = document.getElementById('btn-close-inventory');
    const modalPlayerName = document.getElementById('modal-player-name');
    const playerChipsContainer = document.getElementById('player-chips-container');
    const currentSumDisplay = document.getElementById('current-sum');
    const sumWithViraDisplay = document.getElementById('sum-with-vira');
    const roundsWonDisplay = document.getElementById('rounds-won');
    const actionMessage = document.getElementById('action-message');

    // Elementos Resultados
    const resultsBody = document.getElementById('results-body');
    const btnNextRound = document.getElementById('btn-next-round');

    // Elementos Pausa
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnRestartRound = document.getElementById('btn-restart-round');
    const btnRestartGame = document.getElementById('btn-restart-game');
    const btnMainMenu = document.getElementById('btn-main-menu');

    // Elementos Historial
    const btnHistory = document.getElementById('btn-history');
    const btnCloseHistory = document.getElementById('btn-close-history');
    const historyModal = document.getElementById('history-modal');
    const historyTableBody = document.getElementById('history-table-body');
    const emptyHistoryMsg = document.getElementById('empty-history-msg');

    // Elementos Victoria
    const victoryModal = document.getElementById('victory-modal');
    const winnerNameDisplay = document.getElementById('winner-name-display');
    const btnVictoryNewGame = document.getElementById('btn-victory-new-game');
    const btnVictoryMenu = document.getElementById('btn-victory-menu');
    const btnVictoryClose = document.getElementById('btn-victory-close');
    const btnBackToVictory = document.getElementById('btn-back-to-victory');
    const confettiContainer = document.getElementById('confetti-container');

    // Botones de Acción
    const btnDraw = document.getElementById('btn-draw');
    const btnSiglo = document.getElementById('btn-siglo');
    const btnStay = document.getElementById('btn-stay');
    const btnFold = document.getElementById('btn-fold');

    // Elementos de Sonido
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const soundIcon = document.getElementById('sound-icon');

    // Módulos de Emotes Rápidos
    const btnEmoteToggle = document.getElementById('btn-emote-toggle');
    const emotesPanel = document.getElementById('emotes-panel');
    const emoteBtns = document.querySelectorAll('.emote-btn');

    // Botones Menú Principal
    const btnPlay = document.getElementById('btn-play');
    const btnExit = document.getElementById('btn-exit');
    const title = document.getElementById('game-title');

    // Botones Configuración
    const btnBack = document.getElementById('btn-back');
    const btnStart = document.getElementById('btn-start');
    const btnDecrease = document.getElementById('btn-decrease');
    const btnIncrease = document.getElementById('btn-increase');

    // Elementos de Interfaz
    const playersGrid = document.getElementById('players-grid');
    const playerNicknameInput = document.getElementById('player-nickname');
    const btnJoin = document.getElementById('btn-join');
    const joinForm = document.getElementById('join-form');
    const adminControls = document.getElementById('admin-controls');

    // Módulos de Reglas
    const rulesModal = document.getElementById('rules-modal');
    const btnShowRulesMain = document.getElementById('btn-show-rules-main');
    const btnShowRulesPause = document.getElementById('btn-show-rules-pause');
    const btnCloseRules = document.getElementById('btn-close-rules');

    let myId = null;
    let isAdmin = false;
    let hasJoined = false;
    let isMuted = localStorage.getItem('gameMuted') === 'true';

    /* =========================================
       AUDIO MANAGER (WEB AUDIO API)
       ========================================= */

    class AudioManager {
        constructor() {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.updateVolume();
        }

        updateVolume() {
            this.masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.5, this.ctx.currentTime, 0.05);
        }

        resume() {
            if (this.ctx.state === 'suspended') this.ctx.resume();
        }

        play(type) {
            this.resume();
            if (isMuted) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);

            const now = this.ctx.currentTime;

            switch (type) {
                case 'click':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                case 'draw':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(600, now + 0.2);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                case 'turn':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, now);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;
                case 'victory': {
                    const notes = [523.25, 659.25, 783.99, 1046.50];
                    notes.forEach((freq, i) => {
                        const o = this.ctx.createOscillator();
                        const g = this.ctx.createGain();
                        o.connect(g);
                        g.connect(this.masterGain);
                        o.frequency.setValueAtTime(freq, now + i * 0.15);
                        g.gain.setValueAtTime(0.2, now + i * 0.15);
                        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
                        o.start(now + i * 0.15);
                        o.stop(now + i * 0.15 + 0.4);
                    });
                    break;
                }
                case 'siglo': {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    osc.start(now);
                    osc.stop(now + 0.5);
                    break;
                }
            }
        }
    }

    const audio = new AudioManager();

    function updateSoundIcon() {
        if (isMuted) {
            soundIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
            btnSoundToggle.title = "Activar Sonido";
        } else {
            soundIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
            btnSoundToggle.title = "Silenciar Sonido";
        }
    }
    updateSoundIcon();

    btnSoundToggle.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('gameMuted', isMuted);
        audio.updateVolume();
        updateSoundIcon();
        if (!isMuted) audio.play('click');
    });

    // Estado del Juego (Local Mirror)
    let gameState = {
        bag: [],
        vira: null,
        players: [],
        currentPlayerTurnIndex: 0,
        selectedPlayerIndex: null,
        history: [],
        gameStarted: false
    };

    /* =========================================
       SISTEMA DE EMOTES RÁPIDOS
       ========================================= */

    btnEmoteToggle.addEventListener('click', () => {
        audio.play('click');
        emotesPanel.classList.toggle('show');
    });

    // Cerrar panel al hacer clic en otra parte
    document.addEventListener('click', (e) => {
        if (!btnEmoteToggle.contains(e.target) && !emotesPanel.contains(e.target)) {
            emotesPanel.classList.remove('show');
        }
    });

    emoteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            audio.play('click');
            const emoji = btn.getAttribute('data-emoji');
            socket.emit('send_emote', { emoji: emoji });
            emotesPanel.classList.remove('show');
        });
    });

    socket.on('show_emote', (data) => {
        const playersContainer = document.getElementById('players-table-container');
        const playerElements = playersContainer.children;

        if (data.playerIndex >= 0 && data.playerIndex < playerElements.length) {
            const playerDiv = playerElements[data.playerIndex];

            // Crear la burbuja
            const bubble = document.createElement('div');
            bubble.className = 'emote-bubble';
            bubble.innerText = data.emoji;
            bubble.style.left = '50%';
            bubble.style.top = '0';

            playerDiv.appendChild(bubble);

            // Eliminar después de la animación (2 segundos)
            setTimeout(() => {
                if (bubble.parentElement) bubble.remove();
            }, 2000);
        }
    });

    const turnNotification = document.getElementById('turn-notification');
    let turnNotificationTimeout = null;

    function showTurnNotification() {
        if (turnNotificationTimeout) clearTimeout(turnNotificationTimeout);

        turnNotification.classList.add('show');

        turnNotificationTimeout = setTimeout(() => {
            turnNotification.classList.remove('show');
            turnNotificationTimeout = null;
        }, 3000);
    }

    /* =========================================
       SISTEMA DE REGLAS (GUÍA)
       ========================================= */

    function openRules() {
        audio.play('click');
        rulesModal.style.display = 'flex';
    }

    function closeRules() {
        audio.play('click');
        rulesModal.style.display = 'none';
    }

    btnShowRulesMain.addEventListener('click', openRules);
    btnShowRulesPause.addEventListener('click', openRules);
    btnCloseRules.addEventListener('click', closeRules);

    // Cerrar modal al hacer clic en el fondo
    rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) closeRules();
    });

    /* =========================================
       COMUNICACIÓN SOCKET (RECEPCIÓN)
       ========================================= */

    socket.on('connect', () => {
        myId = socket.id;
    });

    socket.on('lobby_update', (data) => {
        const players = data.players;
        renderLobby(players);

        // Verificar si soy admin
        const me = players.find(p => p.id === socket.id);
        if (me) {
            isAdmin = me.isAdmin;
            hasJoined = true;
            joinForm.style.display = 'none';
            if (isAdmin) {
                adminControls.style.display = 'block';
                btnStart.style.display = 'block';
            } else {
                adminControls.style.display = 'none';
                btnStart.style.display = 'none';
            }
        } else {
            hasJoined = false;
            joinForm.style.display = 'flex';
            adminControls.style.display = 'none';
            btnStart.style.display = 'none';
        }
    });

    socket.on('error_msg', (data) => {
        alert(data.message);
    });

    socket.on('state_update', (newState) => {
        const oldTurn = gameState.currentPlayerTurnIndex;
        gameState = { ...gameState, ...newState };

        if (gameState.gameStarted) {
            menuScreen.style.display = 'none';
            setupScreen.style.display = 'none';
            gameScreen.style.display = 'flex';

            resultsModal.style.display = 'none';
            pauseModal.style.display = 'none';

            // Alerta si es mi turno y acaba de cambiar
            if (gameState.currentPlayerTurnIndex === getMyPlayerIndex() && oldTurn !== gameState.currentPlayerTurnIndex) {
                audio.play('turn');
                showTurnNotification();
            }

            const currentViraEl = document.getElementById('current-vira');
            currentViraEl.innerText = gameState.vira;
            currentViraEl.classList.remove('empty');
            currentViraEl.classList.add('wooden-chip');

            renderGameBoard();
            if (gameState.selectedPlayerIndex !== null) {
                updateInventoryUI();
            }
        }
    });

    socket.on('game_log_event', (data) => {
        addLog(data.message, data.type);
    });

    socket.on('show_results', (data) => {
        renderResults(data.winner);
        audio.play('victory');

        // Control de visibilidad para siguiente ronda
        if (isAdmin) {
            btnNextRound.style.display = 'block';
            // Remover mensaje de espera si existe
            const waitMsg = resultsModal.querySelector('.admin-wait-msg');
            if (waitMsg) waitMsg.remove();
        } else {
            btnNextRound.style.display = 'none';
            // Mostrar mensaje de espera
            if (!resultsModal.querySelector('.admin-wait-msg')) {
                const msg = document.createElement('p');
                msg.className = 'admin-wait-msg';
                msg.innerText = 'Esperando al administrador para continuar...';
                msg.style.textAlign = 'center';
                msg.style.color = 'var(--secondary-color)';
                msg.style.marginTop = '1rem';
                btnNextRound.parentElement.appendChild(msg);
            }
        }

        resultsModal.style.display = 'flex';
    });

    socket.on('show_victory', (data) => {
        showVictoryUI(data.winner);
    });

    socket.on('game_over_force_lobby', () => {
        gameScreen.style.display = 'none';
        setupScreen.style.display = 'flex';
        gameLog.innerHTML = ''; // Limpiar registros antiguos
        renderGameBoard();
        gameState.gameStarted = false;
    });

    /* =========================================
       SISTEMA DE LOGS
       ========================================= */

    function addLog(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerText = message;
        gameLog.appendChild(entry);
        gameLog.scrollTop = gameLog.scrollHeight;
    }

    /* =========================================
       LOGICA LOBBY / SETUP
       ========================================= */

    btnJoin.addEventListener('click', () => {
        audio.play('click');
        const nickname = playerNicknameInput.value.trim();
        if (!nickname) {
            alert("Por favor, introduce un nickname.");
            return;
        }
        socket.emit('join_lobby', { nickname });
    });

    btnStart.addEventListener('click', () => {
        audio.play('click');
        socket.emit('request_start_game');
    });

    function renderLobby(players) {
        playersGrid.innerHTML = '';
        players.forEach(p => {
            const card = document.createElement('div');
            card.className = 'player-card';
            if (p.id === socket.id) card.style.borderColor = "var(--primary-color)";

            card.innerHTML = `
                <div class="player-icon">
                    <svg viewBox="0 0 100 120" width="100%" height="100%">
                        <circle cx="50" cy="40" r="20" fill="${p.isAdmin ? '#fbbf24' : '#203399'}" stroke="#000" stroke-width="4"/>
                        <path d="M 20 100 C 20 60, 80 60, 80 100 Z" fill="${p.isAdmin ? '#fbbf24' : '#203399'}" stroke="#000" stroke-width="4"/>
                    </svg>
                </div>
                <div class="player-input-mirror">${p.name} ${p.isAdmin ? '👑' : ''}</div>
            `;
            playersGrid.appendChild(card);
        });
    }

    /* =========================================
       LOGICA MENÚ PRINCIPAL
       ========================================= */

    btnPlay.addEventListener('click', () => {
        audio.play('click');
        menuScreen.style.display = 'none';
        setupScreen.style.display = 'flex';
    });

    btnExit.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas salir del juego?')) {
            window.close();
            document.body.innerHTML = '<h1>Has salido del juego</h1>';
        }
    });

    /* =========================================
       LOGICA SELECCIÓN JUGADORES
       ========================================= */

    btnBack.addEventListener('click', () => {
        audio.play('click');
        socket.emit('leave_lobby');
        isAdmin = false;
        hasJoined = false;
        setupScreen.style.display = 'none';
        menuScreen.style.display = 'block';
    });

    /* =========================================
       LOGICA DEL TABLERO Y RENDERING
       ========================================= */

    function renderGameBoard() {
        const roundTable = document.getElementById('round-table');
        const playersContainer = document.getElementById('players-table-container');
        playersContainer.innerHTML = '';

        const oldDivisions = roundTable.querySelector('.table-divisions');
        if (oldDivisions) oldDivisions.remove();

        const numPlayers = gameState.players.length;
        if (numPlayers === 0) return;

        const center = 140;
        const radius = 140;

        let svgLines = `<svg class="table-divisions" viewBox="0 0 280 280">`;
        for (let i = 0; i < numPlayers; i++) {
            let angle = (i * (360 / numPlayers) - 90) * (Math.PI / 180);
            let angleOffset = (360 / numPlayers / 2) * (Math.PI / 180);
            let divAngle = angle + angleOffset;
            let x2 = center + radius * Math.cos(divAngle);
            let y2 = center + radius * Math.sin(divAngle);
            let x1 = center + 30 * Math.cos(divAngle);
            let y1 = center + 30 * Math.sin(divAngle);
            svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
        }
        svgLines += `</svg>`;
        roundTable.insertAdjacentHTML('afterbegin', svgLines);

        const containerCenter = 230;
        const playerRadius = 180;

        gameState.players.forEach((player, i) => {
            let angle = (i * (360 / numPlayers) - 90) * (Math.PI / 180);
            let x = containerCenter + playerRadius * Math.cos(angle);
            let y = containerCenter + playerRadius * Math.sin(angle);

            const div = document.createElement('div');
            div.className = 'table-player';

            const isMe = (player.id === socket.id);
            const isTurn = (gameState.currentPlayerTurnIndex === i);

            if (isTurn) div.classList.add('turn-active');
            if (isMe) div.classList.add('is-me');

            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.style.transform = 'translate(-50%, -50%)';

            // Solo permitir abrir mi propio inventario
            div.style.cursor = isMe ? 'pointer' : 'default';

            div.innerHTML = `
                ${player.roundsWon >= 7 ? '<div class="table-crown">👑</div>' : ''}
                <div class="player-icon">
                    <svg viewBox="0 0 100 120" width="100%" height="100%">
                        <circle cx="50" cy="40" r="20" fill="${isMe ? 'var(--primary-color)' : '#203399'}" stroke="#000" stroke-width="4"/>
                        <path d="M 20 100 C 20 60, 80 60, 80 100 Z" fill="${isMe ? 'var(--primary-color)' : '#203399'}" stroke="#000" stroke-width="4"/>
                    </svg>
                </div>
                <div class="player-name">${player.name} (${player.roundsWon}) ${isMe ? '(Tú)' : ''}</div>
                <div class="player-chip-count">${player.chips.length} fichas</div>
            `;

            if (isMe) {
                div.addEventListener('click', () => openInventory(i));
            }
            playersContainer.appendChild(div);
        });
    }

    function getMyPlayerIndex() {
        return gameState.players.findIndex(p => p.id === socket.id);
    }

    function openInventory(index) {
        gameState.selectedPlayerIndex = index;
        const player = gameState.players[index];
        modalPlayerName.innerText = player.name;
        updateInventoryUI();
        inventoryModal.style.display = 'flex';
    }

    function updateInventoryUI() {
        const player = gameState.players[gameState.selectedPlayerIndex];
        if (!player) return;

        playerChipsContainer.innerHTML = '';
        let sum = 0;
        let hasHidden = false;

        player.chips.forEach(chip => {
            const chipEl = document.createElement('div');
            if (chip === -1) {
                chipEl.className = 'wooden-chip hidden-value';
                chipEl.innerText = '?';
                hasHidden = true;
            } else {
                sum += chip;
                chipEl.className = 'wooden-chip';
                chipEl.innerText = chip;
            }
            playerChipsContainer.appendChild(chipEl);
        });

        currentSumDisplay.innerText = hasHidden ? '??' : sum;
        sumWithViraDisplay.innerText = hasHidden ? '??' : (sum + gameState.vira);
        roundsWonDisplay.innerText = player.roundsWon;

        const isMe = (player.id === socket.id);
        const isMyTurn = (gameState.currentPlayerTurnIndex === gameState.selectedPlayerIndex) && isMe;
        const actionsBar = document.getElementById('inventory-actions-bar');

        if (isMyTurn) {
            actionsBar.style.opacity = '1';
            actionsBar.style.pointerEvents = 'auto';
            actionMessage.innerText = "¡Es tu turno! Elige una acción.";
            actionMessage.style.borderColor = "var(--primary-color)";
        } else {
            actionsBar.style.opacity = '0.5';
            actionsBar.style.pointerEvents = 'none';
            actionMessage.innerText = "Esperando tu turno...";
            actionMessage.style.borderColor = "var(--secondary-color)";
        }
    }

    /* =========================================
       EVENTOS DE INVENTARIO (ENVÍO)
       ========================================= */

    btnCloseInventory.addEventListener('click', () => {
        audio.play('click');
        inventoryModal.style.display = 'none';
        gameState.selectedPlayerIndex = null;
    });

    btnDraw.addEventListener('click', () => {
        audio.play('draw');
        socket.emit('draw_chip', { playerIndex: gameState.selectedPlayerIndex });
    });

    btnStay.addEventListener('click', () => {
        audio.play('click');
        inventoryModal.style.display = 'none';
        socket.emit('stay_action', { playerIndex: gameState.selectedPlayerIndex });
    });

    btnFold.addEventListener('click', () => {
        audio.play('click');
        const player = gameState.players[gameState.selectedPlayerIndex];
        if (player.chips.length === 0) {
            alert('¡No puedes retirarte sin tener al menos una ficha!');
            return;
        }
        inventoryModal.style.display = 'none';
        socket.emit('fold_action', { playerIndex: gameState.selectedPlayerIndex });
    });

    btnSiglo.addEventListener('click', () => {
        audio.play('siglo');
        inventoryModal.style.display = 'none';
        socket.emit('siglo_action', { playerIndex: gameState.selectedPlayerIndex });
    });

    /* =========================================
       RESULTADOS Y SIGUIENTE RONDA
       ========================================= */

    function renderResults(roundWinner) {
        resultsBody.innerHTML = '';
        gameState.players.forEach(p => {
            const sum1 = p.chips.reduce((a, b) => a + b, 0);
            const sum2 = sum1 + gameState.vira;
            const bestSum = (sum2 <= 100) ? Math.max(sum1, sum2) : sum1;

            const isWinner = (roundWinner && p.name === roundWinner.name);
            const isEliminated = (p.status === 'folded' || p.status === 'folded_auto');

            let statusText = "FUERA DE RANGO";
            if (isWinner) statusText = "GANADOR Round";
            else if (isEliminated) statusText = "ELIMINADO";
            else if (p.status === 'stay') statusText = "RANGO 90-98";

            const card = document.createElement('div');
            card.className = `result-card ${isWinner ? 'winner' : ''} ${isEliminated ? 'eliminated' : ''}`;
            card.innerHTML = `
                <div class="player-name">${p.name}</div>
                <div class="final-sum">${isEliminated && p.status === 'folded' ? '---' : bestSum}</div>
                <div class="status-label">${statusText}</div>
            `;
            resultsBody.appendChild(card);
        });
    }

    btnNextRound.addEventListener('click', () => {
        audio.play('click');
        resultsModal.style.display = 'none';
        socket.emit('next_round');
    });

    /* =========================================
       LOGICA DE VICTORIA
       ========================================= */

    function showVictoryUI(winner) {
        winnerNameDisplay.innerText = winner.name;
        victoryModal.style.display = 'flex';
        btnPause.style.display = 'none';
        btnBackToVictory.style.display = 'flex';
        startConfetti();
    }

    function startConfetti() {
        confettiContainer.innerHTML = '';
        const colors = ['#fbbf24', '#f59e0b', '#00ffcc', '#ff3366', '#ffffff'];
        for (let i = 0; i < 150; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const size = Math.random() * 10 + 5;
            const duration = Math.random() * 3 + 2;
            const delay = Math.random() * 2;
            confetti.style.backgroundColor = color;
            confetti.style.left = `${left}%`;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.borderRadius = (Math.random() > 0.5) ? '50%' : '2px';
            confetti.style.animationDuration = `${duration}s`;
            confetti.style.animationDelay = `${delay}s`;
            confettiContainer.appendChild(confetti);
        }
        setTimeout(() => confettiContainer.innerHTML = '', 8000);
    }

    btnVictoryNewGame.addEventListener('click', () => {
        victoryModal.style.display = 'none';
        btnPause.style.display = 'flex';
        btnBackToVictory.style.display = 'none';
        socket.emit('restart_game');
    });

    btnVictoryMenu.addEventListener('click', () => {
        location.reload(); // Hard reset for menu
    });

    btnVictoryClose.addEventListener('click', () => {
        victoryModal.style.display = 'none';
    });

    btnBackToVictory.addEventListener('click', () => {
        victoryModal.style.display = 'flex';
    });


    /* =========================================
       LOGICA DE PAUSA
       ========================================= */

    btnPause.addEventListener('click', () => {
        // Ajustar visibilidad de botones según rol
        if (isAdmin) {
            btnRestartRound.style.display = 'block';
            btnRestartGame.style.display = 'block';
        } else {
            btnRestartRound.style.display = 'none';
            btnRestartGame.style.display = 'none';
        }
        pauseModal.style.display = 'flex';
    });

    btnResume.addEventListener('click', () => {
        audio.play('click');
        pauseModal.style.display = 'none';
    });

    btnRestartRound.addEventListener('click', () => {
        if (confirm('¿Reiniciar la ronda actual? Se mantendrán las puntuaciones.')) {
            pauseModal.style.display = 'none';
            socket.emit('restart_round');
        }
    });

    btnRestartGame.addEventListener('click', () => {
        if (confirm('¿Reiniciar toda la partida? Las puntuaciones volverán a cero.')) {
            pauseModal.style.display = 'none';
            socket.emit('restart_game');
        }
    });

    btnMainMenu.addEventListener('click', () => {
        if (confirm('¿Volver al menú principal? Se perderá el progreso de la partida.')) {
            location.reload();
        }
    });

    /* =========================================
       LOGICA DE HISTORIAL
       ========================================= */

    btnHistory.addEventListener('click', () => {
        renderHistory();
        historyModal.style.display = 'flex';
    });

    btnCloseHistory.addEventListener('click', () => {
        audio.play('click');
        historyModal.style.display = 'none';
    });

    function renderHistory() {
        historyTableBody.innerHTML = '';
        if (gameState.history.length === 0) {
            emptyHistoryMsg.style.display = 'block';
            return;
        }
        emptyHistoryMsg.style.display = 'none';
        gameState.history.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${entry.round}</td>
                <td><strong>${entry.winner}</strong></td>
                <td><span class="method-label ${entry.method === 'Siglo' ? 'method-siglo' : ''}">${entry.method}</span></td>
                <td><strong>${entry.sum}</strong></td>
            `;
            historyTableBody.appendChild(row);
        });
    }

    function saveCurrentNames() {
        const inputs = playersGrid.querySelectorAll('.player-input');
        inputs.forEach((input, index) => {
            if (index < playerNames.length) playerNames[index] = input.value;
        });
    }

    function renderPlayers() {
        playersGrid.innerHTML = '';
        for (let i = 0; i < playerCount; i++) {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.innerHTML = `
                <div class="player-icon">
                    <svg viewBox="0 0 100 120" width="100%" height="100%"><circle cx="50" cy="40" r="20" fill="#203399" stroke="#000" stroke-width="4"/><path d="M 20 100 C 20 60, 80 60, 80 100 Z" fill="#203399" stroke="#000" stroke-width="4"/></svg>
                </div>
                <input type="text" class="player-input" value="${playerNames[i]}" placeholder="Player ${i + 1}" maxlength="10">
            `;
            playersGrid.appendChild(card);
        }
    }
});

