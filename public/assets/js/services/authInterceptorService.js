"use strict";
app.factory("authInterceptorService", [
  "$q",
  "$injector",
  "$sessionStorage",
  function($q, $injector, $sessionStorage) {
    var $http,
      authInterceptorServiceFactory = {},
      _request = function(config) {
        config.headers = config.headers || {};
        var authData = $sessionStorage.authorizationData;
        return (
          authData &&
            (config.headers.Authorization = "Bearer " + authData.token),
          config
        );
      },
      _responseError = function(rejection) {
        var deferred = $q.defer();
        if (401 === rejection.status) {
          var authService = $injector.get("authService");
          authService.refreshToken().then(
            function(response) {
              _retryHttpRequest(rejection.config, deferred);
            },
            function() {
              authService.logOut();
              var state = $injector.get("$state");
              state.go("login.signin"), deferred.reject(rejection);
            }
          );
        } else deferred.reject(rejection);
        return deferred.promise;
      },
      _retryHttpRequest = function(config, deferred) {
        ($http = $http || $injector.get("$http")),
          $http(config).then(
            function(response) {
              deferred.resolve(response);
            },
            function(response) {
              deferred.reject(response);
            }
          );
      };
    return (
      (authInterceptorServiceFactory.request = _request),
      (authInterceptorServiceFactory.responseError = _responseError),
      authInterceptorServiceFactory
    );
  }
]);
