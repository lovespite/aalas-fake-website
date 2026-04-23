app.controller("examResultsCtrl", ["$stateParams", "$state", "examService", "SweetAlert", "mainService", function ( $stateParams, $state, examService, SweetAlert, mainService) {
    var vm = this;
    vm.exam = {};
    vm.getExam = function () {
        var id = $stateParams.id;
        examService.getExam(id)
            .then(function (response) {
                vm.exam = response.data;
                mainService.getAssignments();
            })
        ["catch"](function (response) {
                SweetAlert.swal({
                    title: "Error reviewing exam", text: response,
                    type: "error", confirmButtonColor: "#DD6B55"
                }, function () { null === $state.previous || $state.includes("login") ? $state.go("app.dashboard") : $state.go($state.previous) })
            })
    };
    vm.getExam()
}]);