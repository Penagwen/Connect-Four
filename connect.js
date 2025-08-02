const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game constants
let COLS = 7;
let ROWS = 6;
let CELL_WIDTH = (canvas.width - 200) / COLS;
let CELL_HEIGHT = canvas.height / 7;
let GRID_WIDTH = CELL_WIDTH * COLS;
let GRID_HEIGHT = CELL_HEIGHT * ROWS;
let GRID_X = canvas.width / 2 - GRID_WIDTH / 2;
let GRID_Y = canvas.height / 2 - GRID_HEIGHT / 2;
let EMPTY = 0;


let noonePlay = false;
let playerColor = 1;
let aiColor = 2;
let turn = 1;
let endgame = false;
let hoverColumn = null;

let fallingDiscs = [];
let winningLine = null;


class Board {
    constructor() {
        this.grid = Array.from({ length: COLS }, () => Array(ROWS).fill(0));
        this.winningDiscs = [];

        this.nextPlace = Array(COLS).fill(ROWS - 1);
    }

    draw() {
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                const value = this.grid[x][y];
                this.drawDisc(x, y, value);
            }
        }
    }

    drawDisc(x, y, value) {
        c.save();
        const px = GRID_X + x * CELL_WIDTH + CELL_WIDTH / 2;
        const py = GRID_Y + y * CELL_HEIGHT + CELL_HEIGHT / 2;
        const radius = Math.min(CELL_WIDTH, CELL_HEIGHT) / 2 - 5;

        // Shadow and style
        c.shadowColor = "rgba(0, 0, 0, 0.4)";
        c.shadowBlur = 10;

        if (value === 1) c.fillStyle = "#00ffff";
        else if (value === 2) c.fillStyle = "#ff0000";
        else {
            c.fillStyle = "#444";
        }

        c.beginPath();
        c.arc(px, py, radius, 0, Math.PI * 2);
        c.fill();
        c.closePath();

        // Reset shadow
        c.shadowBlur = 0;
        c.restore();
    }

    placeDisc(x, player) {
        if (endgame || x < 0 || x >= COLS) return false;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (this.grid[x][y] === 0) {
                this.grid[x][y] = player;
                return true;
            }
        }
        return false;
    }

    dropDiscAnimated(x, player) {
        if (endgame) return;

        this.nextPlace[x] --;

        noonePlay = true;

        for (let y = ROWS - 1; y >= 0; y--) {
            if (board.grid[x][y] === 0) {
                const startY = -CELL_HEIGHT;
                const endY = GRID_Y + y * CELL_HEIGHT + CELL_HEIGHT / 2;
                const disc = {
                    x,
                    y,
                    px: GRID_X + x * CELL_WIDTH + CELL_WIDTH / 2,
                    py: startY,
                    player,
                    radius: Math.min(CELL_WIDTH, CELL_HEIGHT) / 2 - 5,
                    done: false
                };

                fallingDiscs.push(disc);

                gsap.to(disc, {
                    py: endY,
                    duration: 0.5,
                    ease: "bounce.out",
                    onComplete: () => {
                        board.grid[x][y] = player;
                        disc.done = true;
                        noonePlay = false;


                        if (player === playerColor) {
                            checkEndgame();
                            if (!endgame) {
                                turn = aiColor;
                                setTimeout(() => dropAIMove(), 500);
                            }
                        } else {
                            checkEndgame();
                            turn = playerColor;
                        }
                    }
                });

                return true;
            }
        }
        return false;
    }


    checkWinner(store = true) {
        const grid = this.grid;
        const directions = [
            { dx: 1, dy: 0 }, { dx: 0, dy: 1 },
            { dx: 1, dy: 1 }, { dx: 1, dy: -1 }
        ];

        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                const color = grid[x][y];
                if (color === 0) continue;
                for (let { dx, dy } of directions) {
                    let streak = [];
                    for (let i = 0; i < 4; i++) {
                        const nx = x + i * dx;
                        const ny = y + i * dy;
                        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;
                        if (grid[nx][ny] !== color) break;
                        streak.push({ x: nx, y: ny });
                    }
                    if (streak.length === 4) {
                        if (store) this.winningDiscs = streak;
                        return color;
                    }
                }
            }
        }
        return 0;
    }

    checkWinningPieces(){
        const grid = this.grid;
        const directions = [
            { dx: 1, dy: 0 }, { dx: 0, dy: 1 },
            { dx: 1, dy: 1 }, { dx: 1, dy: -1 }
        ];

        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                const color = grid[x][y];
                if (color === 0) continue;
                for (let { dx, dy } of directions) {
                    let streak = [];
                    for (let i = 0; i < 4; i++) {
                        const nx = x + i * dx;
                        const ny = y + i * dy;
                        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;
                        if (grid[nx][ny] !== color) break;
                        streak.push({ x: nx, y: ny });
                    }
                    if (streak.length === 4) {
                        return streak;
                    }
                }
            }
        }
        return 0;
    }

    isFull() {
        return this.grid.every(col => col.every(cell => cell !== 0));
    }
}

