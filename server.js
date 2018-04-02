const HTTPS_PORT = 1212;

const express = require('express');
const app = express();
const fs = require('fs');
const server = require('https').createServer({
	key: fs.readFileSync('key.pem'),
	cert: fs.readFileSync('cert.pem')
},app);

server.listen(HTTPS_PORT, '0.0.0.0', function() {
	console.log('listening on https://localhost:'+HTTPS_PORT);
});


var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
	function log() {
		var array = [">>> "];
		for(var i = 0; i < arguments.length; i++) {
			array.push(arguments[i]);
		}
		socket.emit('log', array);
	}

	socket.on('message', function (message) {
		log('Got message: ', message);
		socket.broadcast.emit('message', message); // should be room only
	});

	socket.on('create or join', function (room) {
		var numClients = io.sockets.clients(room).length;

		log('Room ' + room + ' has ' + numClients + ' client(s)');
		log('Request to create or join room', room);

		if(numClients == 0) {
			socket.join(room);
			socket.emit('created', room);
		}

		else if(numClients == 1) {
			io.sockets.in(room).emit('join', room);
			socket.join(room);
			socket.emit('joined', room);
		}

		else { // max two clients
			socket.emit('full', room);
		}

		socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
		socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);
	});
});

app.use(express.static('client/'));