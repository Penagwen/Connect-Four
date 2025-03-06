const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


const EMPTY = 0;
const RED = 1;
const YELLOW = 2;
const WIN = 3;

const oppositeColor = (color) => (color == 1) ? 2 : 1;

let endgame = false;
let playerColor = YELLOW;
let turn = 1;
let whoTurn = "PLAYER";

class Board {
    constructor(){
        this.grid = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ]
        this.nextPlace = [5, 5, 5, 5, 5, 5, 5];
        this.width = canvas.width-500;
        this.height = canvas.width-800;
    }

    draw(){
        // draw outline
        c.strokeStyle = "black";
        c.lineWidth = 5;

        const cellWidth = (canvas.width-200)/7;
        const cellHeight = canvas.height/7;

        const gridWidth = cellWidth*7;
        const gridHeight = cellHeight*6

        const corner = {
            x: canvas.width/2 - gridWidth/2,
            y: canvas.height/2 - gridHeight/2,
        }

        c.strokeRect(corner.x, corner.y, gridWidth, gridHeight);

        for(let x = 0; x < 7; x++){
            for(let y = 0; y < 6; y++){
                c.beginPath();
                c.arc(corner.x + x*cellWidth + cellWidth/2, corner.y + y*cellHeight + cellHeight/2, Math.sqrt(cellWidth)/2, 0, Math.PI*2);
                c.fillStyle = "black";
                c.fill();
            }
        }

        // draw grid
        this.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if(cell > WIN){
                    c.beginPath();
                    c.arc(corner.x + x*cellWidth + cellWidth/2, corner.y + y*cellHeight + cellHeight/2, cellWidth/5, 0, Math.PI*2);
                    c.fillStyle = (cell-WIN == RED) ? "red" : "yellow";
                    c.fill();

                    c.beginPath();
                    c.arc(corner.x + x*cellWidth + cellWidth/2, corner.y + y*cellHeight + cellHeight/2, cellWidth/5+2, 0, Math.PI*2);
                    c.strokeStyle = "cyan";
                    c.stroke();
                }else if(cell != EMPTY){
                    c.beginPath();
                    c.arc(corner.x + x*cellWidth + cellWidth/2, corner.y + y*cellHeight + cellHeight/2, cellWidth/5, 0, Math.PI*2);
                    c.fillStyle = (cell == RED) ? "red" : "yellow";
                    c.fill();
                }
            });
        });

    }

    // not my code
    checkLine(a,b,c,d) {
        // Check first cell non-zero and all cells match
        return ((a != 0) && (a ==b) && (a == c) && (a == d));
    }
    
    checkWinner(show) {
        let bd = this.grid;
        // Check down
        for (let r = 0; r < 3; r++){
            for (let c = 0; c < 7; c++){
                if (this.checkLine(bd[r][c], bd[r+1][c], bd[r+2][c], bd[r+3][c])){
                    if(show){
                        bd[r][c] += WIN;
                        bd[r+1][c] += WIN;
                        bd[r+2][c] += WIN;
                        bd[r+3][c] += WIN;
                        endgame = true;
                    }
                    return bd[r][c];
                }
            }
        }
    
        // Check right
        for (let r = 0; r < 6; r++){
            for (let c = 0; c < 4; c++){
                if (this.checkLine(bd[r][c], bd[r][c+1], bd[r][c+2], bd[r][c+3])){
                    if(show){
                        bd[r][c] += WIN;
                        bd[r][c+1] += WIN;
                        bd[r][c+2] += WIN;
                        bd[r][c+3] += WIN;
                        endgame = true;
                    }
                    return bd[r][c];
                }
            }
        }
        // Check down-right
        for (let r = 0; r < 3; r++){
            for (let c = 0; c < 4; c++){
                if (this.checkLine(bd[r][c], bd[r+1][c+1], bd[r+2][c+2], bd[r+3][c+3])){
                    if(show){
                        bd[r][c] += WIN;
                        bd[r+1][c+1] += WIN;
                        bd[r+2][c+2] += WIN;
                        bd[r+3][c+3] += WIN;
                        endgame = true;
                    }
                    return bd[r][c];
                }
            }
        }
    
        // Check down-left
        for (let r = 3; r < 6; r++){
            for (let c = 0; c < 4; c++){
                if (this.checkLine(bd[r][c], bd[r-1][c+1], bd[r-2][c+2], bd[r-3][c+3])){
                    if(show){
                        bd[r][c] += WIN;
                        bd[r-1][c+1] += WIN;
                        bd[r-2][c+2] += WIN;
                        bd[r-3][c+3] += WIN;
                        endgame = true;
                    }
                    return bd[r][c];
                }
            }
        }
    
        return 0;
    }
}

