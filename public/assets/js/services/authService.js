'use strict';
app.factory('authService', ['$q', '$injector','$sessionStorage', 'ngAuthSettings','$window', function ($q, $injector, $sessionStorage, ngAuthSettings, $window) {
    var serviceBase = ngAuthSettings.apiServiceBaseUri;
    var $http;
    var authServiceFactory = {};
    var _authentication = {
        isAuth: false
    };
    var _loginData={};
    var _saveRegistration = function (registration) {

        _logOut();

        $http = $http || $injector.get('$http');
        return $http.post(serviceBase + 'api/account/register', registration).then(function (response) {
            return response;
        });

    };
    var _login = function (loginData) {

        var data = $.param({"grant_type":"password","username": loginData.username ,"password": loginData.password});

        var deferred = $q.defer();

        $http = $http || $injector.get('$http');

        $http.post(serviceBase + 'token', data, {headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}})
            .then(function (response) {
            $sessionStorage.authorizationData= { token: response.data.access_token };
            _loginData={};
            _authentication.isAuth = true;
            deferred.resolve(response.data);

            })['catch'](function (response) {

            delete $sessionStorage.authorizationData;
                _authentication.isAuth = false;
            deferred.reject(response.data);
        });

        return deferred.promise;

    };
    var _forgot = function (email) {

        var deferred = $q.defer();

        $http = $http || $injector.get('$http');

        $http.post(serviceBase + 'api/forgot',email).success(function (response) {
            deferred.resolve(response);
        }).error(function (err, status) {
            _logOut();
            deferred.reject(err);
        });

        return deferred.promise;

    };
    var _usernameUnique = function (name) {

        var deferred = $q.defer();

        $http = $http || $injector.get('$http');

        $http.get(serviceBase + 'api/Member/Unique/'+name).success(function (response) {
            deferred.resolve(response);
        });

        return deferred.promise;

    };
    var _groupNameUnique = function (name) {

        var deferred = $q.defer();

        $http = $http || $injector.get('$http');

        $http.get(serviceBase + 'api/Group/Unique/'+name).success(function (response) {
            deferred.resolve(response);
        });

        return deferred.promise;

    };
    var _getGroup = function (accessCode) {
        var deferred = $q.defer();

        $http = $http || $injector.get('$http');
        var code = { accessCode: accessCode };
        $http.post(serviceBase + 'api/Group',code).success(function (response) {
            deferred.resolve(response);
        }).error(function (response) {

            deferred.reject(response);
        });
        

        return deferred.promise;

    };
    var _logOut = function () {
		var issso=$sessionStorage.authorizationData.sso;
        delete $sessionStorage.authorizationData;
                _authentication.isAuth = false;
	if(issso)
		$window.location.href = 'https://sso.aalaslearninglibrary.org/Shibboleth.sso/Logout';

    };
    var _fillAuthData = function () {

        var authData = $sessionStorage.authorizationData;
        if (authData) {
            _authentication.isAuth = true;


        }

    };

    var _refreshToken = function ()
    {
        var deferred = $q.defer();

        var authData = $sessionStorage.authorizationData;

        if (authData && authData.useRefreshTokens) {

            var data = "grant_type=refresh_token&refresh_token=" + authData.refreshToken + "&client_id=" + ngAuthSettings.clientId;

          delete  $sessionStorage.authorizationData;

            $http = $http || $injector.get('$http');
            $http.post(serviceBase + 'token', data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).success(function (response) {

                $sessionStorage.authorizationData( { token: response.access_token, username: response.username });

                deferred.resolve(response);

            }).error(function (err, status) {
                _logOut();
                deferred.reject(err);
            });
        } else {
            deferred.reject();
        }

        return deferred.promise;
    };

    authServiceFactory.saveRegistration = _saveRegistration;
    authServiceFactory.login = _login;
    authServiceFactory.getGroup = _getGroup;
    authServiceFactory.usernameUnique= _usernameUnique;
    authServiceFactory.groupNameUnique= _groupNameUnique;
    authServiceFactory.logOut = _logOut;
    authServiceFactory.forgot = _forgot;
    authServiceFactory.loginData=_loginData;
    authServiceFactory.fillAuthData = _fillAuthData;
    authServiceFactory.authentication = _authentication;
    authServiceFactory.refreshToken=_refreshToken;
    return authServiceFactory;
}]);