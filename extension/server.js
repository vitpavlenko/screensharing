const http = require('http');
const express = require('express');
const eapp = express();

const app = http.createServer(eapp).listen(process.env.PORT || 3000);

eapp.use('*', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket) {
	function log() {
		const array = [">>> "];
		for(var i = 0; i < arguments.length; i++) {
			array.push(arguments[i]);
        }
        // console.log(array);
		socket.emit('log', array);
	}

	socket.on('message', function (message) {
		log('Got message: ', message);
		socket.broadcast.emit('message', message); // should be room only
	});

	socket.on('create or join', function (room) {
        const numClients = io.sockets.clients(room).length;
        
        log('clients' + numClients);

        log(room + 'room')

        log('Room ' + room + ' has ' + numClients + ' client(s)');
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