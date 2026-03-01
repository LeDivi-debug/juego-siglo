const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(__dirname));

// Estado global del servidor
let lobbyPlayers = []; // { id, name, isAdmin }
let gameState = {
    bag: [],
    vira: null,
    players: [],
    currentPlayerTurnIndex: 0,
    history: [],
    gameStarted: false
};

function initializeGame(playersData) {
    gameState.bag = Array.from({ length: 90 }, (_, i) => i + 1);
    gameState.players = playersData.map(p => ({
        id: p.id,
        name: p.name,
        chips: [],
        roundsWon: 0,
        status: 'waiting'
    }));

    gameState.currentPlayerTurnIndex = 0;
    gameState.players[0].status = 'active';

    const viraIndex = Math.floor(Math.random() * gameState.bag.length);
    gameState.vira = gameState.bag.splice(viraIndex, 1)[0];
    gameState.gameStarted = true;
}

/**
 * Envía una versión filtrada del estado del juego a cada cliente.
 * Los jugadores solo ven sus propias fichas. De los demás solo ven la cantidad.
 */
function broadcastGameState() {
    const sockets = io.sockets.sockets;
    sockets.forEach((socket) => {
        const filteredState = {
            ...gameState,
            players: gameState.players.map(p => {
                if (p.id === socket.id) return p; // Ver mis propias fichas
                return {
                    ...p,
                    chips: p.chips.map(() => -1) // -1 indica que hay una ficha pero su valor es oculto
                };
            })
        };
        socket.emit('state_update', filteredState);
    });
}

