"use strict";
app.controller("AppCtrl", [
  "$rootScope",
  "$scope",
  "$state",
  "$localStorage",
  "$window",
  "$document",
  "$timeout",
  "usSpinnerService",
  "authService",
  function(
    $rootScope,
    $scope,
    $state,
    $localStorage,
    $window,
    $document,
    $timeout,
    usSpinnerService,
    authService
  ) {
    $($window);
    ($scope.authentication = authService.authentication),
      $rootScope.$on("$stateChangeSuccess", function(
        event,
        toState,
        toParams,
        fromState,
        fromParams
      ) {
        $document.scrollTo(0, 0);
      }),
      angular.isDefined($localStorage.layout)
        ? ($scope.app.layout = $localStorage.layout)
        : ($localStorage.layout = $scope.app.layout),
      $scope.$watch(
        "app.layout",
        function() {
          $localStorage.layout = $scope.app.layout;
        },
        !0
      ),
      ($scope.toTheTop = function() {
        $document.scrollTopAnimated(0, 600);
      });
    var viewport = function() {
      var e = window,
        a = "inner";
      return (
        "innerWidth" in window ||
          ((a = "client"), (e = document.documentElement || document.body)),
        { width: e[a + "Width"], height: e[a + "Height"] }
      );
    };
    ($scope.getWindowDimensions = function() {
      return { h: viewport().height, w: viewport().width };
    }),
      $scope.$watch(
        $scope.getWindowDimensions,
        function(newValue, oldValue) {
          ($scope.windowHeight = newValue.h),
            ($scope.windowWidth = newValue.w),
            newValue.w >= 992
              ? ($scope.isLargeDevice = !0)
              : ($scope.isLargeDevice = !1),
            newValue.w < 992
              ? ($scope.isSmallDevice = !0)
              : ($scope.isSmallDevice = !1),
            newValue.w <= 768
              ? ($scope.isMobileDevice = !0)
              : ($scope.isMobileDevice = !1);
        },
        !0
      ),
      angular.element($window).bind("resize", function() {
        $scope.$applyAsync();
      });
  }
]);
