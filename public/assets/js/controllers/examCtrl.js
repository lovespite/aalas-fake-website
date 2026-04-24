"use strict";
app.controller("examCtrl", ["$scope", "$filter", "$http", "$uibModal", "toaster", "ngAuthSettings", "$stateParams", "$state", "examService", "SweetAlert", function ($scope, $filter, $http, $uibModal, toaster, ngAuthSettings, $stateParams, $state, examService, SweetAlert) {
    var vm = this;
    vm.exam = {};
    vm.scoreExam = function () {
        examService.scoreExam(vm.exam)
            .then(function (response) {
                $state.go($state.current.parent + ".examresults", { id: vm.exam.id })
            })
        ["catch"](function (response) {
            SweetAlert.swal({ title: "Error Scoring Exam", text: response, type: "error", confirmButtonColor: "#DD6B55" }, function () { null === $state.previous || $state.includes("login") ? $state.go("app.dashboard") : $state.go($state.previous) })
        })
    };
    vm.feedback = function () { var modalInstance = $uibModal.open({ templateUrl: "/assets/views/partials/feedback.html", controller: "feedbackCtrl", resolve: { title: function () { return "Final Exam" }, id: function () { return $stateParams.id }, type: function () { return "Exam" } } }); modalInstance.result.then(function () { toaster.pop("success", "Comment saved successfully") }) }, vm.saveAnswer = function (examId, questionId, answer) { examService.saveAnswer(examId, questionId, answer).success(function () { }) }, vm.saveMultipleAnswer = function (examId, questionId) { var answer = $filter("filter")(vm.exam.questions, { id: questionId }, !0)[0]; examService.saveMultipleAnswer(examId, questionId, answer.answers).success(function () { }) }, vm.generateExam = function () { var id = $stateParams.id; examService.generateExam(id).success(function (exam) { vm.exam = exam }) }, vm.generateExam()
}]);