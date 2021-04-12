// Express 기본 모듈 불러오기
var express = require('express');
var http = require('http');
var path = require('path');

// Express 미들웨어 불러오기
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var static = require('serve-static');
var errorHandler = require('errorhandler');

// 오류 핸들러 모듈 사용
var expressErrorHandler = require('express-error-handler');

// Session 미들웨어 불러오기
var expressSession = require('express-session');

// 몽고디비 모듈 사용
var MongoClient = require('mongodb').MongoClient;

// mongoose 모듈 불러오기
var mongoose = require('mongoose');

// socket.io 모듈 불러오기
var socketio = require('socket.io');

// 설정 관련 모듈 불러오기
var config = require('./config');
var database_loader = require('./database/database');
var route_loader = require('./routes/route_loader');

// Passport 사용
var passport = require('passport');
var flash = require('connect-flash');

// cors 사용
var cors = require('cors');

// 데이터베이스 객체를 위한 변수 선언
var database;

// 데이터베이스 스키마 객체를 위한 변수 선언
var UserSchema;

// 데이터베이스 모델 객체를 위한 변수 선언
var UserModel;

// 익스프레스 객체 생성
var app = express();

// 기본 속성 설정
app.set('port', process.env.PORT || 3000);
app.set('database', database);

// 뷰 엔진 설정
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
console.log('뷰 엔진이 ejs로 설정되었습니다.');

// body-parser를 사용해 application/x-www-form-urlencoded 파싱
app.use(bodyParser.urlencoded({ extended: false }));

// body-parser를 사용해 application/json 파싱
app.use(bodyParser.json());

// public 폴더를 static으로 오픈
app.use('/public', static(path.join(__dirname, 'public')));

// cookie-parser 설정
app.use(cookieParser());

// 세션 설정
app.use(expressSession({
	secret: 'my key',
	resave: true,
	saveUninitialized: true
}));

// Passport 사용 설정
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// cors를 미들웨어로 등록
app.use(cors());

var configPassport = require('./config/passport');
configPassport(app, passport);

// 라우팅 설정
var userPassport = require('./routes/user_passport');
userPassport(app, passport);

// ===== 404 오류 페이지 처리 ===== //
var errorHandler = expressErrorHandler({
	static: {
		'404': './public/404.html'
	}
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

// ===== 서버 시작 ===== //
var server = http.createServer(app).listen(app.get('port'), function() {
	console.log('서버가 시작되었습니다. 포트 : ' + app.get('port'));

	// 데이터베이스 연결
	database_loader.init(app, config);
});

// socket.io 서버 시작
var io = socketio.listen(server);
console.log('socket.io 요청을 받아들일 준비가 되었습니다.');

// 로그인 아이디 매핑
var login_ids = {};

// 클라이언트 연결시 처리
io.sockets.on('connection', function(socket) {
	console.log('connection info: ', socket.request.connection._peername);

	// 소켓 객체에 클라이언트 정보 속성 추가
	socket.remoteAddress = socket.request.connection._peername.address;
	socket.remotePort = socket.request.connection._peername.port;

	// message 이벤트 처리
	socket.on('message', function(message) {
		console.log('message 이벤트를 받았습니다.');
		console.dir(message);

		// 모든 클라이언트
		if (message.recepient == 'ALL') {
			console.dir('나를 포함한 모든 클라이언트에게 message 이벤트를 전송합니다.');
			io.sockets.emit('message', message);
		}
		// 일대일 채팅
		else {
			if (login_ids[message.recepient]) {
				io.sockets.connected[login_ids[message.recepient]].emit('message', message);

				// 응답 메시지 전송
				sendResponse(socket, 'message', '200', '메시지를 전송했습니다.');
			}
			// 상대방을 찾을 수 없는 경우
			else {
				sendResponse(socket, 'login', '404', '상대방의 로그인 ID를 찾을 수 없습니다.');
			}
		}
	});

	// login 이벤트 처리
	socket.on('login', function(login) {
		console.log('login 이벤트를 받았습니다.');
		console.dir(login);

		// 기존 클라이언트 ID가 없을 경우 추가
		console.log('접속한 소켓의 ID: ' + socket.id);
		login_ids[login.id] = socket.id;
		socket.login_id = login.id;

		console.log('접속한 클라이언트의 ID 개수: %d', Object.keys(login_ids).length);

		// 응답 메시지 전송
		sendResponse(socket, 'login', '200', '로그인되었습니다.');
	});

	// response 이벤트 처리
	socket.on('response', function(response) {
		console.log(JSON.stringify(response));
		println('응답 메시지를 받았습니다: ' + response.command, ', ' + response.code + ', ' +
			response.message);
	});
});

// 응답 메시지 전송
function sendResponse(socket, command, code, message) {
	var statusObj = {command: command, code: code, message: message};
	socket.emit('response', statusObj);
}