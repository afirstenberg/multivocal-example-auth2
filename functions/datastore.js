
var Multivocal = require('multivocal');
var db = Multivocal.Config.Firebase().db;

var saveUser = function( id, tokens, profile ){
  console.log('datastore id',id);
  var dbPath = db.ref('user').child(id);
  var obj = {};
  if( tokens ){
    obj.tokens = tokens;
  }
  if( profile ){
    obj.profile = profile;
  }
  return dbPath.update( obj );
};
exports.saveUser = saveUser;

var getUser = function( id ){
  var dbPath = db.ref('user').child(id);
  return dbPath.once('value')
    .then( snapshot => {
      return snapshot.val();
    });
};
exports.getUser = getUser;