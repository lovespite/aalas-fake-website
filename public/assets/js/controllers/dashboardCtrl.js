"use strict";
app.controller("dashboardCtrl", [
  "$http",
  "$state",
  function($http, $state) {
    var vm = this;
    (vm.activity = []),
      (vm.content = []),
      $http
        .get(serviceBase + "api/dashboard")
        .success(function(data, status, headers, config) {
          angular.copy(data.news, vm.content),
              angular.copy(data.activity, vm.activity);
        })
        .error(function(data, status, headers, config) {
          vm.message = data.message + ":" + data.messageDetail;
        });
  }
]);
