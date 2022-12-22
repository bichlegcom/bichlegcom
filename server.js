const { response } = require("express");
const http = require("http");
var mysql = require('mysql');
const websocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(8889, () => console.log("Start"));

const card = ["2d", "2t", "2b", "2g", "3d", "3t", "3b", "3g", "4d", "4t", "4b", "4g", "5d", "5t", "5b", "5g", "6d", "6t", "6b", "6g", "7d", "7t", "7b", "7g", "8d", "8t", "8b", "8g", "9d", "9t", "9b", "9g", "1d", "1t", "1b", "1g", "jd", "jt", "jb", "jg", "qd", "qt", "qb", "qg", "kd", "kt", "kb", "kg", "ad", "at", "ab", "ag"];
const playerArray = [];
const gameArray = [];

const wsServer = new websocketServer({
    "httpServer": httpServer
});

wsServer.on("request", request => {
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"));
    connection.on("close", () => pingActiveUsers());
    connection.on("message", async message => {

        const result = JSON.parse(message.utf8Data);
        if (result.method === "initPlayer") {
            if (playerExist(result.userToken) == '1111') {
                const payLoad = {
                    "method": "closeConnection"
                }
                sendPrivate(result.clientId, payLoad);
                closeConnection(result.clientId);
                pingActiveUsers();
            } else {
                const userInfo = await userArray(result.userToken);
                const userMicroB = await userBalance(userInfo.userId);
                updateUserArray(result.clientId, "tableId", result.tableId);
                updateUserArray(result.clientId, "userToken", result.userToken);
                updateUserArray(result.clientId, "balance", userMicroB);
            }
        }

        if (result.method === "initGame") {
            const tableId = result.tableId;
            const clientId = result.clientId;
            updateUserArray(clientId, "sit", "ok");
            if (countSitUsers() > 8) {
                const payLoad = {
                    "method": "alert",
                    "text": "Өрөө дүүрсэн!"
                }
                sendPrivate(clientId, payLoad);
            }
            if (countSitUsers(tableId) > 1) {
                if (gameId(tableId) == null || gameId(tableId) == '0000') {
                    gameArray.push({ "tableId": tableId, "gameId": guid(), "card1": "0000", "card2": "0000", "card3": "0000", "card4": "0000", "card5": "0000", "betTotal": "0000", "gameWinner": "0000" });
                    updateAllUser(tableId, "gameId", gameId(tableId));
                    sendUserCard(tableId, gameId(tableId));
                    deskFirstFunction(tableId, gameId(tableId));
                    const payLoad = {
                        "method": "gameStart",
                        "desk1": gameCard(getGameArray(tableId, gameId(tableId), "card1")),
                        "desk2": gameCard(getGameArray(tableId, gameId(tableId), "card2")),
                        "desk3": gameCard(getGameArray(tableId, gameId(tableId), "card3"))
                    }
                    sendPublic(playerArray, payLoad);
                    activeUsers(tableId, gameId(tableId));
                } else {
                    updateUserArray(clientId, "gameId", gameId(tableId));
                    sendUserCard(tableId, gameId(tableId));
                    const payLoad = {
                        "method": "gameStart",
                        "desk1": gameCard(getGameArray(tableId, gameId(tableId), "card1")),
                        "desk2": gameCard(getGameArray(tableId, gameId(tableId), "card2")),
                        "desk3": gameCard(getGameArray(tableId, gameId(tableId), "card3"))
                    }
                    sendPrivate(clientId, payLoad);
                }
            } else {
                const payLoad = {
                    "method": "info",
                    "text": "Дахиад нэг хүн орж иртэл хүлээнэ үү!"
                }
                sendPrivate(clientId, payLoad);
            }
            if (gameId(tableId) != null) {
                const payLoad = {
                    "method": "info",
                    "text": "Энэ тоглолт дуустал хүлээнэ үү!"
                }
                sendPrivate(clientId, payLoad);
            }
            var playerBar = '<div class="row mb-2">';
            playerBar += '<div class="col-4"><div id="allButton" class="btn btn-danger w-100" onclick="all()">Бүгд</div></div>';
            playerBar += '<div class="col-4"><div id="callButton" class="btn btn-success w-100" onclick="call()">Дагах</div></div>';
            playerBar += '<div class="col-4"><div id="betButton" class="btn btn-warning w-100" onclick="bet()">Дуудах</div></div>';
            playerBar += '</div>';
            playerBar += '<div id="betRow" class="row mb-2 d-none">';
            playerBar += '<div class="col-4"><div id="minusOneButton" class="btn btn-danger w-100" onclick="minusOne()"><i class="fa-solid fa-circle-minus"></i></div></div>';
            playerBar += '<div class="col-4"><div id="betBalance" class="btn btn-secondary w-100">0</div></div>';
            playerBar += '<div class="col-4"><div id="plusOneButton" class="btn btn-success w-100" onclick="plusOne()"><i class="fa-solid fa-circle-plus"></i></div></div>';
            playerBar += '<div class="col-12 mt-2"><div id="betSubmit" class="btn btn-success w-100">Баталгаажуулах</div></div></div>';
            playerBar += '<div class="row">';
            playerBar += '<div class="col-12"><div id="leaveButton" class="btn btn-danger w-100" onclick="leave()">Гарах</div></div>';
            playerBar += '</div>';
            const payLoad = {
                "method": "playerBar",
                "text": playerBar
            }
            sendPrivate(clientId, payLoad);
        }



    });
    const clientId = guid();
    playerArray.push({ "clientId": clientId, "userToken": "0000", "tableId": "0000", "gameId": "0000", "sit": "0000", "balance": "0000", "bet": "0000", "card1": "0000", "card2": "0000", "rank": "0000", "point": "0000", "connection": connection });
    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }
    connection.send(JSON.stringify(payLoad));
});

