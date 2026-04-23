'use strict';
app.controller('questionCtrl', ['$filter','$document','toaster', '$http', 'ngAuthSettings', '$stateParams','$uibModal', '$state','examService', function ($filter,$document,toaster, $http, ngAuthSettings, $stateParams,$uibModal, $state,examService) {
    var serviceBase = ngAuthSettings.apiServiceBaseUri;
    var vm=this;
    vm.exam={};
    vm.items=[];
    vm.itemTotal;
    vm.itemsPerPage = 1;
    vm.currentQuestion = 0;
    vm.setQuestion = function(n) {
        vm.currentQuestion = n;
        vm.toTheTop();
    };
    vm.prevQuestion = function() {
        if (vm.currentQuestion > 0) {
            vm.currentQuestion--;
        }
    };
    vm.markedCount = function () {
        return $filter('filter')(vm.items, { mark: true }, true).length;
    };
    vm.unansweredCount = function () {
        var i = 0;
        angular.forEach(vm.items, function (item, key) {
            if (item.type !== 2 && item.response == 0) i++;
            if (item.type === 2) {
                var p = 0;
                angular.forEach(item.answers, function (answer, key) {
                    if (answer.response) p++;
                });
                if (p === 0) i++;
            }
        });
        return i;
    };
    vm.prevQuestionVisible = function() {
        return vm.currentQuestion === 0 ? false : true;
    };
    vm.nextQuestion = function() {
        if (vm.currentQuestion < vm.questionCount()) {
            vm.currentQuestion++;
        }
    };
    vm.nextQuestionVisible = function() {
        return vm.currentQuestion == vm.questionCount() ? false : true;
    };
    vm.questionCount = function() {
        return Math.ceil(vm.items.length)-1;
    };
    vm.toTheTop = function () {

        $document.scrollTopAnimated(0, 600);

    };
    vm.range = function() {
        var rangeSize = Math.min(9, vm.questionCount()+1);
        var ret = [];
        var start;

        start = vm.currentQuestion;
        if ( start > vm.questionCount()-rangeSize ) {
            start = vm.questionCount()-rangeSize+1;
        }

        for (var i=start; i<start+rangeSize; i++) {
            ret.push(i);
        }
        return ret;
    };
    vm.scoreExam = function () {
        examService.scoreExam(vm.exam)
            .success(function (response) {
                $state.go($state.current.parent+'.examresults',{id:vm.exam.id})

            });
    };
    vm.saveAnswer=function(examId,questionId,answer){
        examService.saveAnswer(examId,questionId,answer)
            .success(function () {
            })
    }
    vm.saveMultipleAnswer=function(examId,questionId){
        var answer=$filter('filter')(vm.items, {id: questionId},true)[0];
        examService.saveMultipleAnswer(examId,questionId,answer.answers)
            .success(function () {
            })
    }

    vm.generateExam = function () {
        var id = $stateParams.id;
        examService.generateExam(id)
            .success(function (exam) {
                angular.copy(exam,vm.exam);
                angular.copy(exam.questions,vm.items);
                vm.itemTotal=exam.questions.length;
            })

    };

    vm.generateExam();
    vm.feedback=function() {
        var modalInstance = $uibModal.open({
            templateUrl: '/assets/views/partials/feedback.html',
            controller: 'feedbackCtrl',
            resolve: {
                title:  function(){
                    return vm.items[vm.currentQuestion].title;
                },
                id: function () {
                    return vm.items[vm.currentQuestion].id;
                },
                type: function () {
                    return 'Question';
                }
            }
        });
        modalInstance.result.then(function () {
            toaster.pop('success', 'Comment saved successfully');
        });
    }
}]);