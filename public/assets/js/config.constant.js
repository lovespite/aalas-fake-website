'use strict';

/**
 * Config constant
 */
app.constant('APP_MEDIAQUERY', {
    'desktopXL': 1200,
    'desktop': 992,
    'tablet': 768,
    'mobile': 480
});

var serviceBase = '/';

app.constant('ngAuthSettings', {
    apiServiceBaseUri: serviceBase,
    clientId: 'ngAuthApp'
});
app.constant('JS_REQUIRES', {
    //*** Scripts
    scripts: {
        //*** Javascript Plugins
        'modernizr': ['/bower_components/components-modernizr/modernizr.js'],
        'moment': ['/bower_components/moment/min/moment.min.js'],
        'spin': '/bower_components/spin.js/spin.js',

        //*** jQuery Plugins
        'perfect-scrollbar-plugin': ['/bower_components/perfect-scrollbar/js/min/perfect-scrollbar.jquery.min.js', '/bower_components/perfect-scrollbar/css/perfect-scrollbar.min.css'],
        'sweet-alert': ['/bower_components/sweetalert/dist/sweetalert.min.js', '/bower_components/sweetalert/dist/sweetalert.css'],
        'jquery-nestable-plugin': ['/bower_components/jquery-nestable/jquery.nestable.js'],
        'touchspin-plugin': ['/bower_components/bootstrap-touchspin/dist/jquery.bootstrap-touchspin.min.js', '/bower_components/bootstrap-touchspin/dist/jquery.bootstrap-touchspin.min.css'],

        //*** Controllers
        'trainingRoleCtrl': '/assets/js/controllers/trainingRolesCtrl.js?v=43',
        'trainingRolesCtrl': '/assets/js/controllers/trainingRolesCtrl.js?v=43',
        'copyCoursesCtrl': '/assets/js/controllers/copyCoursesCtrl.js?v=43',
        'dashboardCtrl': '/assets/js/controllers/dashboardCtrl.js?v=43',
        'pageCtrl': '/assets/js/controllers/pageCtrl.js?v=43',
        'lessonCtrl': '/assets/js/controllers/lessonCtrl.js?v=43',
        'courseCtrl': '/assets/js/controllers/courseCtrl.js?v=43',
        'courseNavCtrl': '/assets/js/controllers/courseNavCtrl.js?v=43',
        'loginCtrl': '/assets/js/controllers/loginCtrl.js?v=43',
        'accessCodeCtrl': '/assets/js/controllers/subscribe/accessCodeCtrl.js?v=43',
        'loginRegistrationCtrl': '/assets/js/controllers/loginCtrl.js?v=43',
        'loginForgotCtrl': '/assets/js/controllers/loginCtrl.js?v=43',
        'groupCtrl': '/assets/js/controllers/subscribe/groupCtrl.js?v=43',
        'individualCtrl': '/assets/js/controllers/subscribe/individualCtrl.js?v=43',
        'paymentCtrl': '/assets/js/controllers/subscribe/paymentCtrl.js?v=58',
        'examCtrl': '/assets/js/controllers/examCtrl.js?v=43',
        'examResultsCtrl': '/assets/js/controllers/examResultsCtrl.js?v=43',
        'questionCtrl': '/assets/js/controllers/questionCtrl.js?v=43',
        'navCtrl': '/assets/js/controllers/navCtrl.js?v=43',
        'adminReportsCtrl': '/assets/js/controllers/admin/adminReportsCtrl.js?v=43',

        'memberTrainingModalCtrl': '/assets/js/controllers/groupMemberCtrl.js?v=43',
        'consoleTrainingModalCtrl': '/assets/js/controllers/consoleCtrl.js?v=43',
        'ModalInstanceCtrl': '/assets/js/controllers/consoleCtrl.js?v=43',
        'addMemberModalCtrl': '/assets/js/controllers/consoleCtrl.js?v=43',
        'rolesModalCtrl': '/assets/js/controllers/consoleCtrl.js?v=43',

        'consoleCtrl': '/assets/js/controllers/consoleCtrl.js?v=43',
        'groupEmailTemplateCtrl': '/assets/js/controllers/groupEmailTemplateCtrl.js?v=43',
        'groupEmailTemplatesCtrl': '/assets/js/controllers/groupEmailTemplateCtrl.js?v=43',
        'detachedCtrl': '/assets/js/controllers/detachedCtrl.js?v=43',
        'asideCtrl': '/assets/js/controllers/asideCtrl.js?v=43',
        'nestableCtrl': '/assets/js/controllers/nestableCtrl.js?v=43',
        'validationCtrl': ['/assets/js/controllers/validationCtrl.js?v=43'],
        'userCtrl': ['/assets/js/controllers/userCtrl.js?v=44'],
        'transcriptCtrl': ['/assets/js/controllers/transcriptCtrl.js?v=43'],
        'groupProfileCtrl': ['/assets/js/controllers/groupProfileCtrl.js?v=43'],
        'adminDetachedCtrl': '/assets/js/controllers/admin/adminDetachedCtrl.js?v=43',
        'certCtrl': '/assets/js/controllers/certCtrl.js?v=43',
        'subscriptionsCtrl': '/assets/js/controllers/subscribe/subscriptionsCtrl.js?v=46',
        'groupMemberOrdersCtrl': '/assets/js/controllers/subscribe/groupMemberOrders.js?v=43',
        'invoiceCtrl': '/assets/js/controllers/subscribe/invoiceCtrl.js?v=31',
        //*** Authoring
        'authorPermissionsCtrl': '/assets/js/controllers/authorPermissionsCtrl.js?v=43',
        'reviewExamCtrl': '/assets/js/controllers/reviewExamCtrl.js?v=43',
        'adminConsoleCtrl': '/assets/js/controllers/adminConsoleCtrl.js?v=43',
        'reportsCtrl': '/assets/js/controllers/reportsCtrl.js?v=43',
        'searchCtrl': '/assets/js/controllers/searchCtrl.js?v=43',
        'helpCenterCtrl': '/assets/js/controllers/helpCenterCtrl.js?v=43',
        'helpTopicCtrl': '/assets/js/controllers/helpTopicCtrl.js?v=43',
        'plansCtrl': '/assets/js/controllers/admin/plansCtrl.js?v=43',
        'planCtrl': '/assets/js/controllers/admin/planCtrl.js?v=43',
        'addOnsCtrl': '/assets/js/controllers/admin/addOnsCtrl.js?v=43',
        'addOnCtrl': '/assets/js/controllers/admin/addOnCtrl.js?v=43',
        'practiceExamCtrl': '/assets/js/controllers/practiceExamCtrl.js?v=43',
        'librariesCtrl': '/assets/js/controllers/authoring/librariesCtrl.js?v=43',
        'seriesCtrl': '/assets/js/controllers/authoring/seriesCtrl.js?v=43',
        'coursesCtrl': '/assets/js/controllers/authoring/coursesCtrl.js?v=43',
        'courseQuestionsCtrl': '/assets/js/controllers/authoring/courseQuestionsCtrl.js?v=43',
        'lessonsCtrl': '/assets/js/controllers/authoring/lessonsCtrl.js?v=43',
        'referenceCtrl': '/assets/js/controllers/authoring/referencesCtrl.js?v=43',
        'referencesCtrl': '/assets/js/controllers/authoring/referencesCtrl.js?v=43',
        'pagesCtrl': '/assets/js/controllers/authoring/pagesCtrl.js?v=43',
        'editQuestionCtrl': '/assets/js/controllers/authoring/editQuestionCtrl.js?v=43',
        'questionsCtrl': '/assets/js/controllers/authoring/questionsCtrl.js?v=43',
        'editPageCtrl': '/assets/js/controllers/authoring/editPageCtrl.js?v=43',
        'reportFieldsCtrl': '/assets/js/controllers/reportFieldsCtrl.js?v=43',
        'checkoutCtrl': '/assets/js/controllers/subscribe/checkoutCtrl.js?v=43',
        'loginSubscribeCtrl': '/assets/js/controllers/loginCtrl.js?v=43',
        'feedbackCtrl':'/assets/js/controllers/feedbackCtrl.js?v=43',
        'feedbacksCtrl':'/assets/js/controllers/authoring/feedbacksCtrl.js?v=43',
        'helpCtrl':'/assets/js/controllers/admin/helpCtrl.js?v=43',
        'newsItemsCtrl':'/assets/js/controllers/admin/newsItemsCtrl.js?v=43',
        'newsCtrl':'/assets/js/controllers/admin/newsCtrl.js?v=43',
        'helpItemsCtrl':'/assets/js/controllers/admin/helpItemsCtrl.js?v=43',
        'autologinCtrl':'/assets/js/controllers/autologinCtrl.js?v=43',
        'emailTemplateCtrl':'/assets/js/controllers/admin/emailTemplateCtrl.js?v=43',
        'emailTemplatesCtrl':'/assets/js/controllers/admin/emailTemplateCtrl.js?v=43',
        'trainingCertificatesCtrl':'/assets/js/controllers/admin/trainingCertificatesCtrl.js?v=43',
        'trainingCertificateCtrl':'/assets/js/controllers/admin/trainingCertificatesCtrl.js?v=43',
        'upgradeGroupCtrl': '/assets/js/controllers/subscribe/upgradeGroupCtrl.js?v=43',
        'upgradeIndividualCtrl': '/assets/js/controllers/subscribe/upgradeIndividualCtrl.js?v=43',
        'upgradeGroupMemberCtrl': '/assets/js/controllers/subscribe/upgradeGroupMemberCtrl.js?v=43',
        'renewIndividualCtrl':'/assets/js/controllers/subscribe/renewIndividualCtrl.js?v=43',
        'renewGroupCtrl':'/assets/js/controllers/subscribe/renewGroupCtrl.js?v=43',
        'assignCoursesCtrl':'/assets/js/controllers/assignCoursesCtrl.js?v=43',
        'adminMemberConsoleCtrl':'/assets/js/controllers/admin/adminMemberConsoleCtrl.js?v=43',
        'adminGroupProfileCtrl':'/assets/js/controllers/admin/adminGroupProfileCtrl.js?v=43',
        'ordersConsoleCtrl':'/assets/js/controllers/admin/ordersConsoleCtrl.js?v=43',
        'groupMemberCtrl':'/assets/js/controllers/groupMemberCtrl.js?v=43',
        'replaceCourseCtrl':'/assets/js/controllers/admin/replaceCourseCtrl.js?v=43',
        'certificatesCtrl':'/assets/js/controllers/admin/certificatesCtrl.js?v=43',
        'adminSearchCtrl': '/assets/js/controllers/admin/adminSearchCtrl.js?v=43',
        'authorSearchCtrl': '/assets/js/controllers/authoring/authorSearchCtrl.js?v=43',
        //*** Services
        'mainService':'/assets/js/services/mainService.js?v=43',
        'adminService': '/assets/js/services/adminService.js?v=43',
        'subscriptionService':'/assets/js/services/subscriptionService.js?v=54',
        'authoringService':'/assets/js/services/authoring/authoringService.js?v=43',
        'courseService':'/assets/js/services/courseService.js?v=43',
        'orderCtrl':'/assets/js/controllers/admin/orderCtrl.js?v=43',
        'examService':'/assets/js/services/examService.js?v=43',
        'userService':'/assets/js/services/userService.js?v=43',
        'coordinatorService':'/assets/js/services/coordinatorService.js?v=43',
        //*** Filters
        'htmlToPlaintext': '/assets/js/filters/htmlToPlaintext.js',
        'future': '/assets/js/filters/currentDate.js',
        'past': '/assets/js/filters/currentDate.js'
    },
    //*** angularJS Modules
    modules: [{
        name: 'angularMoment',
        files: ['/bower_components/angular-moment/angular-moment.min.js']
    }, {
        name: 'toaster',
        files: ['/bower_components/AngularJS-Toaster/toaster.min.js', '/bower_components/AngularJS-Toaster/toaster.min.css']
    }, {
        name: 'angularBootstrapNavTree',
        files: ['/bower_components/angular-bootstrap-nav-tree/dist/abn_tree_directive.js', '/bower_components/angular-bootstrap-nav-tree/dist/abn_tree.css']
    },{
        name: 'ngFileSaver',
        files: ['/bower_components/angular-file-saver/dist/angular-file-saver.bundle.min.js']
    }, {
        name: 'fsm-sticky-header',
        files: ['/bower_components/fsm-sticky-header/src/fsm-sticky-header.js']
    },  {
        name: 'smart-table',
        files: ['/bower_components/angular-smart-table/dist/smart-table.min.js']
    }, {
        name: 'ui.select',
        files: ['/bower_components/angular-ui-select/dist/select.min.js', '/bower_components/angular-ui-select/dist/select.min.css', '/bower_components/select2/dist/css/select2.min.css', '/bower_components/select2-bootstrap-css/select2-bootstrap.min.css', '/bower_components/selectize/dist/css/selectize.bootstrap3.css']
    }, {
        name: 'ui.tree',
        files: ['/bower_components/angular-ui-tree/dist/angular-ui-tree.min.js']
    },  {
        name: 'ui.tree-filter',
        files: ['/bower_components/angular-ui-tree-filter/dist/angular-ui-tree-filter.min.js']
    },  {
        name: 'angular.filter',
        files: ['/bower_components/angular-filter/angular-filter.min.js']
    },,{
        name: 'ui.highlight',
        files: ['/bower_components/angular-ui-highlight/highlight.min.js']
    },{
        name: 'ui.mask',
        files: ['/bower_components/angular-ui-mask/dist/mask.min.js']
    },, {
        name: 'ngImgCrop',
        files: ['/bower_components/ngImgCrop/compile/minified/ng-img-crop.js', '/bower_components/ngImgCrop/compile/minified/ng-img-crop.css']
    }, {
        name: 'angularFileUpload',
        files: ['/bower_components/angular-file-upload/angular-file-upload.min.js']
    }, {
        name: 'ngAside',
        files: ['/bower_components/angular-aside/dist/js/angular-aside.min.js', '/bower_components/angular-aside/dist/css/angular-aside.min.css']
    }, {
        name: 'truncate',
        files: ['/bower_components/angular-truncate/src/truncate.js']
    }, {
        name: 'oitozero.ngSweetAlert',
        files: ['/bower_components/angular-sweetalert-promised/SweetAlert.min.js']
    }, {
        name: 'monospaced.elastic',
        files: ['/bower_components/angular-elastic/elastic.js']
    }, {
        name: 'ngSticky',
        files: ['/bower_components/ngSticky/lib/sticky.js']
    }, {
        name: 'ngMap',
        files: ['/bower_components/ngmap/build/scripts/ng-map.min.js']
    },{
        name: 'angular-notification-icons',
        files: ['/bower_components/angular-notification-icons/dist/angular-notification-icons.min.js', '/bower_components/angular-notification-icons/dist/angular-notification-icons.min.css']
    }, {
        name: 'tc.chartjs',
        files: ['/bower_components/tc-angular-chartjs/dist/tc-angular-chartjs.min.js']
    }, {
        name: 'flow',
        files: ['/bower_components/ng-flow/dist/ng-flow-standalone.min.js','/assets/js/config/config-ngflow.js']
    }, {
        name: 'uiSwitch',
        files: ['/bower_components/angular-ui-switch/angular-ui-switch.min.js', '/bower_components/angular-ui-switch/angular-ui-switch.min.css']
    }, {
        name: 'ckeditor',
        files: ['/bower_components/angular-ckeditor/angular-ckeditor.min.js']
    }, {
        name: 'mwl.calendar',
        files: ['/bower_components/angular-bootstrap-calendar/dist/js/angular-bootstrap-calendar.js', '/bower_components/angular-bootstrap-calendar/dist/js/angular-bootstrap-calendar-tpls.js', '/bower_components/angular-bootstrap-calendar/dist/css/angular-bootstrap-calendar.min.css']
    }, {
        name: 'google.places',
        files: ['/bower_components/angular-google-places-autocomplete/dist/autocomplete.min.css','/bower_components/angular-google-places-autocomplete/dist/autocomplete.min.js']
    }, {
        name: 'ng-nestable',
        files: ['/bower_components/ng-nestable/src/angular-nestable.js']
    }, {
        name: 'vAccordion',
        files: ['/bower_components/v-accordion/dist/v-accordion.min.js', '/bower_components/v-accordion/dist/v-accordion.min.css']
    }, {
        name: 'xeditable',
        files: ['/bower_components/angular-xeditable/dist/js/xeditable.min.js', '/bower_components/angular-xeditable/dist/css/xeditable.css', '/assets/js/config/config-xeditable.js']
    }, {
        name: 'lrDragNDrop',
        files: ['/bower_components/lrDragNDrop/lrDragNDrop.js?v=43']
    },  {
        name: 'checklist-model',
        files: ['/bower_components/checklist-model/checklist-model.js']
    },  {
        name: 'ui.tinymce',
        files: ['/bower_components/tinymce/tinymce.min.js','/bower_components/angular-ui-tinymce/dist/tinymce.min.js']
    }]
});