function getGameArray(tableId, gameId, row) {
    var result = "0000";
    gameArray.forEach(item => {
        if (item.tableId == tableId && item.gameId == gameId) {
            result = item[row];
        }
    });
    return result;
}

function activeUsers(tableId) {
    const response = [];
    let i = 1;
    playerArray.forEach(item => {
        if (item.sit == 'ok' && item.tableId == tableId) {
            response.push({
                "tableId": item.tableId,
                "sit": "pokerPlayer" + i,
                "balance": item.balance
            });
            i++;
        }
    });
    const payLoad = {
        "method": "deskUsers",
        "text": response
    };
    sendPublic(playerArray, payLoad);
}

function sendUserCard(tableId, gameId) {
    playerArray.forEach(item => {
        if (item.sit == 'ok' && item.tableId == tableId && item.gameId == gameId) {
            userFirstCard(item.clientId, item.tableId, item.gameId);
            const payLoad = {
                "method": "playerStart",
                "card1": gameCard(item.card1),
                "card2": gameCard(item.card2)
            }
            sendPrivate(item.clientId, payLoad);
        }
    });
}

function userFirstCard(clientId, tableId, gameId) {
    const tempCard = card;
    var tempDesk = null;
    gameArray.forEach(item => {
        if (item.tableId == tableId && item.gameId == gameId) {
            if (item.card1 != '0000') {
                tempDesk = item.card1;
                tempCard.slice(tempCard.indexOf(tempDesk), 1);
            }
            if (item.card2 != '0000') {
                tempDesk = item.card2;
                tempCard.slice(tempCard.indexOf(tempDesk), 1);
            }
            if (item.card3 != '0000') {
                tempDesk = item.card3;
                tempCard.slice(tempCard.indexOf(tempDesk), 1);
            }
        }
    });
    playerArray.forEach(item => {
        if (item.sit == 'ok' && item.tableId == tableId && item.gameId == gameId) {
            if (item.card1 != '0000') {
                tempDesk = item.card1;
                tempCard.slice(tempCard.indexOf(tempDesk), 1);
            }
            if (item.card2 != '0000') {
                tempDesk = item.card2;
                tempCard.slice(tempCard.indexOf(tempDesk), 1);
            }
        }
    });
    const shuffledCard = shuffleCard(tempCard);
    updateUserArray(clientId, "card1", shuffledCard[0]);
    updateUserArray(clientId, "card2", shuffledCard[1]);
}

function gameCard(card) {
    if (card == "0000" || card == null) {
        return '<div class="btn btn-light btn-lg w-100 h-100"><i class="fa-solid fa-xmark"></i></div>';
    } else {
        if (card[1] == 'd') {
            className = 'text-danger';
            font = '<i class="ms-1"></i>♦️';
        } else if (card[1] == 't') {
            className = 'text-dark';
            font = '<i class="ms-1"></i>♣️';
        } else if (card[1] == 'b') {
            className = 'text-danger';
            font = '<i class="ms-1"></i>♥️';
        } else {
            className = 'text-dark';
            font = '<i class="ms-1"></i>♠️';
        }
        head = card[0];
        if (card[0] == '1') {
            head = '10';
        } else if (card[0] == 'j') {
            head = 'J';
        } else if (card[0] == 'q') {
            head = 'Q';
        } else if (card[0] == 'k') {
            head = 'K';
        } else if (card[0] == 'a') {
            head = 'A';
        }
        return '<div class="btn btn-light ' + className + ' w-100 h-100">' + head + '' + font + '</div>';
    }
}

function gameId(tableId) {
    var tempGameId = null;
    gameArray.forEach(item => {
        if (item.tableId == tableId) {
            tempGameId = item.gameId;
        }
    });
    return tempGameId;
}

function countSitUsers(tableId) {
    let i = 0;
    playerArray.forEach(item => {
        if (item.sit == 'ok' && item.tableId == tableId) {
            i++;
        }
    });
    return i;
}

function playerExist(userToken) {
    var checker = null;
    playerArray.forEach(item => {
        if (item.userToken == userToken) {
            checker = '1111';
        }
    });
    return checker;
}

