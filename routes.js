// This file is required by app.js. It sets up event listeners
// for the two main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.

// Use the gravatar module, to turn email addresses into avatar images:

var gravatar = require('gravatar');

// Database connection
var mysql = require('mysql')
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root123',
  database : 'moodle'
});

connection.connect()

connection.query('SELECT 1 + 1 AS solution', function (err, rows, fields) {
  if (err) throw err

  console.log('The solution is: ', rows[0].solution)
})

//connection.query('CREATE TABLE mdl_quiz_liveusers (id bigint(10) PRIMARY KEY AUTO_INCREMENT, username VARCHAR(20), quiz bigint(10), room bigint(10), socket VARCHAR(20), status VARCHAR(10), timestamp bigint(10));', function (err, rows, fields) {
//  if (err) throw err
//
//  console.log('Table created.')
//})
//console.log('----------connection obj------------');
//console.log(connection);

// Export a function, so that we can pass 
// the app and io instances from the app.js file:

module.exports = function(app,io){

	app.get('/', function(req, res){
		// Render views/home.html
		res.render('home');
	});

	app.get('/create', function(req,res){

		// Generate unique id for the room
		var id = Math.round((Math.random() * 1000000));

		// Redirect to the random room
		res.redirect('/chat/'+id);
	});

	app.get('/chat/:id', function(req,res){

		// Render the chat.html view
		res.render('chat');
	});

	// Initialize a new socket.io application, named 'chat'
	var chat = io.sockets.on('connection', function (socket) {

		// When the client emits the 'load' event, reply with the 
		// number of people in this chat room
		console.log('A client connected!');

		socket.on('load',function(data){
			console.log('------data-------');
			console.log(data);
			
			var room = findClientsSocket(io,data);
			
//			console.log('------room-------');
//			console.log(room);
			
			if(room.length === 0 ) {
				console.log('------room.len == 0 -------');
//				console.log(room);
				
				io.sockets.emit('peopleinchat', {number: 0});
			} else if(room.length === 1) {
				
				console.log('------room.len == 1 -------');
//				console.log(room);
				
				io.sockets.emit('peopleinchat', {
					number: 1,
					user: room[0].username,
					avatar: room[0].avatar,
					id: data
				});
			} else if(room.length >= 2) {
				console.log('------room.len == 2 -------');
//				console.log(room);
				
				chat.emit('tooMany', {boolean: true});
			}
		});

		// When the client emits 'login', save his name and avatar,
		// and add them to the room
		socket.on('login', function(data) {
			console.log('------in login -------');
			console.log(data);
			
			var timeStamp = Math.floor(Date.now() / 1000);
//			console.log('----------connection obj------------');
//			console.log(connection);
			var sqlquery = 'INSERT INTO mdl_quiz_liveusers (username, quiz, room, socket, status, timestamp) VALUES ("'+data.user+'", 1, '+data.id+', "'+socket.id+'", "opened", '+timeStamp+');';
			console.log('----------sqlquery------------');
			console.log(sqlquery);
			
			connection.query(sqlquery, function (err, rows, fields) {
				  if (err) throw err

				  console.log('-----------1 row added.-----------')
				})

			
			var room = findClientsSocket(io, data.id);
			// Only two people per room are allowed
			if (room.length < 2) {
				
				// Use the socket object to store data. Each client gets
				// their own unique socket object

				socket.username = data.user;
				socket.room = data.id;
				socket.avatar = gravatar.url(data.avatar, {s: '140', r: 'x', d: 'mm'});

				// Tell the person what he should use for an avatar
				socket.emit('img', socket.avatar);


				// Add the client to the room
				socket.join(data.id);

				if (room.length == 1) {

					var usernames = [],
						avatars = [];

					usernames.push(room[0].username);
					usernames.push(socket.username);
					
					console.log("---------usernames----------");
					console.log(usernames);
					
					avatars.push(room[0].avatar);
					avatars.push(socket.avatar);

					// Send the startChat event to all the people in the
					// room, along with a list of people that are in it.

					chat.in(data.id).emit('startChat', {
						boolean: true,
						id: data.id,
						users: usernames,
						avatars: avatars
					});
				}
			}
			else {
				socket.emit('tooMany', {boolean: true});
			}
		});

		// Somebody left the chat
		socket.on('disconnect', function() {

			// Notify the other person in the chat room
			// that his partner has left
			console.log('A client disconnected!');
			socket.broadcast.to(this.room).emit('leave', {
				boolean: true,
				room: this.room,
				user: this.username,
				avatar: this.avatar
			});

			// leave the room
			socket.leave(socket.room);
		});


		// Handle the sending of messages
		socket.on('msg', function(data){

			// When the server receives a message, it sends it to the other person in the room.
			socket.broadcast.to(socket.room).emit('receive', {msg: data.msg, user: data.user, img: data.img});
		});
	});
};

function findClientsSocket(io,roomId, namespace) {
	var arr = [],
		ns = io.of(namespace || "/");    // the default namespace is "/"

	if (ns) {
		//console.log("--------ns---------------");
		//console.log(ns);
		for (var id in ns.connected) {
		//	console.log("--------ns-connected---------");
		//	console.log(ns.connected);
			
			if(roomId) {
//				var index = ns.connected[id].rooms.indexOf(roomId) ;	// error! rooms is not an array
//				var index = ns.connected[id].rooms.valueOf() ;	// returns the entire content of rooms
				
				var value = ns.connected[id].rooms[roomId] ;	// works..roomId as key
				
				var hasProp = ns.connected[id].rooms.hasOwnProperty(roomId);	// works..roomId as key
//				console.log("--------hasProp---------");
//				console.log(hasProp);
				
//				console.log("--------id---------");
//				console.log(id);
//				var index = ns.connected[id].rooms.prototype.indexOf(id) ;
				
				var rooms = Object.values(ns.connected[id].rooms);	// works..roomId as value
				var index = rooms.indexOf(roomId);
//				console.log("--------propertyValues---------");
//				console.log(propertyValues);
//				console.log("--------index---------");
//				console.log(index);
				
//				var properties = Object.keys(ns.connected[id].rooms);
//				console.log("--------properties---------");
//				console.log(properties);				
//				var hasProp = id in properties;	// not working..check!
//				var hasProp = properties.indexOf(roomId);
//				console.log("--------hasProp---------");
//				console.log(hasProp);
							
				const obj = { a: 5, b: 7, c: 9 };
				for (const [key, value] of Object.entries(obj)) { // obj is ns.connected[id].rooms
					if (value === roomId) {
//						console.log(`${key} ${value}`); // "a 5", "b 7", "c 9"
//						var index = key;
					}
				}			
				
//				console.log("--------ns.connected[id]---------");
//				console.log(ns.connected[id]);
//				console.log("--------ns.connected[id].rooms---------");
//				console.log(ns.connected[id].rooms);
//				console.log("--------Object.prototype.toString.call(ns.connected[id])---------");
//				console.log(Object.prototype.toString.call(ns.connected[id]));
//				console.log(typeof ns.connected[id].rooms);
//				console.log("--------Object.prototype.toString.call(ns.connected[id].rooms)---------");
//				console.log(Object.prototype.toString.call(ns.connected[id].rooms));
				
//				var index = ns.connected[id].indexOf(roomId) ;	// error!
//				console.log("--------index---------");
//				console.log(index);
				
//				if(value !== undefined) {	// works!
			    if(index !== -1) {
					arr.push(ns.connected[id]);
				}
			} else {
				arr.push(ns.connected[id]);
			}
		}
	}
	return arr;
}


