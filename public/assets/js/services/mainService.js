"use strict";
app.factory("mainService", [
  "$http",
  "ngAuthSettings",
    function ($http, ngAuthSettings) {
        function removeRACE() {
            return $http
                .post(serviceBase + "api/removeRACE");
        }
    function getCatalog() {
      return $http
        .get(serviceBase + "api/Catalog")
        .success(function(data) {
          angular.copy(data.libraries, service.libraries),
            angular.copy(data.groupCourses, service.groupCourses),
            angular.copy(data.tracks, service.tracks),
            angular.copy(data.certs, service.certs),
            angular.copy(data.free, service.free),
            angular.copy(data.race, service.race);
        })
        .error(function(response) {});
    }
    function getAssignments() {
      return $http
        .get(serviceBase + "api/Assignments")
        .success(function(data) {
          angular.copy(data, service.assignments);
        })
        .error(function(response) {});
    }
    function setRoles(roles, subscription, group) {
      (service.roles.superUser = !1),
        (service.roles.admin = !1),
        (service.roles.coordinator = !1),
        (service.roles.monitor = !1),
        (service.roles.author = !1),
        roles.indexOf("Author") > -1 &&
          subscription.hasCustomCourses &&
          "individual" !== group.type &&
          "free" !== group.type &&
          (service.roles.author = !0),
        roles.indexOf("Monitor") > -1 &&
          "individual" !== group.type &&
          "free" !== group.type &&
          (service.roles.monitor = !0),
        roles.indexOf("Coordinator") > -1 &&
          "individual" !== group.type &&
          "free" !== group.type &&
          ((service.roles.coordinator = !0),
          (service.roles.monitor = !0),
          (service.roles.author = !0)),
        roles.indexOf("Admin") > -1 &&
          "individual" !== group.type &&
          "free" !== group.type &&
          ((service.roles.admin = !0),
          (service.roles.coordinator = !0),
          (service.roles.monitor = !0),
          (service.roles.author = !0)),
        roles.indexOf("SuperUser") > -1 &&
          "individual" !== group.type &&
          "free" !== group.type &&
          ((service.roles.superUser = !0),
          (service.roles.admin = !0),
          (service.roles.coordinator = !0),
          (service.roles.monitor = !0),
          (service.roles.author = !0));
    }
    function updateTermsAccepted(val) {
          return $http.put(serviceBase + "api/Member/UpdateTermsAccepted/" + val);
      }
    function getSubscriptionInfo() {
      return $http
        .get(serviceBase + "api/SubscriptionInfo")
        .then(function(response) {
            angular.copy(response.data.group, service.group),
                angular.copy(response.data.member, service.member),
                angular.copy(response.data.coordinator, service.coordinator),
                angular.copy(response.data.subscription, service.subscription),
                setRoles(response.data.roles, response.data.subscription, response.data.group);
        });
    }
    var serviceBase = ngAuthSettings.apiServiceBaseUri,
    service = {
        libraries: [],
        tracks: [],
        groupCourses: [],
        free: [],
        certs: [],
        race: [],
        assignments: [],
        group: { type: "individual" },
        member: {},
        roles: {},
        coordinator: {},
        subscription: {},
        getCatalog: getCatalog,
        removeRACE: removeRACE,
        getSubscriptionInfo: getSubscriptionInfo,
          getAssignments: getAssignments,
          updateTermsAccepted: updateTermsAccepted
      };
    return service;
  }
]);
