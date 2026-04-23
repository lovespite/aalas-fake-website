"use strict"; app.factory("examService", ["$http", "ngAuthSettings", "$state", "$stateParams", "$q", "$sce", function ($http, ngAuthSettings, $state, $stateParams, $q, $sce) {
    function saveAnswer(examId, questionId, answer) {
        return $http.post(serviceBase + "api/Exam/SaveAnswer/" + examId + "/" + questionId + "/" + answer)
            .success(function (response) { })
            .error(function (err) { })
    } function saveMultipleAnswer(examId, questionId, answer) {
        return $http.post(serviceBase + "api/Exam/SaveMultipleAnswer/" + examId + "/" + questionId, answer)
            .success(function (response) { })
            .error(function (err) { })
    }
    function reviewExam(id) {
        return $http.get(serviceBase + "api/Review/Exam/" + id)
            .success(function (data, status, headers, config) { })
    }
    function generateExam(id) {
        return $state.includes("app.library.examresume") ? $http.get(serviceBase + "api/Exam/Resume/" + id)
            .success(function (data, status, headers, config) { }) : $http.get(serviceBase + "api/Course/" + id + "/GenerateExam")
            .success(function (data, status, headers, config) { })
    }
    function getPracticeExam(id) {
        return $http.get(serviceBase + "api/Lesson/PracticeQuestions/" + id)
            .success(function (data, status, headers, config) { })
    }
    function getExam(id) {
        return $http.get(serviceBase + "api/Exam/" + id);
    }
    function scoreExam(exam) {
        return $http.post(serviceBase + "api/Exam/ScoreExam", exam)
            .success(function (response) { }).error(function (err) { })
    }
    var serviceBase = ngAuthSettings.apiServiceBaseUri,
        service = { getExam: getExam, getPracticeExam: getPracticeExam, scoreExam: scoreExam, generateExam: generateExam, saveAnswer: saveAnswer, reviewExam: reviewExam, saveMultipleAnswer: saveMultipleAnswer };
    return service
}]);