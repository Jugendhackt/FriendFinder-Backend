
var accs = {};
accs["erik"] = {pw: "1234"};
accs["paul"] = {pw: "4321"};
accs["tim"] = {pw: "2314"};

var tokens = {}
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

                    tokens[newToken] = {user: name}
                    connection.sendUTF(JSON.stringify({"response": "successful", "token": newToken}));
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
                connection.sendUTF(JSON.stringify({"response": "successful"}))
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
            connection.sendUTF(JSON.stringify({"response": "successful"}))
        }

        //connection.sendUTF(response);

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