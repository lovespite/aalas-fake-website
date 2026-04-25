'use strict';
app.controller('loginCtrl', ['$window', 'authService', '$http', '$state', function ($window, authService, $http, $state) {
    var vm = this;
    vm.message = '';
    vm.ssoGroups = [];
    vm.loginData = authService.loginData;
    vm.login = function () {
        vm.message = '';
        authService.login(vm.loginData)
            .then(function (response) {
                if ($state.previous.name.length && !$state.includes('signout') && $state.previous.name.indexOf('login') === -1) {
                    $state.go($state.previous, $state.previousParams);
                }
                else {
                    $state.go("app.dashboard");
                }

            })
        ['catch'](function (response) {
            vm.message = response !== null ? response.error_description || response.error || response : 'An unspecified error occurred';
            if (response.error_uri)
                $window.location.href = response.error_uri;
        });
    };
    vm.loginSSO = function () {
    };
    vm.getSSOGroups = function () {
        vm.ssoGroups = [];
    }
    if ($state.includes('login.signout'))
        authService.logOut();
    vm.getSSOGroups();
}]);
app.controller('loginForgotCtrl', ['authService', '$http', function (authService, $http) {
    var vm = this;
    vm.member = {};
    vm.success = false;
    vm.forgot = function () {
        authService.forgot(vm.member).then(function (response) {
            vm.success = true;
        },
            function (response) {
                vm.message = response.error;
            });
    };
}]);
app.controller('loginAccessCodeCtrl', ['authService', '$http', '$state', function (authService, $http, $state) {
    var vm = this;
    vm.hasAccessCode = false;
    vm.loginData = authService.loginData;
    vm.clearMessage = function () {
        vm.message = '';
    }
    vm.getGroup = function () {
        if (angular.isDefined(vm.loginData.accessCode)) {

            authService.getGroup(vm.loginData.accessCode).then(function (response) {
                vm.loginData.groupId = response;
                vm.loginData.isMember = true;
                $state.go("login.registration");
            })['catch'](function (response) {
                vm.message = 'Invalid Access Code. ';
            });
        }
    }
    vm.toggleAccessCode = function () { vm.hasAccessCode = !vm.hasAccessCode; }
    vm.skip = function () {
        for (var x in vm.loginData) if (vm.loginData.hasOwnProperty(x)) delete vm.loginData[x];
        $state.go('login.group');
    }
    vm.form = {

        submit: function (form) {
            if (form.$invalid) {

                var field = null; var firstError = null;
                for (field in form) {
                    if (field[0] !== '$') {
                        if (firstError === null && !form[field].$valid) {
                            firstError = form[field].$name;
                        }

                        if (form[field].$pristine) {
                            form[field].$dirty = true;
                        }
                    }
                }

                angular.element('.ng-invalid[name=' + firstError + ']').focus();
                //    SweetAlert.swal("The form cannot be submitted because it contains validation errors!", "Errors are marked with a red, dashed border!", "error");
                return;

            }
            else {
                vm.getGroup();
            }

        }
    }

}]);
app.controller('loginGroupCtrl', ['usSpinnerService', 'authService', '$http', '$state', function (usSpinnerService, authService, $http, $state) {
    var vm = this;
    vm.groupNameVisible = false;
    vm.branches = [];
    vm.loginData = authService.loginData;
    vm.branchVisible = false;
    vm.groupnameUnique = false;
    vm.checkUniqueGroup = function () {
        usSpinnerService.stop('appSpinner');
        authService.groupNameUnique(vm.loginData.groupName).then(function (response) {
            vm.groupnameUnique = response;
        })

    };
    vm.getBranches = function () {
        $http.get(serviceBase + 'api/Branches')
            .success(function (data) {
                vm.branches = data;
            });
    }
    vm.toggleGroupName = function () {
        vm.groupNameVisible = !vm.groupNameVisible;
        vm.getBranches();
    }
    vm.setGroup = function () {
        vm.loginData.isGroup = true;
        if (!vm.branchVisible)
            delete vm.loginData.branchId;
        $state.go('login.subscribe');
    };
    vm.skip = function () {
        for (var x in vm.loginData) if (vm.loginData.hasOwnProperty(x)) delete vm.loginData[x];
        $state.go('login.subscribe');
    }
    vm.form = {

        submit: function (form) {
            if (form.$invalid || !vm.groupnameUnique) {

                var field = null; var firstError = null;
                for (field in form) {
                    if (field[0] !== '$') {
                        if (firstError === null && !form[field].$valid) {
                            firstError = form[field].$name;
                        }

                        if (form[field].$pristine) {
                            form[field].$dirty = true;
                        }
                    }
                }

                angular.element('.ng-invalid[name=' + firstError + ']').focus();
                //    SweetAlert.swal("The form cannot be submitted because it contains validation errors!", "Errors are marked with a red, dashed border!", "error");
                return;

            }
            else {
                vm.setGroup();

            }
        }
    };
}]);
app.controller('loginRegistrationCtrl', ['usSpinnerService', 'authService', '$http', '$state', function (usSpinnerService, authService, $http, $state) {
    var vm = this;
    vm.loginData = authService.loginData;
    vm.usernameUnique = true;
    vm.autocompleteOptions = {
        types: ['address']
    }
    vm.message = '';
    vm.place = {};
    vm.member = {};
    vm.checkUnique = function () {
        usSpinnerService.stop('appSpinner');
        authService.usernameUnique(vm.loginData.username).then(function (response) {
            vm.usernameUnique = response;

        })

    };
    vm.login = function () {
        authService.login(vm.loginData).then(function (response) {

            if ($state.previous !== null && !$state.includes('login'))
                $state.go($state.previous, $state.previousParams)
            else
                $state.go("app.dashboard");
        }).
            catch(function (response) {
                vm.message = response;
            });
    };
    vm.form = {

        submit: function (form) {
            if (form.$invalid || !vm.usernameUnique || !vm.place) {

                var field = null; var firstError = null;
                for (field in form) {
                    if (field[0] !== '$') {
                        if (firstError === null && !form[field].$valid) {
                            firstError = form[field].$name;
                        }

                        if (form[field].$pristine) {
                            form[field].$dirty = true;
                        }
                    }
                }

                angular.element('.ng-invalid[name=' + firstError + ']').focus();
                //    SweetAlert.swal("The form cannot be submitted because it contains validation errors!", "Errors are marked with a red, dashed border!", "error");
                return;

            }
            else {

                vm.loginData.address = vm.place.formatted_address;
                if (angular.isDefined(vm.loginData.isMember) && vm.loginData.isMember) {
                    $http.post(serviceBase + 'api/Enroll/Group/Member', vm.loginData)
                        .success(function (data) {
                            vm.login();
                        });
                }
                else if (angular.isDefined(vm.loginData.priceStructure) && vm.loginData.priceStructure.id === 0) {
                    $http.post(serviceBase + 'api/Enroll/Individual', vm.loginData)
                        .success(function (data) {
                            vm.login();
                        });
                }

                else {
                    $state.go('login.checkout');
                }
            }
        }
    };
    if (angular.isDefined(vm.loginData.address))
        vm.place = vm.loginData.address;
}]);
app.controller('loginCheckoutCtrl', ['usSpinnerService', 'authService', '$http', '$state', function (usSpinnerService, authService, $http, $state) {
    var vm = this;
    vm.disabled = false;
    vm.message = '';
    vm.token;
    vm.loginData = authService.loginData;
    vm.login = function () {
        usSpinnerService.spin('appSpinner');
        authService.login(vm.loginData).then(function (response) {

            if ($state.previous !== null && !$state.includes('login'))
                $state.go($state.previous)
            else
                $state.go("app.dashboard");
        })['catch'](
            function (response) {
                vm.message = response.error_description;
            });
    };
    vm.checkout = function () {
        vm.disabled = true;
        if (vm.loginData.orderid > 0) {
            vm.getToken();
            $http.post(serviceBase + 'api/Subscription/RetryPayment', vm.loginData)
                .success(function (data) {
                    vm.login();
                }).error(function (data) {
                    vm.message = data.error;
                    if (data.order)
                        vm.loginData = data.order;
                    vm.disabled = false;
                })
        }
        else {
            if (angular.isDefined(vm.loginData.isGroup) && vm.loginData.isGroup) {
                usSpinnerService.spin('appSpinner');
                $http.post(serviceBase + 'api/Enroll/Group', vm.loginData)
                    .success(function (data) {
                        vm.login();
                    }).error(function (data) {
                        vm.message = data.error;
                        if (data.order)
                            vm.loginData = data.order;
                        vm.disabled = false;
                    });
            }
            else {
                usSpinnerService.spin('appSpinner');
                $http.post(serviceBase + 'api/Enroll/Individual', vm.loginData)
                    .success(function (data) {
                        vm.login();
                    }).error(function (data) {
                        vm.message = data.error;
                        if (data.order)
                            vm.loginData = data.order;
                        vm.disabled = false;
                    });
            }
        }
    }
    vm.form = {

        submit: function (form) {
            vm.loginData.card.cardType = form.cardNumber.$ccType;
            vm.disabled = true;
            if (form.$invalid) {

                var field = null; var firstError = null;
                for (field in form) {
                    if (field[0] !== '$') {
                        if (firstError === null && !form[field].$valid) {
                            firstError = form[field].$name;
                        }

                        if (form[field].$pristine) {
                            form[field].$dirty = true;
                        }
                    }
                }

                angular.element('.ng-invalid[name=' + firstError + ']').focus();
                //    SweetAlert.swal("The form cannot be submitted because it contains validation errors!", "Errors are marked with a red, dashed border!", "error");
                return;

            }
            else {
                return;
            }
        }
    };
    vm.getToken = function () {
        $http.get(serviceBase + 'api/ClientToken')
            .success(function (data) {
                vm.token = data;
                braintree.setup(vm.token, "dropin", {
                    container: "paymentContainer",
                    onPaymentMethodReceived: function (data) { vm.loginData.nonce = data.nonce; vm.checkout(); },
                    onError: function (type, message) {

                        vm.message = message;
                    }

                });

            }).error(function (data) {
            });
    }
    vm.getToken();
}]);
app.controller('loginSubscribeCtrl', ["$filter", "$state", "subscriptionService", "authService", "SweetAlert", function ($filter, $state, subscriptionService, authService, SweetAlert) {
    var vm = this;
    vm.agreement = false;
    vm.showAgreement = function () {
        return vm.loginData.customCourses || vm.loginData.customCourses50;
    }
    vm.priceStructures = subscriptionService.priceStructures;
    vm.loginData = authService.loginData;
    vm.selectFree = function () {
        delete vm.loginData.priceStructure.memberPrice;
        delete vm.loginData.priceStructure.branchPrice;
        delete vm.loginData.priceStructure.nonmemberPrice;
        delete vm.loginData.isAALASMember;
        vm.loginData.priceStructure.id = 0;
        vm.loginData.priceStructure.accounts = 0;
        vm.loginData.fee = 0;
        $state.go('login.registration');
    }
    vm.submit = function () {

        if (vm.showAgreement() && !vm.agreement) {
            SweetAlert.swal({
                title: "You must accept the custom courses licensing terms to proceed",
                type: "error"
            })
        }
        else {
            vm.selectGroup();
        }
    }
    vm.selectIndividual = function () {
        vm.loginData.fee = vm.loginData.isAALASMember ? vm.loginData.priceStructure.memberPrice : vm.loginData.priceStructure.nonmemberPrice;
        vm.loginData.total = vm.loginData.fee;
        $state.go('login.registration');
    }
    vm.selectGroup = function () {
        if (angular.isDefined(vm.loginData.branchId))
            vm.loginData.isAALASMember = true;
        vm.loginData.fee = vm.loginData.isAALASMember ? vm.loginData.priceStructure.memberPrice : vm.loginData.priceStructure.nonmemberPrice;
        $state.go('login.registration');
    }
    vm.getPriceStructures = function () {
        subscriptionService.getPriceStructures()
            .success(function (user) {
                if (angular.isDefined(vm.loginData.branchId))
                    vm.priceStructures = $filter('greaterThan')(user);
                else
                    vm.priceStructures = $filter('filter')(user, { id: '!32' });
                vm.loginData.priceStructure = vm.loginData.isGroup ? user[0] : $filter('filter')(user, { id: 32 }, true)[0];
            })
            .error(function (http, status, fnc, httpObj) {
            });
    };
    vm.customCourseFee = function () {
        vm.loginData.customCourseFee = vm.loginData.isAALASMember ? 1000 : 2000
        return vm.loginData.customCourseFee;
    }
    vm.autoLoginFee = function () {
        vm.loginData.autoLoginFee = vm.loginData.isAALASMember ? 350 : 700;
        return vm.loginData.autoLoginFee;
    }
    vm.getPriceStructures();
    vm.total = function () {
        var fee = 0;
        if (angular.isDefined(vm.loginData.priceStructure))
            fee = fee + (angular.isDefined(vm.loginData.branchId) ? vm.loginData.priceStructure.branchPrice : (vm.loginData.isAALASMember ? vm.loginData.priceStructure.memberPrice : vm.loginData.priceStructure.nonmemberPrice));
        if (angular.isDefined(vm.loginData.autoLogin) && vm.loginData.autoLogin)
            fee = fee + (vm.loginData.isAALASMember ? 350 : 700);
        if (angular.isDefined(vm.loginData.customCourses50) && vm.loginData.customCourses50)
            fee = fee + (vm.loginData.isAALASMember ? 1000 : 2000);
        vm.loginData.total = fee;
        return fee;
    }
}]);
