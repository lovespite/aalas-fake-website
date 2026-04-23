'use strict';
app.controller('practiceExamCtrl', ['$scope','$state','$filter','$stateParams','examService', function ($scope,$state,$filter,$stateParams,examService) {
    var vm=this;
    vm.exam={};

    vm.getPracticeExam = function () {
        var id = $stateParams.id;
        examService.getPracticeExam(id)
            .success(function (exam) {
                vm.exam=exam;
            })

    };
    vm.nextLesson= function() {
        var statePrefix;
        statePrefix=$state.current.parent;
        if($scope.app.layout.showAll)
            $state.go(statePrefix+'.lesson',{id:vm.exam.nextLesson});
        else
            $state.go(statePrefix+'.page',{id:vm.exam.nextLesson});
    }
    vm.gotoLesson= function() {
        var statePrefix;
        statePrefix=$state.current.parent;
        if($scope.app.layout.showAll)
            $state.go(statePrefix+'.lesson',{id:$stateParams.id});
        else
            $state.go(statePrefix+'.page',{id:$stateParams.id});
    }
    vm.gotoExam= function() {
        var statePrefix;
        statePrefix=$state.current.parent;
        $state.go(statePrefix+'.exam',{id:vm.exam.courseId});
    }
    vm.getPracticeExam();
    vm.checkAnswer=function(question,answer) {
        question.correct=answer;
        question.showFeedback=true;
    }
    vm.checkMultipleAnswer=function(question) {

        var answers=$filter('filter')(question.answers, {response: true, checked: '!true'}).length;
        answers=answers+$filter('filter')(question.answers, {response: false, checked: true},true).length;
        question.correct=!answers;
        question.showFeedback=true;
    }
}]);