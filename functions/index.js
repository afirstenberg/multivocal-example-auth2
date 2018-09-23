const Multivocal = require('multivocal');
const AuthCode = require('./authCode');

require('./config.js').init();

exports.webhook = Multivocal.processFirebaseWebhook;

exports.code = AuthCode.exchangeWebhook;