class Bot {
    constructor(color, depth){
        this.color = color;
        this.depth = depth;


        this.evalTable = [
            [3, 4, 5, 7, 5, 4, 3], 
            [4, 6, 8, 10, 8, 6, 4], 
            [5, 8, 11, 13, 11, 8, 5], 
            [5, 8, 11, 13, 11, 8, 5], 
            [4, 6, 8, 10, 8, 6, 4], 
            [3, 4, 5, 7, 5, 4, 3]
        ];

        this.saveTable = [];
    }

    genMoves(color){
        let moves = []; // the row which the coin can be dropped
        for(let x = 0; x < COLS; x++){
            let y = board.nextPlace[x];
            if(y >= 0){
                moves.push(new Move({ x: x, y: y, color: color }));
            }
        }
        return moves;
    }

    makeBestMove() {
        if (endgame) return;


        // this.saveTable = [];


        let moves = this.genMoves(this.color);
        moves.forEach((move, i) => {
            this.makeMove(move);
            moves[i] = [move, this.search(this.depth - 1, oppositeColor(this.color), -Infinity, Infinity)];
            this.undoMove(move);
        });


        moves.sort((a, b) => b[1] - a[1]);


        const bestMove = moves[0][0];
        
        // Drop the best move using animation
        board.dropDiscAnimated(bestMove.x, this.color);
    }



    search(depth, color, alpha, beta){

        // check if somone has won if so return the appropriate value
        let win = board.checkWinner();
        if(win == this.color){ return 1000 + (depth); }
        if(win == oppositeColor(this.color)){ return -1000 + (this.depth - depth); }

        // when we reach the end of the search return
        if(depth == 0){ return this.getBoardValue(color); }

        // store all the values from the moves
        let moveValues = [];
        // gen every move for the color
        let moves = this.genMoves(color);
        
        for(let i = 0; i < moves.length; i++){
            let move = moves[i];
            // play the move
            this.makeMove(move);
            // call the search on the current move with one less depth and on the opposite color
            // push the value and move to the moveValues array
            let value;

            // for(let i = 0; i < this.saveTable.length; i++){
            //     if(this.saveTable[i].board == board.grid){
            //         val = this.saveTable[i].val;
            //         break;
            //     }
            // }

            if(value == undefined){
                value = this.search(depth - 1, oppositeColor(color), alpha, beta) + Math.random() / 100;
                //this.saveTable.push({board:board.grid.slice(), val:value});
            }
            
            moveValues.push(value);

            // set alpha and beta
            if(this.color == color){
                // max
                alpha = Math.max(...moveValues);
            }else{
                // min
                beta = Math.min(...moveValues);
            }

            // undo the move
            this.undoMove(move);

            // pruning
            if(beta <= alpha){
                // prune
                break;
            }
        }
        

        /// sort the moves based on the values
        // alert(moveValues +" "+ ((color == RED) ? "RED" : "YELLOW"));
        return (color == this.color) ? Math.max(...moveValues) : Math.min(...moveValues);
    }

    getBoardValue(){
        let total = 0;
        board.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if(cell == this.color){
                    total += this.evalTable[x][y];
                }else if(cell == oppositeColor(this.color)){
                    total -= this.evalTable[x][y];
                }
            });
        });
        return total; 
    }

    makeMove(move){
        board.grid[move.x][move.y] = move.color;
        board.nextPlace[move.x] --;
    }

    undoMove(move){
        board.grid[move.x][move.y] = EMPTY;
        board.nextPlace[move.x] ++;
    }
}

class Move{
    constructor({x, y, color}){
        this.x = x;
        this.y = y;
        this.color = color;
    }
}

const board = new Board();
const bot = new Bot(aiColor, 5);

