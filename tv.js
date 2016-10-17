var tv_symbol = "FX:AUDJPY";

var TradingView = function() {
	var self = this,
		frame = '~m~',
		_sessionId,
		_quoteId;

	function stringify(message) {
		if (Object.prototype.toString.call(message) == '[object Object]'){
			return JSON.stringify(message);
		} else {
			return String(message);
		}
	};

	self.init = function(connection) {
		generateSessionId();
		generateQuoteId();
		var initData = getInitData();

		for (var l in initData) {
			self.sendRequest(initData[l]['m'], initData[l]['p'], connection);
		}
	};

	function randomHashN(n) {
		var str="0123456789abcdefghijklmopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
			res="";

		for (var t = 0; t < n; t++) {
			var i = Math.round( Math.random()*(str.length-1) );

			res += str[i];
		}

		return res;
	};

	function randomHash() {
		return randomHashN(12);
	};

	function generateSessionId() {
		_sessionId = 'cs_' + randomHash();
	};

	function generateQuoteId() {
		_quoteId = 'qs_' + randomHash();
	};


	function getInitData() {
		return [
			{m: 'chart_create_session', p: [_sessionId,""]},
			{m: 'quote_create_session', p: [_quoteId]},
			{m: 'quote_set_fields', p: [_quoteId,"ch","chp","lp","fractional","minmov","minmove2","original_name","pricescale","pro_name","update_mode","volume","symbol_status","description","exchange","short_name","current_session","type","is_tradable"]},
			{m: 'quote_add_symbols', p: [_quoteId,"FX:AUDJPY",{"flags":["force_permission"]}]},
			{m: "switch_timezone", p: [_sessionId,"Europe/Athens"]},
			{m: "resolve_symbol", p: [_sessionId,"symbol_1",tv_symbol]},
			{m: 'create_series', p: [_sessionId,"s1","s1","symbol_1","5",300]}
		];
	}

	self.sendRequest = function(m, data, connection) {
		var message = {
			m: m,
			p: data
		};

		console.log('send data', self.encode(message));
		connection.send( self.encode(message) );
	};

	self.encode = function(messages) {
		var ret = '', 
			message,
			messages = Array.isArray(messages) ? messages : [messages];

		for (var i = 0, l = messages.length; i < l; i++) {
			message = messages[i] === null || messages[i] === undefined ? '' : stringify(messages[i]);
			ret += frame + message.length + frame + message;
		}

		return ret;
	};

	self.decode = function(data) {
		var messages = [], number, n;

		do {
			if (data.substr(0, 3) !== frame) return messages;

			data = data.substr(3);
			number = '', n = '';

			for (var i = 0, l = data.length; i < l; i++) {
				n = Number(data.substr(i, 1));

				if (data.substr(i, 1) == n) {
					number += n;
				} else {  
					data = data.substr(number.length + frame.length)
					number = Number(number);
					break;
				} 
			}

			messages.push(data.substr(0, number));
			data = data.substr(number);

		} while(data !== '');

		return messages;
	};
};

var WebSocketClient = require('websocket').client,
	extend = require('extend'),
	_tv = new TradingView();

_socket = new WebSocketClient();
 
_socket.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});
 
_socket.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
    	// console.log('message', message);
        if (message.type === 'utf8') {
        	console.log('message', message.utf8Data);
        	var messages = _tv.decode(message.utf8Data);

        	for (var i in messages) {
        		var message = JSON.parse(messages[i]);

	        	if ( 'session_id' in message ) {
		        	extend(_tv, message);
		        	_tv.init(connection);
	        	}
        	}
        }
    });
});
 
_socket.connect('https://data.tradingview.com/socket.io/websocket', '', "https://www.tradingview.com");