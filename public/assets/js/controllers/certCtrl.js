"use strict";app.controller("certCtrl",["$scope","$http","ngAuthSettings","$stateParams","$state","courseService","mainService","SweetAlert","FileSaver",function($scope,$http,ngAuthSettings,$stateParams,$state,courseService,mainService,SweetAlert,FileSaver){var vm=(ngAuthSettings.apiServiceBaseUri,this);vm.cert={},vm.member=mainService.member,vm.getCourse=function(){var id=$stateParams.id;courseService.getCert(id).success(function(cert){vm.cert=cert}).error(function(err,status){SweetAlert.swal({title:err,type:"error",confirmButtonColor:"#DD6B55"},function(){null===$state.previous||$state.includes("login")?$state.go("app.dashboard"):$state.go($state.previous)})})},

    vm.getTrainingCertificate=function(id){
        $http({
            url: serviceBase + 'api/Certificates/Training/'+id,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: {
                'Content-type': 'application/json',
                'Accept': 'application/pdf'
            }
        }).success(function(data){
            var blob = new Blob([data], {
                type: 'application/pdf'
            });
            FileSaver.saveAs(blob, 'TrainingCertificate.pdf');
        }).error(function(){
            //Some error log
        });

    },

vm.getCourse()}]);