// --- Drawing Functions ---
function drawBackground() {
    const gradient = c.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f2027");
    gradient.addColorStop(1, "#203a43");
    c.fillStyle = gradient;
    c.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTurnIndicator() {
    c.font = "28px sans-serif";
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    const text = endgame
        ? "Game Over"
        : (turn === playerColor ? "Your Turn" : "AI Thinking...");
    c.fillText(text, canvas.width / 2, 40);
}

function drawColumnHighlight(col) {
    if (col < 0 || col >= COLS) return;
    c.fillStyle = "rgba(255, 255, 255, 0.1)";
    c.fillRect(GRID_X + col * CELL_WIDTH, GRID_Y, CELL_WIDTH, GRID_HEIGHT);
}

function drawEndgameMessage(winner) {
    const msg = winner === playerColor ? "You Win!" :
                winner === aiColor ? "You Lose!" : "Draw!";
    c.fillStyle = "rgba(0, 0, 0, 0.7)";
    c.fillRect(0, 0, canvas.width, canvas.height);

    c.fillStyle = "#fff";
    c.font = "bold 48px sans-serif";
    c.textAlign = "center";
    c.fillText(msg, canvas.width / 2, canvas.height / 2);
}

function checkEndgame(){
    const winner = board.checkWinner();
    if(winner !== 0) {
        endgame = true;
    }else if(board.isFull()) {
        endgame = true;
    }

}

function oppositeColor(color) {
    if(color == playerColor){
        return aiColor;
    }else if(color == aiColor){
        return playerColor;
    }
}

function updateScreen() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    CELL_WIDTH = (canvas.width - 200) / COLS;
    CELL_HEIGHT = canvas.height / 7;
    GRID_WIDTH = CELL_WIDTH * COLS;
    GRID_HEIGHT = CELL_HEIGHT * ROWS;
    GRID_X = canvas.width / 2 - GRID_WIDTH / 2;
    GRID_Y = canvas.height / 2 - GRID_HEIGHT / 2;

    drawBackground();
    board.draw();

    for (const disc of fallingDiscs) {
        if (!disc.done) {
            c.shadowColor = "rgba(0, 0, 0, 0.3)";
            c.shadowBlur = 10;
            c.fillStyle = disc.player === 1 ? "#00ffff" : "#ff0000";

            c.beginPath();
            c.arc(disc.px, disc.py, disc.radius, 0, Math.PI * 2);
            c.fill();
            c.closePath();

            c.shadowBlur = 0;
        }
    }

    if(endgame && winningLine){
        const startX = winningLine.x1;
        const startY = winningLine.y1;
        const endX = winningLine.x2;
        const endY = winningLine.y2;

        c.save();
        c.strokeStyle = "white";
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(startX, startY);
        c.lineTo(endX, endY);
        c.stroke();
        c.strokeStyle = "rgba(0, 0, 0, 0)";
        c.restore();
    }   



    if (hoverColumn !== null && !endgame) drawColumnHighlight(hoverColumn);
    drawTurnIndicator();
    if (endgame) drawEndgameMessage(board.checkWinner(false));
}

function checkEndgame() {
    const winner = board.checkWinner();
    if (winner !== 0 || board.isFull()) {
        endgame = true;
    }

    if(endgame){
        const pieces = board.checkWinningPieces();
        winningLine = {
            x1: pieces[0].x * CELL_WIDTH + CELL_WIDTH + (Math.min(CELL_WIDTH, CELL_HEIGHT) / 2 - 5)/2,
            y1: pieces[0].y * CELL_HEIGHT + CELL_HEIGHT,
            x2: pieces[0].x * CELL_WIDTH + CELL_WIDTH + (Math.min(CELL_WIDTH, CELL_HEIGHT) / 2 - 5)/2,
            y2: pieces[0].y * CELL_HEIGHT + CELL_HEIGHT,
        }
        gsap.to(winningLine, {
            x2: pieces[3].x * CELL_WIDTH + CELL_WIDTH + (Math.min(CELL_WIDTH, CELL_HEIGHT) / 2 - 5)/2,
            y2: pieces[3].y * CELL_HEIGHT + CELL_HEIGHT,
            duration: 1,
        });
    }
}

// --- AI Logic (Very Basic Random AI) ---
function dropAIMove() {
    // const available = [];
    // for (let x = 0; x < COLS; x++) {
    //     if (board.grid[x][0] === 0) available.push(x);
    // }

    // if (available.length > 0) {
    //     const choice = available[Math.floor(Math.random() * available.length)];
    //     board.dropDiscAnimated(choice, aiColor);
    // }
    if(noonePlay) return;

    bot.makeBestMove();
}


// --- Input ---
canvas.addEventListener("click", (e) => {
    if (endgame || turn !== playerColor || noonePlay) return;

    aiFirstBtn.style.display = "none"; // hide after first move

    const x = e.clientX - canvas.getBoundingClientRect().left;
    const col = Math.floor((x - GRID_X) / CELL_WIDTH);
    board.dropDiscAnimated(col, playerColor);

});

canvas.addEventListener("mousemove", (e) => {
    const x = e.clientX - canvas.getBoundingClientRect().left;
    hoverColumn = Math.floor((x - GRID_X) / CELL_WIDTH);
});

// --- Restart Button ---
const restartButton = document.createElement("button");
restartButton.innerText = "Restart";
restartButton.style.position = "absolute";
restartButton.style.top = "20px";
restartButton.style.right = "20px";
restartButton.style.padding = "10px 20px";
restartButton.style.fontSize = "16px";
restartButton.style.backgroundColor = "#008cba";
restartButton.style.color = "white";
restartButton.style.border = "none";
restartButton.style.borderRadius = "5px";
restartButton.style.cursor = "pointer";
restartButton.onclick = () => window.location.reload();
document.body.appendChild(restartButton);

// Update label dynamically
const slider = document.getElementById("searchDepth");
const valueLabel = document.getElementById("depthValue");

slider.addEventListener("input", () => {
    valueLabel.textContent = slider.value;
    bot.depth = parseInt(slider.value);
});

const aiFirstBtn = document.getElementById("aiFirstBtn");

// When player clicks the button
aiFirstBtn.addEventListener("click", () => {
    aiFirstBtn.style.display = "none"; // hide the button
    dropAIMove();
});



// --- Animation Loop ---
function loop() {
    updateScreen();

    requestAnimationFrame(loop);
}
loop();
