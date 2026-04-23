var app = angular.module('clipApp', ['clip-two']);
app.run(['$rootScope', '$state', '$stateParams', 'authService', '$sessionStorage', 'mainService', 'SweetAlert',
    function ($rootScope, $state, $stateParams, authService, $sessionStorage, mainService, SweetAlert) {

        authService.fillAuthData();
        // Attach Fastclick for eliminating the 300ms delay between a physical tap and the firing of a click event on mobile browsers
        FastClick.attach(document.body);
        // Set some reference to access them from any scope
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
            $state.previous = fromState;
            $state.previousParams = fromParams;

        });
        $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {


            if (angular.isDefined(mainService.subscription.profileComplete) && !mainService.subscription.profileComplete && toState.name.indexOf('app.user') == -1 && toState.name.indexOf('login') == -1 && toState.name.indexOf('invoice') == -1) {
                event.preventDefault();
                SweetAlert.swal({ type: 'warning', title: 'You must complete your profile to proceed.' });
                $state.go('app.user');
            }
           

        });
        // GLOBAL APP SCOPE
        // set below basic information
        $rootScope.app = {
            name: 'AALAS Learning Library', // name of your project
            author: 'AALAS', // author's name or company name
            description: 'AALAS Learning Library', // brief description
            version: '2.1.0', // current version
            year: ((new Date()).getFullYear()), // automatic current year (for copyright information)
            isMobile: (function () {// true if the browser is a mobile device
                var check = false;
                if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                    check = true;
                };
                return check;
            })(),
            layout: {
                showAll: false,
                rowcount: 15,
                isNavbarFixed: true, //true if you want to initialize the template with fixed header
                isSidebarFixed: true, // true if you want to initialize the template with fixed sidebar
                isSidebarClosed: false, // true if you want to initialize the template with closed sidebar
                isFooterFixed: false, // true if you want to initialize the template with fixed footer
                theme: 'theme-3', // indicate the theme chosen for your project
                logo: '/assets/images/logo.png' // relative path of the project logo
            }
        };

    }]);

app.config(function ($httpProvider, $compileProvider) {
    function convertDateStringsToDates(input) {
        // Ignore things that aren't objects.
        var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;

        if (typeof input !== "object") return input;

        for (var key in input) {
            if (!input.hasOwnProperty(key)) continue;

            var value = input[key];
            var match;
            // Check for string properties which look like dates.
            if (typeof value === "string" && value.length > 4 && (match = value.match(regexIso8601))) {
                var milliseconds = Date.parse(match[0])
                if (!isNaN(milliseconds)) {
                    input[key] = new Date(milliseconds);
                }
            } else if (typeof value === "object") {
                // Recurse into object
                convertDateStringsToDates(value);
            }
        }
    };
    $httpProvider.defaults.headers.common["Cache-Control"] = "no-cache";
    $httpProvider.defaults.headers.common.Pragma = "no-cache";
    $httpProvider.interceptors.push('authInterceptorService');
    $httpProvider.defaults.transformResponse.push(function (responseData) {
        convertDateStringsToDates(responseData);
        return responseData;
    });
});
app.config(function (httpRequestInterceptorCacheBusterProvider) {
    httpRequestInterceptorCacheBusterProvider.setMatchlist([/.*assets.*/], true);
});

app.run(['authService', function (authService) {
    authService.fillAuthData();
}]);




