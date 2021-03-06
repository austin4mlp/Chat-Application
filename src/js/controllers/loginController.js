app.controller('loginState', function(login, $scope, $state, formInputValidate, $cookies){
    if($cookies.get('accessToken') != undefined){
        // Redirect to interface if already logged in.
        $state.go('interface');
    };
    $scope.loginMain = function(){
        var errors = formInputValidate.check($scope.user);
        if(errors.num == 0){
                var loginData = { username: $scope.user.username, password: $scope.user.password };
                loginData.password = sha256(loginData.password);
                login(loginData).then(function(response){
                    $state.go('profile');
                }, function(error){
                    $scope.errors.main = "User not found.";
                });
            } else {
                $scope.errors = errors;
            }
    };
    $scope.user = { username: "", password: "" };
    $scope.errors = {};
    $scope.validate = function(input, field){
            var obj = {};
            obj[field] = input;
            if(input != undefined){
                var errs = formInputValidate.check(obj);
                if(errs.num > 0){
                    $scope.errors[field] = errs[field];
                    console.log(JSON.stringify(errs[field]));
                } else {
                    $scope.errors[field] = "";
                }    
            }
    };
});