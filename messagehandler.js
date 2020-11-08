
var accs = {};
accs["erik"] = {pw: "1234"};
accs["paul"] = {pw: "4321"};
accs["tim"] = {pw: "2314"};

var tokens = {}
var rooms = {}
rooms[0] = {id: 12, people: ["erik", "paul"], messages: [{sender: "erik", msg: "hey"}, {sender: "paul", msg: "lol"}]};
rooms[1] = {id: 18, people: ["tim", "paul"], messages: [{sender: "tim", msg: "tat"}, {sender: "paul", msg: "lul"}]};

var i_care = {};
for(room in rooms) { // Init to prevent bugs
    i_care[rooms[room].id] = []
}
exports.handleMessage = function (connection, message) {
    console.log("Handler Attached")
    if (message.type === 'utf8') {
        console.log('Received Message: ' + message.utf8Data);
        var response = "";

        let data;

        if(typeof message.utf8Data === 'object') {
            data = message.utf8Data;
        } else {
            data = JSON.parse(message.utf8Data);
        }
        // Malformed
        if(data.request === undefined) {
            connection.sendUTF(invalidRequest());
            return;
        }

        // Ping
        if(data.request === "ping") {
            connection.sendUTF(JSON.stringify({"response":"pong"}));
            return;
        }

        // Login
        if(data.request === "login") {
            var name = data.user;
            var pw = data.pw;

            if(accs[name] !== undefined) {
                if(accs[name].pw === pw) {


                    var newToken = getRandomString();

                    tokens[newToken] = {user: name, conn: connection}
                    connection.sendUTF(JSON.stringify({"response": "successful","req": "login", "token": newToken}));
                    return;
                } else {
                    connection.sendUTF(JSON.stringify({"response":"failed", "code":"CREDENTIALS_WRONG", "message": "Falscher Benutzername oder Passwort!"}));
                    return;
                }
            } else {
                connection.sendUTF(JSON.stringify({"response":"failed", "code":"CREDENTIALS_WRONG", "message": "Falscher Benutzername oder Passwort!"}));
                return;
            }
        }

        if(data.request === "logout") {
            var token = data.token;

            if(isTokenValid(token)) {
                tokens[token] = undefined;
                connection.sendUTF(JSON.stringify({"response": "successful", "req": "logout"}))
                return;
            } else {
                connection.sendUTF(JSON.stringify({"response": "failed", "code": "TOKEN_INVALID", "message": "Nicht eingeloggt"}))
                return;
            }
        }

        if(data.request === "register") {
            var name = data.user;
            var pw = data.pw;
            accs[name] = {pw:pw}
            connection.sendUTF(JSON.stringify({"response": "successful", "req": "register"}))
            return;
        }

        //
        // Chat
        //

        // Get Chatroom for user
        if(data.request === "chat:getrooms") {

            if(isTokenValid(data.token)) {
                let resp = [];
                let user = tokens[data.token].user;
                for (const room in Object.keys(rooms)) {
                    if(rooms[room].people.includes(user)) {
                        resp.push(rooms[room]);
                    }
                }
                connection.sendUTF(JSON.stringify({"response": "successful", "req": "chat:getrooms", "data": resp}))
                return;
            } else {
                connection.sendUTF(JSON.stringify({"response": "failed", "code": "TOKEN_INVALID", "message": "Nicht eingeloggt"}))
                return;
            }

        }

        // Get Messages
        if(data.request === "chat:getMessages") {

            if(isTokenValid(data.token)) {
                var room = data.room;
                let resp;
                for(r in rooms) {
                    if(rooms[r].id === room) {
                        resp = rooms[r].messages;
                    }
                }
                connection.sendUTF(JSON.stringify({"response": "successful", "req": "chat:getMessages", "data": resp, "name": tokens[data.token].user}))
                return;
            } else {
                connection.sendUTF(JSON.stringify({"response": "failed", "code": "TOKEN_INVALID", "message": "Nicht eingeloggt"}))
                return;
            }

        }

        // Send Message
        if(data.request === "chat:sendMessage") {
            if(isTokenValid(data.token)) {
                let room = getRoomByID(data.room);
                let text = data.message;
                let sender = tokens[data.token].user;

                room.messages.push({sender: sender, msg: text})

                var users = i_care[room.id];
                for (user in users) {
                    let u = users[user];
                    u.conn.sendUTF(JSON.stringify(
                        {
                            "request": "newmessage",
                            "room": room,
                            "sender": sender,
                            "text": text,
                            "name": tokens[data.token].user
                        }));
                }
                connection.sendUTF(JSON.stringify({"response": "successful", "req": "chat:sendMessage"}));
                return;
            } else {
                connection.sendUTF(JSON.stringify({"response": "failed", "code": "TOKEN_INVALID", "message": "Nicht eingeloggt"}));
                return;
            }
        }

        if(data.request === "chat:iCare") {

            if(isTokenValid(data.token)) {
                var room = data.room;

                i_care[room].push({name: tokens[data.token].user, conn: connection});
                connection.sendUTF(JSON.stringify({"response": "successful", "req": "chat:iCare"}))
                console.log("Added " + tokens[data.token].user + " mit: " + connection);
                return;
            } else {
                connection.sendUTF(JSON.stringify({"response": "failed", "code": "TOKEN_INVALID", "message": "Nicht eingeloggt"}))
                return;
            }

        }

        if(data.request === "chat:iDontCare") {

            if(isTokenValid(data.token)) {
                var room = data.room;

                for(let roomentry in i_care[room]) {
                    if(roomentry.name === tokens[data.token].user) {
                        const id = i_care.indexOf(roomentry);
                        i_care[room].splice(id, 1);
                    }
                }
                connection.sendUTF(JSON.stringify({"response": "successful", "req": "chat:iDontCare"}))
                return;
            } else {
                connection.sendUTF(JSON.stringify({"response": "failed", "code": "TOKEN_INVALID", "message": "Nicht eingeloggt"}))
                return;
            }
        }

    }
    else if (message.type === 'binary') {
        console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
        connection.sendBytes(message.binaryData);
        return;
    }

}

function invalidRequest() {
    return JSON.stringify({"response": "failed", "code": "MALFORMED_REQUEST", "message": "Request format wrong"});
}
function getRandomString() {
    return Math.random().toString(36).slice(-5);
}

function isTokenValid(token) {
    return tokens[token] !== undefined;
}
function getRoomByID(id) {
    for(r in rooms) {
        let m = rooms[r];
        if(m.id === id) {
            return m;
        }
    }
}