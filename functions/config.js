
var Multivocal = require('multivocal');

var enResponse = {
  "Request.website.Intent.welcome": [
    {
      ShouldClose: true,
      Template: {
        Ssml: "Before we begin, I need you to log in on the website.",
        Text: "Before we begin, I need you to log in at {{Config.Setting.website}}.",
        Option: {
          Type: "Carousel",
          Items: [
            {
              Body: "Log in on the website",
              Url: "{{Config.Setting.website}}"
            }
          ]
        }
      }
    }
  ],

  "Intent.welcome": [
    {
      Base: {Set: true},
      ShouldClose: true
    },

    {
      Base: {Set: true},
      Criteria: "{{tooManyFiles}}"
    },
    "You have too many files for me to count.",
    "You have a lot of files!",

    {
      Base: {Set: true},
      Criteria: "{{not tooManyFiles}}"
    },
    "You have {{inflect fileCount 'file' 'files' true}} in Google Drive"
  ]
};

var requirements = {
  "Intent.welcome": "User/IsAuthenticated"
};

var config = {
  Local: {
    en: {
      Response: enResponse
    },
    und: {
      Requirements: requirements
    }
  }
};

var requestRequirementsWebsite = function( env ){
  return Multivocal.requestDefault( env, 'website' );
};

var Datastore = require('./datastore');

var loadUser = function( env ){
  return Datastore.getUser( env.id )
    .then( user => {
      env.user = user;
      return Promise.resolve( env );
    });
};

var rp = require('request-promise-native');

var loadTokens = function( env ){
  var now = Date.now();
  if( env.user.tokens.expires_after > now ){
    env.tokens = env.user.tokens;
    return Promise.resolve( env );
  }

  var settings = env.Config.Setting.codeExchange;

  var refreshToken = env.user.tokens.refresh_token;

  var body = {
    refresh_token: refreshToken,
    client_id:     settings.clientId,
    client_secret: settings.clientSecret,
    grant_type:    'refresh_token'
  };

  var options = {
    method: 'POST',
    uri:    settings.uri,
    form:   body,
    json:   true
  };

  return rp( options )
    .then( tokens => {
      tokens.refresh_token = refreshToken;
      env.tokens = tokens;
      return Datastore.saveUser( env.id, tokens );
    })
    .then( result => Promise.resolve( env ) );
};

var loadFileCount = function( env ){

  var accessToken = env.tokens.access_token;

  var options = {
    method: 'GET',
    uri: 'https://www.googleapis.com/drive/v3/files',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    qs: {
      pageSize: 100,
      fields: 'kind,nextPageToken,files/id'
    },
    json: true
  };
  return rp( options )
    .then( result => {
      env.fileCount    = result.files.length;
      env.tooManyFiles = result.nextPageToken ? true : false;
      return Promise.resolve( env );
    });
};

var handleFileCount = function( env ){
  env.id = env.User.Profile.sub;
  return loadUser( env )
    .then( env => loadTokens( env ) )
    .then( env => loadFileCount( env ) )
    .then( env => Multivocal.handleDefault( env ) );
};

var init = function(){
  new Multivocal.Config.Simple( config );
  new Multivocal.Config.Firebase();

  Multivocal.setRequirementRequest( "User/IsAuthenticated", requestRequirementsWebsite );
  Multivocal.addIntentHandler( "welcome", handleFileCount );
};
exports.init = init;