function closeConnection(clientId) {
    playerArray.forEach(item => {
        if (item.clientId == clientId) {
            item.connection.close();
        }
    });
}

function updateGameArray(tableId, gameId, row, value) {

}

function updateAllUser(tableId, row, value) {
    playerArray.forEach(item => {
        if (item.tableId == tableId) {
            item[row] = value;
        }
    });
}

function updateUserArray(clientId, row, value) {
    playerArray.forEach(item => {
        if (item.clientId == clientId) {
            item[row] = value;
        }
    });
}

function pingActiveUsers() {
    playerArray.forEach(item => {
        if (item.connection.state == 'closed') {
            var index = playerArray.indexOf(item);
            if (index !== -1) {
                playerArray.splice(index, 1);
            }
        }
    });
    gameArray.forEach(item => {
        if (countSitUsers(item.tableId) < 2) {
            restartGame(item.tableId, item.gameId);
        }
    })
}

function restartGame(tableId, gameId) {
    var winnerClientId = null;
    let winnerBalance = null;
    gameArray.forEach(element => {
        if (element.tableId == tableId && element.gameId == gameId) {
            if (element.gameWinner != '0000') {
                winnerClientId = element.gameWinner;
            }
            if (element.betTotal != '0000') {
                winnerBalance = element.betTotal;
            }
            element.gameId = '0000';
            element.card1 = '0000';
            element.card2 = '0000';
            element.card3 = '0000';
            element.card4 = '0000';
            element.card5 = '0000';
            element.betTotal = '0000';
            element.gameWinner = '0000';
        }
    });
    const payLoad1 = {
        "method": "gameStart",
        "desk1": gameCard("0000"),
        "desk2": gameCard("0000"),
        "desk3": gameCard("0000")
    }
    sendPublic(playerArray, payLoad1);
    if (winnerBalance != '0000' || winnerBalance != null) {
        playerArray.forEach(element => {
            if (element.clientId == winnerClientId && element.gameId == gameId) {
                let balance = element.balance;
                element.balance = balance + winnerBalance;
                element.gameId = '0000';
                element.card1 = '0000';
                element.card2 = '0000';
                element.bet = '0000';
                element.rank = '0000';
                element.point = '0000';
            } else {
                element.gameId = '0000';
                element.card1 = '0000';
                element.card2 = '0000';
                element.bet = '0000';
                element.rank = '0000';
                element.point = '0000';
            }
        });
    }
    const payLoad2 = {
        "method": "playerStart",
        "card1": gameCard("0000"),
        "card2": gameCard("0000")
    }
    sendPublic(playerArray, payLoad2);
    activeUsers(tableId);
}

function transferMicroB(from, to, balance, gameId) {
    if (from == 'table') {

    } else {

    }
}

function sendPrivate(clientId, payLoad) {
    playerArray.forEach(item => {
        if (item.clientId == clientId) {
            const con = item.connection;
            con.send(JSON.stringify(payLoad));
        }
    });
}

function sendPublic(playerArray, payLoad) {
    playerArray.forEach(item => {
        item.connection.send(JSON.stringify(payLoad));
    });
}

function deskFirstFunction(tableId, gameId) {
    const shuffledCard = shuffleCard(card);
    gameArray.forEach(item => {
        if (item.tableId == tableId && item.gameId == gameId) {
            item.card1 = shuffledCard[0];
            item.card2 = shuffledCard[1];
            item.card3 = shuffledCard[2];
        }
    });
}



function shuffleCard(array) {
    let currentIndex = array.length,
        randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}

function userBalance(userId) {

    return new Promise((resolve, reject) => {

        let connection = mysql.createConnection({
            user: 'sembii_user',
            host: 'localhost',
            database: 'sembii_com_db',
            password: '9H1T4Ypj6g7nFL4u',
            multipleStatements: true,
        });

        connection.connect(function(err) {
            if (err) {
                reject(err);
            }
        });

        connection.query('SELECT SUM(`balanceAmount`) FROM `balance` WHERE `userId` = "' + userId + '";', (err, res) => {
            if (err) {
                reject(err);
            } else {
                if (res[0]['SUM(`balanceAmount`)'] == null) {
                    var balance = 0;
                } else {
                    var balance = res[0]['SUM(`balanceAmount`)'];
                }
                resolve(balance);
            }
        });

        connection.end();

    });
}

function userArray(userToken) {

    return new Promise((resolve, reject) => {

        let connection = mysql.createConnection({
            user: 'sembii_user',
            host: 'localhost',
            database: 'sembii_com_db',
            password: '9H1T4Ypj6g7nFL4u',
            multipleStatements: true,
        });

        connection.connect(function(err) {
            if (err) {
                reject(err);
            }
        });

        connection.query('SELECT * FROM `user` WHERE `userToken` = "' + userToken + '";', (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res[0]);
            }
        });

        connection.end();

    });

}

function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();