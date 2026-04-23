"use strict";
app.controller("navCtrl", [
    "$scope",
    "$rootScope",
  "$http",
    "$state",
  "$window",
  "SweetAlert",
  "ngAuthSettings",
  "mainService",
    function ($scope, $rootScope, $http, $state, $window, SweetAlert, ngAuthSettings, mainService) {
        $scope.$state = $state;
        var vm = this;
        ($scope.tracks = mainService.tracks),
            ($scope.libraries = mainService.libraries),
            ($scope.free = mainService.free),
            ($scope.race = mainService.race),
            ($scope.certs = mainService.certs),
            ($scope.groupCourses = mainService.groupCourses),
            ($scope.member = { avatar: "assets/images/default-user.png" }),
            ($scope.group = mainService.group),
            ($scope.roles = mainService.roles),
            ($scope.assignments = mainService.assignments),
            ($scope.subscription = mainService.subscription),
            ($scope.avatar = function () {
                return mainService.member.avatar
                    ? "/images/avatars/" +
                    mainService.member.avatar
                    : "/assets/images/default-user.png";
            }),
            ($scope.coordinator = mainService.coordinator),
            ($scope.getCatalog = function () {
                mainService.getCatalog();
            }),
            ($scope.getAssignments = function () {
                mainService.getAssignments();
            }),
            ($scope.select = function (item) {
                $scope.selected = item;
            }),
            ($scope.isActive = function (item) {
                return $scope.selected === item;
            }),
            $scope.getSubscriptionInfo = function () {
                if ($scope.member = mainService.member, mainService.subscription.message)
                    if ("None" !== mainService.subscription.action) {
                        var title;
                        var cancelButton = 'Close';
                        var confirmButtonColor = '#DD6B55';
                        switch (mainService.subscription.action) {
                            case "app.subscriptions":
                                title = "Review";
                                break;
                            case "app.coordinator.upgrade":
                                title = "Upgrade";
                                break;
                            case "app.removeRACE":
                                cancelButton = "Turn Off";
                                title = 'Keep RACE';
                                confirmButtonColor = "#5cb85c";
                                break;
                            default:
                                title = "Renew";
                        }
                        SweetAlert.swal({ title: mainService.subscription.message || "", text: mainService.subscription.messageDetail, type: "warning", showCancelButton: !0, cancelButtonText: cancelButton, confirmButtonColor: confirmButtonColor, confirmButtonText: title },
                            function (isConfirm) {
                                if (isConfirm) {
                                    if (mainService.subscription.action !== "app.removeRACE")
                                    $state.go(mainService.subscription.action, { id: mainService.subscription.id });
                                }
                                    else {
                                        if (mainService.subscription.action === "app.removeRACE") {
                                            SweetAlert.swal({
                                                title: "Are you sure?",
                                                text: "You will be unable to earn RACE CEs for the remainder of this subscription.",
                                                type: "warning", showCancelButton: !0,
                                                cancelButtonText: "Confirm RACE Cancellation",
                                                confirmButtonColor: "#DD6B55",
                                                confirmButtonText: "Keep RACE",
                                            }, function (isConfirm) {
                                                if (isConfirm)
                                                    return;
                                                else
                                                    vm.removeRACE();
                                            });
                                        }}
                            })
                    }
                    else
                        SweetAlert.swal({ title: mainService.subscription.message, text: mainService.subscription.messageDetail, type: "warning" })
            },
            ($scope.gotoAuthoring = function () {
                $scope.group.id === 100
                    ? $state.go("app.authoring.libraries")
                    : $state.go("app.authoring.courses", { id: $scope.group.seriesId });
            }),
            vm.removeRACE = function () {
            mainService.removeRACE();
            mainService.member.race = false;
            mainService.subscription.profileComplete = true;
            };
            $scope.getCatalog();
        $scope.getSubscriptionInfo();
      $scope.getAssignments();
  }
]);
