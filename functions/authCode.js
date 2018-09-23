
var Multivocal = require('multivocal');
var datastore = require('./datastore');
var rp = require('request-promise-native');

var buildEnv = function( request, response ){

  return Multivocal.getConfig()
    .then( config => {
      console.log('config',config);
      var env = {
        Config: config,
        Request:  request,
        Response: response,
        Body: request.body,
        code: request.body.code
      };
      return Promise.resolve( env );
    });
};

var loadTokens = function( env ){

  var settings = env.Config.Setting.codeExchange;

  var body = {
    code:          env.code,
    client_id:     settings.clientId,
    client_secret: settings.clientSecret,
    redirect_uri:  settings.redirectUri,
    grant_type:    settings.grantType || 'authorization_code'
  };

  var options = {
    method: 'POST',
    uri:    settings.uri,
    form:   body,
    json:   true
  };

  return rp( options )
    .then( tokens => {
      env.tokens = tokens;
      return Promise.resolve( env );
    });
};

var loadUserinfo = function( env ){
  var settings = env.Config.Setting.userinfo;

  console.log('tokens',typeof env.tokens,env.tokens);
  var accessToken = env.tokens['access_token'];
  console.log('access token',accessToken);

  var options = {
    method: 'GET',
    uri:    settings.uri,
    headers: {
      "Authorization": `Bearer ${accessToken}`
    },
    json: true
  };

  return rp( options )
    .then( profile => {
      console.log('profile',profile);
      env.profile = profile;
      env.id = profile.id;
      return Promise.resolve( env );
    });

};

var saveUser = function( env ){
  return datastore.saveUser( env.id, env.tokens, env.profile )
    .then( result => Promise.resolve(env) );
};

var returnResult = function( env ){
  var response = env.Response;
  var body = {
    result: "OK",
    profile: env.profile
  };
  response.json( body );
  return Promise.resolve( env );
};

var returnError = function( response, err ){
  console.error( 'err', err );
  var body = {
    result: "error",
    err: err
  };
  response.json( body );
  return Promise.resolve( {} );
};

const FirebaseFunctions = require('firebase-functions');
var exchangeWebhook = FirebaseFunctions.https.onRequest( (request,response) => {
  return buildEnv( request, response )
    .then( env => loadTokens( env ) )
    .then( env => loadUserinfo( env ) )
    .then( env => saveUser( env ) )
    .then( env => returnResult( env ) )
    .catch( err => returnError( response, err ) );
});


exports.exchangeWebhook = exchangeWebhook;