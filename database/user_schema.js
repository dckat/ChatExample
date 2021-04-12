// crypto 모듈 불러오기
var crypto = require('crypto');

var Schema = {};

Schema.createSchema = function(mongoose) {

	// 스키마 정의
	var UserSchema = mongoose.Schema({
		email: {type: String, 'default': ''},
		name: {type: String, index: 'hashed', 'default': ''},
		created_at: {type: Date, index: {unique: false}, 'default': Date.now},
		updated_at: {type: Date, index: {unique: false}, 'default': Date.now},
		provider: {type: String, 'default': ''},
		authToken: {type: String, 'default': ''},
		facebook: {}
	});

	UserSchema.path('email').validate(function(email) {
		return email.length;
	}, 'email 칼럼의 값이 없습니다.');

	UserSchema.static('findByEmail', function(email, callback) {
		return this.find({email: email}, callback);
	});

	UserSchema.static('findAll', function(callback) {
		return this.find({}, callback);``
	});
	
	console.log('UserSchema 정의함.');

	return UserSchema;
};

// module.exports에 UserSchema 객체 할당
module.exports = Schema;