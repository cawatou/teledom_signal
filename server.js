var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

var users = {};

io.on('connection', function (socket) {
    socket.on('chat message', function (msg) {
        console.log(msg);
        io.emit('chat message', msg);
    });

    // Желание нового пользователя присоединиться к комнате
    socket.on("room", function(message) {
        var json = JSON.parse(message);
        // Добавляем сокет в список пользователей
        users[json.id] = socket;
        if (socket.room !== undefined) {
            // Если сокет уже находится в какой-то комнате, выходим из нее
            socket.leave(socket.room);
        }
        // Входим в запрошенную комнату
        socket.room = json.room;
        socket.join(socket.room);
        socket.user_id = json.id;
        // Отправялем остальным клиентам в этой комнате сообщение о присоединении нового участника
        socket.broadcast.to(socket.room).emit("new", json.id);
    });

});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
