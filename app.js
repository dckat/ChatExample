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

// 클라이언트 연결시 처리
io.sockets.on('connection', function(socket) {
	console.log('connection info: ', socket.request.connection._peername);

	// 소켓 객체에 클라이언트 정보 속성 추가
	socket.remoteAddress = socket.request.connection._peername.address;
	socket.remotePort = socket.request.connection._peername.port;
});