class Move{
    constructor({x, y, color}){
        this.x = x;
        this.y = y;
        this.color = color;
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
        board.grid[0].forEach((cell, x) => {
            if(cell == EMPTY){
                moves.push(new Move({ x: x, y: board.nextPlace[x], color: color}));
            } 
        });
        return moves;
    }

    makeBestMove(){
        if(endgame){ return; }
        this.saveTable = [];

        let moves = this.genMoves(this.color);
        moves.forEach((move, i) => {
            this.makeMove(move);
            moves[i] = [move, this.search(this.depth-1, oppositeColor(this.color), -Infinity, Infinity)];
            this.undoMove(move);
        });


        moves.sort((a, b) => {
            if (a[1] < b[1]) { return 1; }
            if (a[1] > b[1]) { return -1; }          
            return 0;
        });

        // make the move with the highest score
        //alert(moves);
        this.makeMove(moves[0][0]);
        UpdateScreen();
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
        for(let i = 0; i<moves.length; i++){
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
                    total += this.evalTable[y][x];
                }else if(cell == oppositeColor(this.color)){
                    total -= this.evalTable[y][x];
                }
            });
        });
        return total; 
    }

    makeMove(move){
        board.grid[move.y][move.x] = move.color;
        board.nextPlace[move.x] --;
    }

    undoMove(move){
        board.grid[move.y][move.x] = EMPTY;
        board.nextPlace[move.x] ++;
    }
}

function UpdateScreen(){
    c.fillStyle = "white";
    c.fillRect(0, 0, canvas.width, canvas.height);

    let check = board.checkWinner(true);
    if(check == RED){
        endgame = true;
        alert(endgame);
    }else if(check == YELLOW){
        endgame = true;
    }

    turn ++;
    whoTurn = (whoTurn == "PLAYER") ? "BOT" : "PLAYER";

    if(turn % 10 == 0){
        bot.depth ++;

    }
    document.querySelector("span").innerHTML = `depth - ${bot.depth}`;
    board.draw();
}

function restart(){
    board = new Board();
    bot = new Bot(oppositeColor(playerColor), 8);
    endgame = false;
    playerColor = YELLOW;
    turn = 1;
    whoTurn = "PLAYER";

    UpdateScreen();
}


window.onmousedown = (e) => {
    if(endgame){ return; }
    if(e.x < 100){ return; }

    const cellWidth = (canvas.width-100)/7;
    let x = Math.round(Math.max(0, e.x-100) / cellWidth);
    x = Math.min(Math.max(x, 0), 6);

    // alert(e.x);
    // alert(cellWidth);

    board.grid[board.nextPlace[x]][x] = playerColor;
    board.nextPlace[x] --;


    UpdateScreen();
    setTimeout(() => {
        bot.makeBestMove();  
    }, 0);
}

window.onkeydown = (e) => {
    whoTurn = "BOT";
    setTimeout(() => {
        bot.makeBestMove();  
    }, 0);
}


let board = new Board();
let bot = new Bot(oppositeColor(playerColor), 8);
UpdateScreen();