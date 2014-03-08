var _ = require('underscore')
, webSocket = require('ws')
, container = require('./container');

var defaults = {
	port: 8080
};

var connectionEstablished = function(ws, connection) {
	var client = connection.client;
	ws.send( JSON.stringify({ type: 'connected', key: connection.key }) );

	client.on('msg', function(msg) {
		ws.send(JSON.stringify(msg));
	});
	
	ws.on('message', function (msg) {
		client.emit('send', JSON.parse(msg));
	});

	ws.on('close', function() {
		client.removeAllListeners();
	});
};

exports.start = function(configure) {
	
	var config = _.defaults(configure || {}, defaults)
	, wss = new webSocket.Server({ port: config.port })
	, connections = container.Connection();

	console.log('Starting proxy');
	wss.on('connection', function (ws) {
		var commands = {
			connect: function(message) {
				var config = message.connection
				, connection = connections.create(config);
				connectionEstablished(ws, connection);
			},
			reconnect: function(message) {
				var key = message.key;
				if (connections.has(key)) {
					var connection = connections.get(key);
					connectionEstablished(ws, connection);
				} 
				else {
					ws.send(JSON.stringify({ 
						success: false, 
						type: 'disconnected', 
						msg: 'The connection you are referencing does not exists'
					}));
				}
			}
		};

		console.log("Connection received from " + ws);
		ws.on('message', function (msg) {
			var message = JSON.parse(msg);
			
			if (message.type == 'connect') {
				commands.connect(message);
			}

			else if (message.type == 'reconnect') {
				commands.reconnect(message);
			} 

			else if (message.type == 'disconnect') {
				console.log('Disconenct not implemented. Exiting')
				process.kill();
			}

			else {
				ws.send(JSON.stringify({
					success: false,
					type: 'unknown command',
					msg: message.type +'" command does not exist'
				}));
			}
		});
	});	
};




