"use strict";
app.controller("editPageCtrl", [
  "toaster",
  "$state",
    "$stateParams",
  "ngAuthSettings",
  "authoringService",
  "SweetAlert",
  "$document",
  "$sessionStorage",
  function(
    toaster,
    $state,
      $stateParams,
      ngAuthSettings,
    authoringService,
    SweetAlert,
    $document,
    $sessionStorage
  ) {
      var vm = this;
      var serviceBase = ngAuthSettings.apiServiceBaseUri;
    (vm.page = {}),
      (vm.lesson = {}),
      (vm.course = {}),
      (vm.isCodeView = !1),
      (vm.froalaOptions = {
        requestHeaders: {
          Authorization: "Bearer " + $sessionStorage.authorizationData.token
        },
        requestWithCORS: !1,
        htmlAllowTags: [".*"],
        htmlRemoveTags: [""],
        iframe: 1,
        htmlAllowedAttrs: [".*"],
        htmlUntouched: 1,
        charCounterCount: !1,
        imageManagerDeleteMethod: "DELETE",
        toolbarInline: !1,
        tableStyles: { "table-striped": "Alternate Rows" },
        events: {
          "froalaEditor.commands.after": function(
            e,
            editor,
            cmd,
            param1,
            param2
          ) {
            "html" == cmd && (vm.isCodeView = !vm.isCodeView);
          }
        }
      }),
      vm.initControls,
      (vm.initialize = function(initControls) {
        vm.initControls = initControls;
      }),
      (vm.form = {
        submit: function(form) {
          var firstError = null;
          if (form.$invalid) {
            var field = null,
              firstError = null;
            for (field in form)
              "$" != field[0] &&
                (null !== firstError ||
                  form[field].$valid ||
                  (firstError = form[field].$name),
                form[field].$pristine && (form[field].$dirty = !0));
            return (
              angular.element(".ng-invalid[name=" + firstError + "]").focus(),
              void SweetAlert.swal({
                title:
                  "The form cannot be submitted because it contains validation errors",
                type: "error"
              })
            );
          }
          vm.isCodeView &&
            (vm.page.content = vm.froalaOptions.froalaEditor("codeView.get")),
            angular.isDefined(vm.page.id) ? vm.save() : vm.new();
        }
      }),
      (vm.new = function() {
        (vm.page.lessonId = vm.lesson.id),
          authoringService
            .createPage(vm.page)
            .success(function(response) {
              (vm.page = angular.copy(response)),
                toaster.pop("success", "Page created successfully");
            })
            .error(function(response) {
              SweetAlert.swal({
                title: "Create Failed",
                text: "http status code: " + response.status,
                type: "error",
                confirmButtonColor: "#007AFF"
              });
            });
      }),
      (vm.save = function() {
        authoringService
          .setPage(vm.page)
          .success(function(response) {
            toaster.pop("success", "Page updated successfully");
          })
          .error(function(response) {
            SweetAlert.swal({
              title: "Update Failed",
              text: "http status code: " + response.status,
              type: "error",
              confirmButtonColor: "#007AFF"
            });
          });
      }),
      (vm.init = function() {
        (vm.page = {}), $document.scrollTopAnimated(0, 600);
      }),
      (vm.getPage = function() {
        var id = $stateParams.id;
        $state.includes("app.authoring.page.create")
          ? authoringService.getLesson(id).success(function(data) {
              angular.copy(data.lesson, vm.lesson),
                angular.copy(data.course, vm.course),
                (vm.froalaOptions.imageManagerLoadURL =
                  serviceBase +"api/Author/Course/Images/" +
                  data.course.id),
                (vm.froalaOptions.imageManagerDeleteURL =
                  serviceBase +"api/Author/Course/Image/" +
                  data.course.id),
                (vm.froalaOptions.imageUploadURL =
                  serviceBase +"api/Author/Course/Image/" +
                  data.course.id),
                (vm.froalaOptions.fileUploadURL =
                  serviceBase +"api/Author/Course/Image/" +
                      data.course.id),
                  (vm.froalaOptions.videoUploadURL =
                      serviceBase + "api/Author/Course/Image/" +
                      data.course.id),
                vm.initControls.initialize();
            })
          : authoringService.getPage(id).success(function(data) {
              angular.copy(data.page, vm.page),
                angular.copy(data.lesson, vm.lesson),
                angular.copy(data.course, vm.course),
                (vm.froalaOptions.imageManagerLoadURL =
                  serviceBase +"api/Author/Course/Images/" +
                  data.course.id),
                (vm.froalaOptions.imageManagerDeleteURL =
                  serviceBase +"api/Author/Course/Image/" +
                  data.course.id),
                (vm.froalaOptions.imageUploadURL =
                  serviceBase +"api/Author/Course/Image/" +
                  data.course.id),
                (vm.froalaOptions.fileUploadURL =
                  serviceBase +"api/Author/Course/Image/" +
                      data.course.id),
                  (vm.froalaOptions.videoUploadURL =
                      serviceBase + "api/Author/Course/Image/" +
                      data.course.id),
                vm.initControls.initialize();
            });
      }),
      vm.getPage();
  }
]);
