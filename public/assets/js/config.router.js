'use strict';
app.config(['$stateProvider', '$urlRouterProvider', '$controllerProvider', '$compileProvider', '$filterProvider', '$provide', '$ocLazyLoadProvider', 'JS_REQUIRES', '$locationProvider',
    function ($stateProvider, $urlRouterProvider, $controllerProvider, $compileProvider, $filterProvider, $provide, $ocLazyLoadProvider, jsRequires, $locationProvider) {

        app.controller = $controllerProvider.register;
        app.directive = $compileProvider.directive;
        app.filter = $filterProvider.register;
        app.factory = $provide.factory;
        app.service = $provide.service;
        app.constant = $provide.constant;
        app.value = $provide.value;
        $ocLazyLoadProvider.config({
            debug: false,
            events: true,
            modules: jsRequires.modules
        });
        // APPLICATION ROUTES
        // -----------------------------------
        // For any unmatched url, redirect to /signin
        $urlRouterProvider.otherwise(function ($injector, $location) {
            var $state = $injector.get("$state");
            $state.go("login.signin");
        });
        // $urlRouterProvider.otherwise("/login/signin");
        //
        // Set up the states
        $stateProvider.state('app', {
            url: "/app",
            templateUrl: "/assets/views/app.html",
            controller: "navCtrl",
            resolve: {
                scripts: loadSequence('modernizr', 'angular-notification-icons', 'moment', 'angularMoment', 'uiSwitch', 'perfect-scrollbar-plugin', 'toaster', 'ngAside', 'vAccordion', 'mainService', 'navCtrl').deps,
                init: function (mainService) {
                    return mainService.getSubscriptionInfo();
                }                
            },
            abstract: true
        }).state('autologin', {
            url: "/autologin",
            controller: 'autologinCtrl',
            resolve: loadSequence('autologinCtrl')
        }).state('app.cert', {
            url: "/cert/:id",
            templateUrl: "/assets/views/cert.html",
            controller: "certCtrl",
            controllerAs: "view",
            resolve: loadSequence('mainService', 'courseService', 'certCtrl', 'ngFileSaver')
        }).state('app.library', {
            url: '/library',
            template: '<div ui-view class="bg-light-grey"></div>'
        }).state('app.library.course', {
            parent: "app.library",
            url: "/course/:id",
            templateUrl: "/assets/views/course.html",
            controller: "courseCtrl",
            controllerAs: "view",
            resolve: loadSequence('courseService', 'courseCtrl')
        }).state('app.library.lesson', {
            parent: "app.library",
            url: "/lesson/:id",
            templateUrl: "/assets/views/lesson.html",
            controller: "lessonCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'lessonCtrl', 'feedbackCtrl')
        }).state('app.library.page', {
            parent: "app.library",
            url: "/page/:id",
            templateUrl: "/assets/views/page.html",
            controller: "pageCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'pageCtrl', 'feedbackCtrl')
        }).state('app.library.practice', {
            parent: "app.library",
            url: "/course/practice/:id",
            templateUrl: "/assets/views/practiceExam.html",
            controller: "practiceExamCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'practiceExamCtrl')
        }).state('app.library.exam', {
            parent: "app.library",
            url: "/exam/:id",
            templateUrl: "/assets/views/exam.html",
            controller: "examCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examCtrl', 'feedbackCtrl')
        }).state('app.library.question', {
            parent: 'app.library',
            url: "/question/:id",
            templateUrl: "/assets/views/question.html",
            controller: "questionCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'questionCtrl', 'feedbackCtrl')
        }).state('app.library.examresume', {
            parent: 'app.library',
            url: "/exam/resume/:id",
            templateUrl: "/assets/views/exam.html",
            controller: "examCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examCtrl')
        }).state('app.library.examresults', {
            parent: 'app.library',
            url: "/exam/results/:id",
            templateUrl: "/assets/views/exam_results.html",
            controller: "examResultsCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examResultsCtrl')
        }).state('app.track', {
            url: '/Track',
            template: '<div ui-view class="bg-light-grey"></div>'
        }).state('app.track.course', {
            parent: 'app.track',
            url: "/course/:id",
            templateUrl: "/assets/views/course.html",
            controller: "courseCtrl",
            controllerAs: "view",
            resolve: loadSequence('courseService', 'courseCtrl')
        }).state('app.track.lesson', {
            parent: 'app.track',
            url: "/lesson/:id",
            templateUrl: "/assets/views/lesson.html",
            controller: "lessonCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'lessonCtrl', 'feedbackCtrl')
        }).state('app.track.page', {
            parent: 'app.track',
            url: "/page/:id",
            templateUrl: "/assets/views/page.html",
            controller: "pageCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'pageCtrl', 'feedbackCtrl'),
        }).state('app.track.practice', {
            parent: 'app.track',
            url: "/course/practice/:id",
            templateUrl: "/assets/views/practiceExam.html",
            controller: "practiceExamCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'practiceExamCtrl')
        }).state('app.track.exam', {
            parent: 'app.track',
            url: "/exam/:id",
            templateUrl: "/assets/views/exam.html",
            controller: "examCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examCtrl', 'feedbackCtrl')
        }).state('app.track.question', {
            parent: 'app.track',
            url: "/question/:id",
            templateUrl: "/assets/views/question.html",
            controller: "questionCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'questionCtrl', 'feedbackCtrl')
        }).state('app.track.examresults', {
            parent: 'app.track',
            url: "/exam/results/:id",
            templateUrl: "/assets/views/exam_results.html",
            controller: "examResultsCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examResultsCtrl')
        }).state('app.customCourse', {
            url: '/customCourse',
            template: '<div ui-view class="bg-light-grey"></div>'
        }).state('app.customCourse.course', {
            parent: 'app.customCourse',
            url: "/course/:id",
            templateUrl: "/assets/views/course.html",
            controller: "courseCtrl",
            controllerAs: "view",
            resolve: loadSequence('courseService', 'courseCtrl')
        }).state('app.customCourse.lesson', {
            parent: 'app.customCourse',
            url: "/lesson/:id",
            templateUrl: "/assets/views/lesson.html",
            controller: "lessonCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'lessonCtrl', 'feedbackCtrl')
        }).state('app.customCourse.page', {
            parent: 'app.customCourse',
            url: "/page/:id",
            templateUrl: "/assets/views/page.html",
            controller: "pageCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'pageCtrl', 'feedbackCtrl'),
        }).state('app.customCourse.practice', {
            parent: 'app.customCourse',
            url: "/course/practice/:id",
            templateUrl: "/assets/views/practiceExam.html",
            controller: "practiceExamCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'practiceExamCtrl')
        }).state('app.customCourse.exam', {
            parent: 'app.customCourse',
            url: "/exam/:id",
            templateUrl: "/assets/views/exam.html",
            controller: "examCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examCtrl', 'feedbackCtrl')
        }).state('app.customCourse.question', {
            parent: 'app.customCourse',
            url: "/question/:id",
            templateUrl: "/assets/views/question.html",
            controller: "questionCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'questionCtrl', 'feedbackCtrl')
        }).state('app.customCourse.examresults', {
            parent: 'app.customCourse',
            url: "/exam/results/:id",
            templateUrl: "/assets/views/exam_results.html",
            controller: "examResultsCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examResultsCtrl')
        }).state('app.free', {
            url: '/Free',
            template: '<div ui-view class="bg-light-grey"></div>'
        }).state('app.free.course', {
            parent: 'app.free',
            url: "/course/:id",
            templateUrl: "/assets/views/course.html",
            controller: "courseCtrl",
            controllerAs: "view",
            resolve: loadSequence('courseService', 'courseCtrl')
        }).state('app.free.lesson', {
            parent: 'app.free',
            url: "/lesson/:id",
            templateUrl: "/assets/views/lesson.html",
            controller: "lessonCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'lessonCtrl', 'feedbackCtrl')
        }).state('app.free.page', {
            parent: 'app.free',
            url: "/page/:id",
            templateUrl: "/assets/views/page.html",
            controller: "pageCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'pageCtrl', 'feedbackCtrl')
        }).state('app.free.practice', {
            parent: 'app.free',
            url: "/course/practice/:id",
            templateUrl: "/assets/views/practiceExam.html",
            controller: "practiceExamCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'practiceExamCtrl')
        }).state('app.free.exam', {
            parent: 'app.free',
            url: "/exam/:id",
            templateUrl: "/assets/views/exam.html",
            controller: "examCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examCtrl', 'feedbackCtrl')
        }).state('app.free.question', {
            parent: 'app.free',
            url: "/question/:id",
            templateUrl: "/assets/views/question.html",
            controller: "questionCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'questionCtrl', 'feedbackCtrl')
        }).state('app.free.examresults', {
            parent: 'app.free',
            url: "/exam/results/:id",
            templateUrl: "/assets/views/exam_results.html",
            controller: "examResultsCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examResultsCtrl')
        }).state('app.race', {
            url: '/RACE',
            template: '<div ui-view class="bg-light-grey"></div>'
        }).state('app.race.course', {
            parent: 'app.race',
            url: "/course/:id",
            templateUrl: "/assets/views/course.html",
            controller: "courseCtrl",
            controllerAs: "view",
            resolve: loadSequence('courseService', 'courseCtrl')
        }).state('app.race.lesson', {
            parent: 'app.race',
            url: "/lesson/:id",
            templateUrl: "/assets/views/lesson.html",
            controller: "lessonCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'lessonCtrl', 'feedbackCtrl')
        }).state('app.race.page', {
            parent: 'app.race',
            url: "/page/:id",
            templateUrl: "/assets/views/page.html",
            controller: "pageCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'pageCtrl', 'feedbackCtrl')
        }).state('app.race.practice', {
            parent: 'app.race',
            url: "/course/practice/:id",
            templateUrl: "/assets/views/practiceExam.html",
            controller: "practiceExamCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'practiceExamCtrl')
        }).state('app.race.exam', {
            parent: 'app.race',
            url: "/exam/:id",
            templateUrl: "/assets/views/exam.html",
            controller: "examCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examCtrl', 'feedbackCtrl')
        }).state('app.race.question', {
            parent: 'app.race',
            url: "/question/:id",
            templateUrl: "/assets/views/question.html",
            controller: "questionCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'questionCtrl', 'feedbackCtrl')
        }).state('app.race.examresults', {
            parent: 'app.race',
            url: "/exam/results/:id",
            templateUrl: "/assets/views/exam_results.html",
            controller: "examResultsCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'examResultsCtrl')
        }).state('app.authoring', {
            url: '/authoring',
            template: '<div ui-view class="bg-light-grey"></div>'
        }).state('app.coordinator', {
            parent: 'app',
            url: '/coordinator',
            template: '<div ui-view class="bg-light-grey"></div>',
            abstract: true
        }).state('app.renewGroup', {
            url: "/renewGroup",
            parent: 'app.coordinator',
            templateUrl: "/assets/views/subscribe/renewGroup.html",
            controller: "renewGroupCtrl",
            controllerAs: "view",
            resolve: loadSequence('mainService', 'subscriptionService', 'renewGroupCtrl')
        }).state('app.renewIndividual', {
            parent: 'app.coordinator',
            url: "/renewIndividual",
            templateUrl: "/assets/views/subscribe/renewIndividual.html",
            controller: "renewIndividualCtrl",
            controllerAs: "view",
            resolve: loadSequence('mainService', 'subscriptionService', 'renewIndividualCtrl')
        }).state('app.coordinator.upgradeIndividual', {
            parent: 'app.coordinator',
            url: "/upgradeIndividual/:id",
            templateUrl: "/assets/views/subscribe/upgradeIndividual.html",
            controller: "upgradeIndividualCtrl",
            controllerAs: "view",
            resolve: loadSequence('upgradeIndividualCtrl', 'subscriptionService')
        }).state('app.upgradeGroupMember', {
            parent: 'app.coordinator',
            url: "/upgradeGroupMember/",
            templateUrl: "/assets/views/subscribe/upgradeGroupMember.html",
            controller: "upgradeGroupMemberCtrl",
            controllerAs: "view",
            resolve: loadSequence('upgradeGroupMemberCtrl', 'subscriptionService')
        }).state('app.coordinator.upgrade', {
            parent: 'app.coordinator',
            url: "/upgrade/:id",
            templateUrl: "/assets/views/subscribe/upgradeGroup.html",
            controller: "upgradeGroupCtrl",
            controllerAs: "view",
            resolve: loadSequence('upgradeGroupCtrl', 'subscriptionService')
        }).state('app.coordinator.checkout', {
            url: "/checkout",
            parent: "app.coordinator",
            templateUrl: "/assets/views/subscribe/payment.html",
            controller: "checkoutCtrl",
            controllerAs: "view",
            resolve: loadSequence('checkoutCtrl', 'subscriptionService')
        }).state('app.authoring.review', {
            url: '/review',
            template: '<div ui-view class="bg-light-grey"></div>'
        }).state('app.authoring.review.course', {
            parent: 'app.authoring.review',
            url: "/course/:id",
            templateUrl: "/assets/views/course.html",
            controller: "courseCtrl",
            controllerAs: "view",
            resolve: loadSequence('courseService', 'courseCtrl')
        }).state('app.authoring.search', {
            parent: 'app.authoring',
            url: "/search",
            controller: "authorSearchCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/authoring/authorSearch.html",
            resolve: loadSequence('authoringService', 'authorSearchCtrl')
        }).state('app.authoring.review.exam', {
            parent: 'app.authoring.review',
            url: "/exam/:id",
            templateUrl: "/assets/views/reviewExam.html",
            controller: "reviewExamCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'reviewExamCtrl')
        }).state('app.authoring.review.question', {
            parent: 'app.authoring.review',
            url: "/exam/:id",
            templateUrl: "/assets/views/reviewExam.html",
            controller: "reviewExamCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'reviewExamCtrl')
        }).state('app.authoring.review.page', {
            parent: 'app.authoring.review',
            url: "/page/:id",
            templateUrl: "/assets/views/page.html",
            controller: "pageCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'pageCtrl', 'feedbackCtrl')
        }).state('app.authoring.review.lesson', {
            parent: 'app.authoring.review',
            url: "/lesson/:id",
            templateUrl: "/assets/views/lesson.html",
            controller: "lessonCtrl",
            controllerAs: "view",
            resolve: loadSequence('perfect-scrollbar-plugin', 'mainService', 'courseService', 'lessonCtrl', 'feedbackCtrl')
        }).state('app.authoring.review.practice', {
            parent: 'app.authoring.review',
            url: "/course/practice/:id",
            templateUrl: "/assets/views/practiceExam.html",
            controller: "practiceExamCtrl",
            controllerAs: "view",
            resolve: loadSequence('examService', 'practiceExamCtrl')
        }).state('app.help', {
            url: "/help",
            templateUrl: "/assets/views/helpCenter.html",
            controller: "helpCenterCtrl",
            controllerAs: "view",
            resolve: loadSequence('helpCenterCtrl')
        }).state('app.helptopic', {
            url: "/topic/:id",
            templateUrl: "/assets/views/helpTopic.html",
            controller: "helpTopicCtrl",
            controllerAs: "view",
            resolve: loadSequence('ngFileSaver', 'helpTopicCtrl')
        }).state('app.admin', {
            url: '/admin',
            template: '<div ui-view class="bg-light-grey"></div>'
        }).state('app.admin.console', {
            parent: 'app.admin',
            url: "/console",
            controller: "adminConsoleCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/adminConsole.html",
            resolve: loadSequence('ngFileSaver', 'smart-table', 'adminConsoleCtrl', 'adminService')
        }).state('app.admin.plans', {
            parent: 'app.admin',
            url: "/plans",
            controller: "plansCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/plans.html",
            resolve: loadSequence('smart-table', 'plansCtrl', 'adminService')
        }).state('app.admin.plan', {
            parent: 'app.admin',
            url: "/plan/:id",
            controller: "planCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/plan.html",
            resolve: loadSequence('planCtrl', 'adminService')
        }).state('app.admin.addOns', {
            parent: 'app.admin',
            url: "/addOns",
            controller: "addOnsCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/addOns.html",
            resolve: loadSequence('smart-table', 'addOnsCtrl', 'adminService')
        }).state('app.admin.addOn', {
            parent: 'app.admin',
            url: "/addOn/:id",
            controller: "addOnCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/addOn.html",
            resolve: loadSequence('addOnCtrl', 'adminService')
        }).state('app.admin.orders', {
            parent: 'app.admin',
            url: "/orders",
            controller: "ordersConsoleCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/ordersConsole.html",
            resolve: loadSequence('smart-table', 'ngFileSaver', 'ordersConsoleCtrl')
        }).state('app.admin.orders.group', {
            parent: 'app.admin',
            url: "/orders/:id",
            controller: "ordersConsoleCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/ordersConsole.html",
            resolve: loadSequence('smart-table', 'ngFileSaver', 'ordersConsoleCtrl')
        }).state('app.admin.order', {
            parent: 'app.admin',
            url: "/order/:id",
            controller: "orderCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/order.html",
            resolve: loadSequence('orderCtrl', 'adminService', 'ngFileSaver')
        }).state('app.admin.console.members', {
            parent: 'app.admin',
            url: "/console/members/:id",
            controller: "adminMemberConsoleCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/adminMemberConsole.html",
            resolve: loadSequence('smart-table', 'adminMemberConsoleCtrl')
        }).state('app.admin.replacecourse', {
            parent: 'app.admin',
            url: "/replacecourse",
            controller: "replaceCourseCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/replaceCourse.html",
            resolve: loadSequence('replaceCourseCtrl')
        }).state('app.admin.search', {
            parent: 'app.admin',
            url: "/search",
            controller: "adminSearchCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/adminSearch.html",
            resolve: loadSequence('adminService', 'adminSearchCtrl')
        }).state('app.admin.trainingCertificates', {
            parent: 'app.admin',
            url: "/certificates",
            controller: "trainingCertificatesCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/trainingCertificates.html",
            resolve: loadSequence('lrDragNDrop','smart-table', 'trainingCertificatesCtrl', 'adminService')
        }).state('app.authoring.libraries', {
            url: "/libraries",
            templateUrl: "/assets/views/authoring/libraries.html",
            controller: "librariesCtrl",
            controllerAs: "view",
            resolve: loadSequence('smart-table', 'authoringService', 'librariesCtrl')
        }).state('app.authoring.questions', {
            url: "/questions/:id",
            templateUrl: "/assets/views/authoring/questions.html",
            controller: "questionsCtrl",
            controllerAs: "view",
            resolve: loadSequence('smart-table', 'authoringService', 'questionsCtrl')
        }).state('app.authoring.coursequestions', {
            url: "/course/questions/:id",
            parent: "app.authoring",
            templateUrl: "/assets/views/authoring/courseQuestions.html",
            controller: "courseQuestionsCtrl",
            controllerAs: "view",
            resolve: loadSequence('smart-table', 'angular.filter', 'authoringService', 'courseQuestionsCtrl')
        }).state('app.authoring.question', {
            url: "/question/:id",
            templateUrl: "/assets/views/authoring/question.html",
            controller: "editQuestionCtrl",
            controllerAs: "view",
            resolve: loadSequence('authoringService', 'editQuestionCtrl')
        }).state('app.authoring.series', {
            url: "/series/:id",
            templateUrl: "/assets/views/authoring/series.html",
            controller: "seriesCtrl",
            controllerAs: "view",
            resolve: loadSequence('smart-table', 'authoringService', 'seriesCtrl')
        }).state('app.authoring.feedback', {
            url: "/feedback/:id",
            templateUrl: "/assets/views/authoring/feedback.html",
            controller: "feedbacksCtrl",
            controllerAs: "view",
            resolve: loadSequence('authoringService', 'feedbacksCtrl')
        }).state('app.authoring.courses', {
            url: "/courses/:id",
            templateUrl: "/assets/views/authoring/courses.html",
            controller: "coursesCtrl",
            controllerAs: "view",
            resolve: loadSequence('ngFileSaver', 'smart-table', 'touchspin-plugin', 'authoringService', 'coursesCtrl')
        }).state('app.authoring.references', {
            url: "/references/:id",
            templateUrl: "/assets/views/authoring/references.html",
            controller: "referencesCtrl",
            controllerAs: "view",
            resolve: loadSequence('lrDragNDrop', 'smart-table', 'authoringService', 'referencesCtrl')
        }).state('app.authoring.lessons', {
            url: "/lessons/:id",
            templateUrl: "/assets/views/authoring/lessons.html",
            controller: "lessonsCtrl",
            controllerAs: "view",
            resolve: loadSequence('lrDragNDrop', 'smart-table', 'authoringService', 'lessonsCtrl')
        }).state('app.authoring.pages', {
            url: "/pages/:id",
            templateUrl: "/assets/views/authoring/pages.html",
            controller: "pagesCtrl",
            controllerAs: "view",
            resolve: loadSequence('lrDragNDrop', 'smart-table', 'authoringService', 'pagesCtrl')
        }).state('app.authoring.page', {
            url: "/page/:id",
            templateUrl: "/assets/views/authoring/page.html",
            controller: "editPageCtrl",
            controllerAs: "view",
            resolve: loadSequence('authoringService', 'editPageCtrl')
        }).state('app.authoring.reference', {
            url: "/reference/:id",
            templateUrl: "/assets/views/authoring/reference.html",
            controller: "referenceCtrl",
            controllerAs: "view",
            resolve: loadSequence('authoringService', 'referenceCtrl')
        }).state('app.authoring.reference.create', {
            url: "/reference/create/:id",
            parent: "app.authoring",
            templateUrl: "/assets/views/authoring/reference.html",
            controller: "referenceCtrl",
            controllerAs: "view",
            resolve: loadSequence('authoringService', 'referenceCtrl')
        }).state('app.authoring.page.create', {
            url: "/page/create/:id",
            parent: "app.authoring",
            templateUrl: "/assets/views/authoring/page.html",
            controller: "editPageCtrl",
            controllerAs: "view",
            resolve: loadSequence('authoringService', 'editPageCtrl')
        }).state('app.authoring.question.create', {
            url: "/question/create/:id",
            parent: "app.authoring",
            templateUrl: "/assets/views/authoring/question.html",
            controller: "editQuestionCtrl",
            controllerAs: "view",
            resolve: loadSequence('authoringService', 'editQuestionCtrl')
        }).state('app.coordinator.trainingrole.create', {
            parent: "app.coordinator",
            url: "/create",
            templateUrl: "/assets/views/trainingRole.html",
            controller: "trainingRoleCtrl",
            controllerAs: "view",
            resolve: loadSequence('ngSticky', 'ui.highlight', 'ui.tree', 'ui.tree-filter', 'smart-table', 'trainingRoleCtrl', 'coordinatorService')
        }).state('app.search', {
            url: "/search/:id",
            templateUrl: "/assets/views/utility_search_result.html",
            controller: "searchCtrl",
            controllerAs: "view",
            resolve: loadSequence('ui.highlight', 'searchCtrl')
        }).state('app.dashboard', {
            url: "/dashboard",
            templateUrl: "/assets/views/dashboard.html",
            controller: "dashboardCtrl",
            controllerAs: "view",
            resolve: loadSequence('dashboardCtrl')
        }).state('app.subscriptions', {
            parent: "app.coordinator",
            url: '/subscriptions',
            controller: "subscriptionsCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/subscribe/subscriptions.html",
            resolve: {
                init: loadSequence('subscriptionsCtrl','subscriptionService').deps,
                subscriptions: function (subscriptionService) {
                    return subscriptionService.getSubscriptions()
                        .then(function (response) {
                            return response.data;
                        });
                }
    }
        }).state('app.groupMemberOrders', {
            parent: "app",
            url: '/GroupMemberOrders',
            controller: "groupMemberOrdersCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/subscribe/groupMemberOrders.html",
            resolve: {
                init: loadSequence('groupMemberOrdersCtrl', 'subscriptionService').deps,
                subscriptions: function (subscriptionService) {
                    return subscriptionService.getGroupMemberOrders()
                        .then(function (response) {
                            return response.data;
                        });
                }
            }
        }).state('app.invoice', {
            url: '/invoice/:id',
            controller: "invoiceCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/subscribe/invoice.html",
            resolve: loadSequence('subscriptionService', 'invoiceCtrl')
        }).state('app.coordinator.console', {
            url: "/console",
            controller: "consoleCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/console.html",
            resolve: loadSequence('smart-table', 'ngFileSaver', 'consoleCtrl', 'coordinatorService')
        }).state('app.coordinator.groupEmailTemplates', {
            url: "/groupEmailTemplates",
            controller: "groupEmailTemplatesCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/groupEmailTemplates.html",
            resolve: loadSequence('smart-table', 'coordinatorService', 'groupEmailTemplateCtrl')
        }).state('app.coordinator.detached', {
            url: "/detached",
            controller: "detachedCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/detached.html",
            resolve: loadSequence('smart-table', 'detachedCtrl', 'coordinatorService')
        }).state('app.admin.detached', {
            parent: 'app.admin',
            url: "/detached/:id",
            controller: "adminDetachedCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/adminDetached.html",
            resolve: loadSequence('smart-table', 'adminDetachedCtrl', 'adminService')
        }).state('app.coordinator.author', {
            url: "/author/:id",
            controller: "authorPermissionsCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/authorPermissions.html",
            resolve: loadSequence('smart-table', 'authorPermissionsCtrl')
        }).state('app.coordinator.copycourses', {
            url: "/copycourses",
            controller: "copyCoursesCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/copyCourses.html",
            resolve: loadSequence('smart-table', 'copyCoursesCtrl', 'mainService')
        }).state('app.coordinator.reportfields', {
            url: "/reportfields",
            parent: "app.coordinator",
            controller: "reportFieldsCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/reportFields.html",
            resolve: loadSequence('lrDragNDrop', 'smart-table', 'reportFieldsCtrl', 'coordinatorService', 'mainService')
        }).state('app.coordinator.reports', {
            url: "/reports",
            parent: "app.coordinator",
            controller: "reportsCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/groupReports.html",
            resolve: loadSequence('smart-table', 'ngFileSaver', 'reportsCtrl')
        }).state('app.admin.reports', {
            url: "/reports",
            controller: "adminReportsCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/admin/adminReports.html",
            resolve: loadSequence('smart-table', 'ngFileSaver', 'adminReportsCtrl')
        }).state('app.coordinator.trainingroles', {
            url: "/trainingroles",
            controller: "trainingRolesCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/trainingRoles.html",
            resolve: loadSequence('smart-table', 'trainingRolesCtrl', 'coordinatorService')
        }).state('app.coordinator.assigncourses', {
            url: "/assigncourses",
            controller: "assignCoursesCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/assignCourses.html",
            resolve: loadSequence('ngSticky', 'ui.highlight', 'ui.tree', 'ui.tree-filter', 'assignCoursesCtrl', 'coordinatorService')
        }).state('app.coordinator.trainingrole', {
            url: "/trainingrole/:id",
            controller: "trainingRoleCtrl",
            controllerAs: "view",
            templateUrl: "/assets/views/trainingRole.html",
            resolve: loadSequence('ngSticky', 'ui.highlight', 'ui.tree', 'ui.tree-filter', 'smart-table', 'trainingRoleCtrl', 'coordinatorService')
        }).state('app.user', {
            url: '/user',
            templateUrl: "/assets/views/pages_user_profile.html",
            controller: 'userCtrl',
            controllerAs: 'view',
            resolve: loadSequence('mainService', 'ui.mask', 'ngFileSaver', 'userService', 'smart-table', 'google.places', 'flow', 'ui.select', 'userCtrl')
        }).state('app.coordinator.user', {
            url: '/user/:id',
            parent: 'app.coordinator',
            controller: 'groupMemberCtrl',
            controllerAs: 'view',
            templateUrl: "/assets/views/groupMemberProfile.html",
            resolve: loadSequence('coordinatorService', 'ui.mask', 'flow', 'ngFileSaver', 'smart-table', 'ui.select', 'google.places', 'groupMemberCtrl')
        }).state('app.coordinator.transcript', {
            url: '/user/transcript/:id',
            parent: 'app.coordinator',
            controller: 'groupMemberCtrl',
            controllerAs: 'view',
            templateUrl: "/assets/views/groupMemberProfile.html",
            resolve: loadSequence('mainService', 'ui.mask', 'coordinatorService', 'ngFileSaver', 'smart-table', 'flow', 'google.places', 'ui.select', 'groupMemberCtrl')
        }).state('app.transcript', {
            url: '/user/transcript',
            controller: 'userCtrl',
            controllerAs: 'view',
            templateUrl: "/assets/views/pages_user_profile.html",
            resolve: loadSequence('mainService', 'ui.mask', 'userService', 'ngFileSaver', 'smart-table', 'flow', 'google.places', 'ui.select', 'userCtrl')
        }).state('app.coordinator.groupprofile', {
            url: "/groupprofile",
            templateUrl: "/assets/views/group_profile.html",
            controller: "groupProfileCtrl",
            controllerAs: "view",
            resolve: loadSequence('ngSticky', 'ui.highlight', 'ui.tree', 'ui.tree-filter', 'coordinatorService', 'groupProfileCtrl')
        }).state('app.admin.groupprofile', {
            parent: 'app.admin',
            url: "/groupprofile/:id",
            templateUrl: "/assets/views/admin/adminGroupProfile.html",
            controller: "adminGroupProfileCtrl",
            controllerAs: "view",
            resolve: loadSequence('ui.highlight', 'ui.tree', 'ui.tree-filter', 'adminGroupProfileCtrl', 'coordinatorService', 'mainService')
        }).state('app.admin.news', {
            url: "/news",
            templateUrl: "/assets/views/admin/newsItems.html",
            controller: "newsItemsCtrl",
            controllerAs: "view",
            resolve: loadSequence('lrDragNDrop', 'smart-table', 'newsItemsCtrl', 'adminService')
        }).state('app.admin.emailTemplates', {
            url: "/emailtemplates",
            parent: 'app.admin',
            templateUrl: "/assets/views/admin/emailTemplates.html",
            controller: "emailTemplatesCtrl",
            controllerAs: "view",
            resolve: loadSequence('smart-table', 'emailTemplatesCtrl', 'adminService')
        }).state('app.admin.trainingCertificate', {
            url: "/certificate/:id",
            parent: 'app.admin',
            templateUrl: "/assets/views/admin/trainingCertificate.html",
            controller: "trainingCertificateCtrl",
            controllerAs: "view",
            resolve: loadSequence('ui.highlight', 'ui.tree', 'ui.tree-filter', 'trainingCertificateCtrl', 'adminService', 'mainService')
        }).state('app.admin.trainingCertificate.create', {
            url: "/certificate/create/",
            parent: 'app.admin',
            templateUrl: "/assets/views/admin/trainingCertificate.html",
            controller: "trainingCertificateCtrl",
            controllerAs: "view",
            resolve: loadSequence('ui.highlight', 'ui.tree', 'ui.tree-filter', 'trainingCertificateCtrl', 'adminService', 'mainService')
        }).state('app.admin.emailTemplates.create', {
            parent: "app.admin",
            url: "/emailtemplates/create",
            templateUrl: "/assets/views/admin/emailTemplate.html",
            controller: "emailTemplateCtrl",
            controllerAs: "view",
            resolve: loadSequence('emailTemplateCtrl', 'adminService')
        }).state('app.coordinator.groupEmailTemplates.create', {
            parent: "app.coordinator",
            url: "/groupEmailtemplates/create",
            templateUrl: "/assets/views/groupEmailTemplate.html",
            controller: "groupEmailTemplateCtrl",
            controllerAs: "view",
            resolve: loadSequence('emailTemplateCtrl', 'coordinatorService')
        }).state('app.coordinator.groupEmailTemplate', {
            parent: 'app.coordinator',
            url: "/groupEmailtemplate/:id",
            templateUrl: "/assets/views/groupEmailTemplate.html",
            controller: "groupEmailTemplateCtrl",
            controllerAs: "view",
            resolve: loadSequence('groupEmailTemplateCtrl', 'coordinatorService')
        }).state('app.admin.emailTemplate', {
            parent: 'app.admin',
            url: "/emailtemplate/:id",
            templateUrl: "/assets/views/admin/emailTemplate.html",
            controller: "emailTemplateCtrl",
            controllerAs: "view",
            resolve: loadSequence('emailTemplateCtrl', 'adminService')
        }).state('app.admin.help', {
            parent: 'app.admin',
            url: "/help",
            templateUrl: "/assets/views/admin/helpItems.html",
            controller: "helpItemsCtrl",
            controllerAs: "view",
            resolve: loadSequence('smart-table', 'helpItemsCtrl', 'adminService')
        }).state('app.admin.helptopic', {
            url: "/help/:id",
            templateUrl: "/assets/views/admin/help.html",
            controller: "helpCtrl",
            controllerAs: "view",
            resolve: loadSequence('helpCtrl', 'adminService')
        }).state('app.admin.helptopic.create', {
            url: "/helptopic/create/",
            parent: 'app.admin',
            templateUrl: "/assets/views/admin/help.html",
            controller: "helpCtrl",
            controllerAs: "view",
            resolve: loadSequence('helpCtrl', 'adminService')
        }).state('app.admin.newsitem', {
            parent: 'app.admin',
            url: "/news/:id",
            templateUrl: "/assets/views/admin/news.html",
            controller: "newsCtrl",
            controllerAs: "view",
            resolve: loadSequence('newsCtrl', 'adminService')
        }).state('app.admin.newsitem.create', {
            parent: 'app.admin',
            url: "/create/",
            templateUrl: "/assets/views/admin/news.html",
            controller: "newsCtrl",
            controllerAs: "view",
            resolve: loadSequence('newsCtrl', 'adminService')
        }).state('login', {
            url: '/login',
            template: '<div ui-view class="fade-in-right-big smooth"></div>',
            abstract: true
        }).state('login.signin', {
            url: '/signin',
            controller: "loginCtrl",
            controllerAs: "view",
            resolve: loadSequence('loginCtrl'),
            templateUrl: "/assets/views/login_login.html"
        }).state('login.accesscode', {
            url: '/accesscode',
            controller: "accessCodeCtrl",
            controllerAs: "view",
            resolve: loadSequence('accessCodeCtrl', 'subscriptionService'),
            templateUrl: "/assets/views/subscribe/accessCode.html"
        }).state('login.subscribe', {
            url: '/subscribe',
            controller: "loginSubscribeCtrl",
            controllerAs: "view",
            resolve: loadSequence('subscriptionService', 'loginSubscribeCtrl'),
            templateUrl: "/assets/views/login_subscribe.html"
        }).state('login.signout', {
            url: '/signout',
            controller: "loginCtrl",
            controllerAs: "view",
            resolve: loadSequence('loginCtrl'),
            templateUrl: "/assets/views/login_login.html"
        }).state('login.payment', {
            url: '/payment',
            controller: "paymentCtrl",
            controllerAs: "view",
            resolve: loadSequence('subscriptionService', 'paymentCtrl'),
            templateUrl: "/assets/views/subscribe/payment.html"
        }).state('login.forgot', {
            url: '/forgot',
            controller: "loginForgotCtrl",
            controllerAs: "view",
            resolve: loadSequence('loginForgotCtrl'),
            templateUrl: "/assets/views/login_forgot.html"
        }).state('login.group', {
            url: '/group',
            controller: "groupCtrl",
            controllerAs: "view",
            resolve: loadSequence('groupCtrl', 'subscriptionService'),
            templateUrl: "/assets/views/subscribe/group.html"
        }).state('login.individual', {
            url: '/individual',
            controller: "individualCtrl",
            controllerAs: "view",
            resolve: loadSequence('individualCtrl', 'subscriptionService'),
            templateUrl: "/assets/views/subscribe/individual.html"
        }).state('login.addons', {
            url: '/addons',
            controller: "loginAddonCtrl",
            controllerAs: "view",
            resolve: loadSequence('loginAddonCtrl', 'subscriptionService'),
            templateUrl: "/assets/views/login_addons.html"
        }).state('login.registration', {
            url: '/registration',
            controller: "loginRegistrationCtrl",
            controllerAs: "view",
            resolve: loadSequence('loginRegistrationCtrl', 'google.places'),
            templateUrl: "/assets/views/login_registration.html"
        });
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        });
        // Generates a resolve object previously configured in constant.JS_REQUIRES (config.constant.js)
        function loadSequence() {
            var _args = arguments;
            return {
                deps: ['$ocLazyLoad', '$q',
                    function ($ocLL, $q) {
                        var promise = $q.when(1);
                        for (var i = 0, len = _args.length; i < len; i++) {
                            promise = promiseThen(_args[i]);
                        }
                        return promise;

                        function promiseThen(_arg) {
                            if (typeof _arg == 'function')
                                return promise.then(_arg);
                            else
                                return promise.then(function () {
                                    var nowLoad = requiredData(_arg);
                                    if (!nowLoad)
                                        return $.error('Route resolve: Bad resource name [' + _arg + ']');
                                    return $ocLL.load(nowLoad);
                                });
                        }

                        function requiredData(name) {
                            if (jsRequires.modules)
                                for (var m in jsRequires.modules)
                                    if (jsRequires.modules[m].name && jsRequires.modules[m].name === name)
                                        return jsRequires.modules[m];
                            return jsRequires.scripts && jsRequires.scripts[name];
                        }
                    }]
            };
        }
    }]);