function validateAction(socket, playerIndex) {
    if (!gameState.gameStarted) return false;
    if (gameState.currentPlayerTurnIndex !== playerIndex) return false;
    const player = gameState.players[playerIndex];
    return player && player.id === socket.id;
}

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Al conectar, enviamos el estado de la sala o del juego
    socket.emit('lobby_update', { players: lobbyPlayers });
    if (gameState.gameStarted) {
        // Enviar estado filtrado al reconectar
        broadcastGameState();
    }

    socket.on('join_lobby', (data) => {
        if (gameState.gameStarted) {
            socket.emit('error_msg', { message: 'La partida ya ha comenzado.' });
            return;
        }

        // Evitar que un jugador se una dos veces
        if (lobbyPlayers.some(p => p.id === socket.id)) {
            socket.emit('error_msg', { message: 'Ya estás en la sala.' });
            return;
        }

        const isAdmin = lobbyPlayers.length === 0;
        lobbyPlayers.push({
            id: socket.id,
            name: data.nickname,
            isAdmin: isAdmin
        });

        io.emit('lobby_update', { players: lobbyPlayers });
    });

    socket.on('request_start_game', () => {
        const player = lobbyPlayers.find(p => p.id === socket.id);
        if (!player || !player.isAdmin) {
            socket.emit('error_msg', { message: 'Solo el administrador puede iniciar la partida.' });
            return;
        }

        if (lobbyPlayers.length < 2) {
            socket.emit('error_msg', { message: 'Se necesitan al menos 2 jugadores para iniciar la partida.' });
            return;
        }

        initializeGame(lobbyPlayers);
        broadcastGameState();
        io.emit('game_log_event', { message: `Partida iniciada por el administrador. Vira: ${gameState.vira}`, type: 'system' });
        io.emit('game_log_event', { message: `Es el turno de ${gameState.players[0].name}.`, type: 'info' });
    });

    function handleLeave() {
        // 1. Manejar Lobby
        const lobbyIndex = lobbyPlayers.findIndex(p => p.id === socket.id);
        if (lobbyIndex !== -1) {
            const wasAdmin = lobbyPlayers[lobbyIndex].isAdmin;
            lobbyPlayers.splice(lobbyIndex, 1);
            if (wasAdmin && lobbyPlayers.length > 0) {
                lobbyPlayers[0].isAdmin = true;
            }
            io.emit('lobby_update', { players: lobbyPlayers });
        }

        // 2. Manejar Partida Activa
        if (gameState.gameStarted) {
            const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const playerName = gameState.players[playerIndex].name;
                io.emit('game_log_event', { message: `${playerName} ha abandonado la partida.`, type: 'danger' });

                const isHisTurn = (gameState.currentPlayerTurnIndex === playerIndex);
                gameState.players.splice(playerIndex, 1);

                // Si quedan menos de 2 jugadores, terminar la partida forzosamente
                if (gameState.players.length < 2) {
                    io.emit('game_log_event', { message: "No hay suficientes jugadores para continuar. Volviendo a la sala.", type: 'system' });
                    gameState.gameStarted = false;
                    gameState.history = []; // Resetear historial para la nueva sala
                    io.emit('game_over_force_lobby'); // Forzar a los clientes fuera de la pantalla de juego
                    return;
                }

                // Si era su turno o estaba antes del turno actual, reajustar índice
                // Si el jugador removido estaba ANTES del turno actual, el índice debe bajar
                // Si era SU turno, el índice se mantiene (apuntando al siguiente) a menos que fuera el último
                if (gameState.currentPlayerTurnIndex > playerIndex) {
                    gameState.currentPlayerTurnIndex--;
                } else if (isHisTurn) {
                    // Si era el último jugador de la lista
                    if (gameState.currentPlayerTurnIndex >= gameState.players.length) {
                        checkRoundEnd();
                    } else {
                        // Pasar turno al siguiente jugador (que ahora ocupa el mismo índice)
                        gameState.players[gameState.currentPlayerTurnIndex].status = 'active';
                        io.emit('game_log_event', { message: `Turno de ${gameState.players[gameState.currentPlayerTurnIndex].name}.`, type: 'info' });
                    }
                }
                broadcastGameState();
            }
        }
    }

    socket.on('leave_lobby', () => {
        handleLeave();
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        handleLeave();
    });

    // --- ACCIONES DE JUEGO (Mismo flujo anterior pero referenciando a gameState actualizado) ---

    socket.on('draw_chip', (data) => {
        if (!validateAction(socket, data.playerIndex)) return;
        const player = gameState.players[data.playerIndex];
        if (player.chips.length >= 13 || gameState.bag.length === 0) return;

        const bagIndex = Math.floor(Math.random() * gameState.bag.length);
        const chip = gameState.bag.splice(bagIndex, 1)[0];
        player.chips.push(chip);

        broadcastGameState();
        io.emit('game_log_event', { message: `${player.name} ha pedido una ficha.`, type: 'info' });
    });

    socket.on('stay_action', (data) => {
        if (!validateAction(socket, data.playerIndex)) return;
        const player = gameState.players[data.playerIndex];
        player.status = 'stay';
        io.emit('game_log_event', { message: `${player.name} ha decidido quedarse.`, type: 'success' });
        handleEndTurn();
    });

    socket.on('fold_action', (data) => {
        if (!validateAction(socket, data.playerIndex)) return;
        const player = gameState.players[data.playerIndex];
        player.status = 'folded';
        gameState.bag.push(...player.chips);
        player.chips = [];
        io.emit('game_log_event', { message: `${player.name} se ha retirado de la ronda.`, type: 'danger' });
        handleEndTurn();
    });

    socket.on('siglo_action', (data) => {
        if (!validateAction(socket, data.playerIndex)) return;
        const player = gameState.players[data.playerIndex];

        const sum1 = player.chips.reduce((a, b) => a + b, 0);
        const sum2 = sum1 + gameState.vira;

        if (sum1 === 99 || sum1 === 100 || sum2 === 99 || sum2 === 100) {
            player.status = 'siglo';
            player.roundsWon++;
            recordHistoryEntry(player, 'Siglo');
            io.emit('state_update', gameState); // Revelar para el modal de resultados
            io.emit('game_log_event', { message: `¡SIGLO! ${player.name} gana la ronda con suma ${sum1 === 99 || sum1 === 100 ? sum1 : sum2}.`, type: 'success' });
            io.emit('show_results', { winner: player });
        } else {
            player.status = 'folded';
            gameState.bag.push(...player.chips);
            player.chips = [];
            io.emit('game_log_event', { message: `${player.name} declaró Siglo incorrectamente.`, type: 'danger' });
            handleEndTurn();
        }
    });

    socket.on('next_round', () => {
        const player = lobbyPlayers.find(p => p.id === socket.id);
        if (!player || !player.isAdmin) {
            socket.emit('error_msg', { message: 'Solo el administrador puede avanzar a la siguiente ronda.' });
            return;
        }

        const overallWinner = gameState.players.find(p => p.roundsWon >= 7);
        if (overallWinner) {
            io.emit('show_victory', { winner: overallWinner });
        } else {
            resetRound();
        }
    });

    socket.on('send_emote', (data) => {
        if (!gameState.gameStarted) return;
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            io.emit('show_emote', { playerIndex: playerIndex, emoji: data.emoji });
        }
    });

    socket.on('restart_round', () => {
        const player = lobbyPlayers.find(p => p.id === socket.id);
        if (!player || !player.isAdmin) {
            socket.emit('error_msg', { message: 'Solo el administrador puede reiniciar la ronda.' });
            return;
        }
        resetRound();
        io.emit('game_log_event', { message: "Ronda reiniciada por el administrador.", type: "system" });
    });

    socket.on('restart_game', () => {
        const player = lobbyPlayers.find(p => p.id === socket.id);
        if (!player || !player.isAdmin) {
            socket.emit('error_msg', { message: 'Solo el administrador puede reiniciar la partida.' });
            return;
        }
        const names = gameState.players.map(p => p.name);
        gameState.history = [];
        initializeGame(lobbyPlayers);
        broadcastGameState();
        io.emit('game_log_event', { message: "Partida reiniciada por el administrador.", type: "system" });
    });


    function handleEndTurn() {
        gameState.currentPlayerTurnIndex++;
        if (gameState.currentPlayerTurnIndex >= gameState.players.length) {
            checkRoundEnd();
        } else {
            gameState.players[gameState.currentPlayerTurnIndex].status = 'active';
            broadcastGameState();
            io.emit('game_log_event', { message: `Turno de ${gameState.players[gameState.currentPlayerTurnIndex].name}.`, type: 'info' });
        }
    }

    function checkRoundEnd() {
        const allPlayers = gameState.players;
        let stays = allPlayers.filter(p => p.status === 'stay');

        stays.forEach(p => {
            const s1 = p.chips.reduce((a, b) => a + b, 0);
            const s2 = s1 + gameState.vira;
            const bestSum = (s2 <= 100) ? Math.max(s1, s2) : s1;

            if (bestSum === 99 || bestSum === 100) {
                io.emit('game_log_event', { message: `${p.name} eliminado por no declarar Siglo con ${bestSum}.`, type: 'danger' });
                p.status = 'folded_auto';
            }
        });

        const survivors = allPlayers.filter(p => {
            if (p.status !== 'stay') return false;
            const s1 = p.chips.reduce((a, b) => a + b, 0);
            const s2 = s1 + gameState.vira;
            const bestSum = (s2 <= 100) ? Math.max(s1, s2) : s1;
            return (bestSum >= 90 && bestSum <= 98);
        });

        let winner = null;
        if (survivors.length > 0) {
            winner = survivors[0];
            let bestDiff = 100;

            survivors.forEach(p => {
                const s1 = p.chips.reduce((a, b) => a + b, 0);
                const s2 = s1 + gameState.vira;
                const bestSum = (s2 <= 100) ? Math.max(s1, s2) : s1;
                const diff = 100 - bestSum;
                if (diff < bestDiff) {
                    bestDiff = diff;
                    winner = p;
                }
            });
            winner.roundsWon++;
            io.emit('game_log_event', { message: `Ganador: ${winner.name} por cercanía al 100.`, type: 'success' });
        } else {
            io.emit('game_log_event', { message: "Ronda finalizada sin ganadores válidos (fuera de rango 90-98).", type: 'system' });
        }

        recordHistoryEntry(winner, winner ? 'Cercanía' : 'Sin Ganador');
        // Revelar todas las fichas al final de la ronda para el modal de resultados
        io.emit('state_update', gameState);
        io.emit('show_results', { winner: winner });
    }

    function recordHistoryEntry(roundWinner, method) {
        let sum = 0;
        let winnerName = "Nadie";

        if (roundWinner) {
            winnerName = roundWinner.name;
            const s1 = roundWinner.chips.reduce((a, b) => a + b, 0);
            const s2 = s1 + gameState.vira;
            sum = (s2 <= 100) ? Math.max(s1, s2) : s1;
        }

        gameState.history.push({
            round: gameState.history.length + 1,
            winner: winnerName,
            method: method,
            sum: sum
        });
    }

    function resetRound() {
        const wins = gameState.players.map(p => p.roundsWon);
        initializeGame(lobbyPlayers);
        gameState.players.forEach((p, i) => p.roundsWon = wins[i]);
        broadcastGameState();
        io.emit('game_log_event', { message: "Iniciando siguiente ronda...", type: 'system' });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Juego Siglo corriendo en http://localhost:${PORT}`);
});
