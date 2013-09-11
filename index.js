var stream = require('stream');
var crypto = require('crypto');

module.exports = function vkontakte(request, clientID, clientSecret) {
  if (typeof clientID === 'undefined')
    throw new TypeError('Must specify either clientID/clientSecret pair or accessToken');

  if (typeof clientSecret !== 'undefined') {
    return byApp(request, clientID, clientSecret);
  }

  var accessToken = clientID;
  return byToken(request, accessToken);
};

function byToken(request, accessToken) {
  // authenticatedRequest(method, [params,] callback)
  return function authenticatedRequest(method, params, callback) {
    if (typeof params == 'function' || typeof params == 'undefined') {
      callback = params;
      params = {};
    }

    params.access_token = accessToken;
    params.param_v = params.v = '5.0';
    params.format = 'json';

    return request({
      uri: 'https://api.vk.com/method/' + method,
      qs: params
    }, handleResponse(callback));
  };
}

function byApp(request, clientID, clientSecret) {
  // signedRequest(method, [params, [httpMethod = 'GET',]] callback)
  return function signedRequest() {
    var _ref, _ref1;
    var method = arguments[0],
        opt = 2 <= arguments.length ? [].slice.call(arguments, 1) : [],
        callback = opt.pop(),
        params = (_ref = opt.shift()) != null ? _ref : {},
        httpMethod = (_ref1 = opt.shift()) != null ? _ref1 : 'GET';

    params.param_v = params.v = '5.0';
    params.format = 'json';
    params.api_id = clientID;
    params.method = method;
    params.sig = sign(params, clientSecret);

    return request({
      uri: 'http://api.vk.com/api.php',
      qs: params
    }, handleResponse(callback));
  };

  function sign(params, clientSecret) {
    // Compute the signature as MD5 of request parameters joined together
    // with a secret key, as described in VK API documentation.

    var keys = Object.keys(params).sort();

    var md5sum = crypto.createHash('md5');
    for (var i = 0; i < keys.length; i++) {
      md5sum.update('' + keys[i] + '=' + params[keys[i]], 'utf-8');
    }
    md5sum.update(clientSecret, 'utf-8');

    // Return a signature as a hex string of a MD5 hash.
    return md5sum.digest('hex');
  }
}

function handleResponse(cb) {
  if (typeof cb === 'undefined') return;
  
  return function (err, resp, body) {
    if (err) {
      return cb(err);
    }

    if (!body) {
      return cb('vk api returned empty result');
    }

    try {
      var result = JSON.parse(body);
    } catch (e) {
      return cb(e);
    }

    if (result.error) {
      return cb(result.error);
    }

    return cb(null, result.response);
  };
}
