app.controller('profileState', function($scope, $cookies, jwtHelper, $state, assets, ngDialog, profile, formInputValidate, profile){
	// Check if user is logged in and redirect to login if not.
    if($cookies.get('accessToken') == undefined){
        $state.go('login');
    }
    var token = $cookies.get('accessToken');
    
    // Scope vars for user data and profile img.
	$scope.user = jwtHelper.decodeToken(token);
	$scope.eUser = { username: $scope.user.username, email: $scope.user.email, desc: $scope.user.desc };
    $scope.userImgUri = '';
    $scope.imgUriFolder = '';
    $scope.imgType = '';
    $scope.editing = false;
    $scope.errors = {};
    
    // Profile img edit
    $scope.profileLoading = false;
    $scope.currentFile = "";
    $scope.changeFile = function(files){
        $scope.currentFile = files[0];
        $scope.$apply();
    }
    
    // Profile editing 
    
    $scope.toggleEdit = function(){
        if($scope.editing == false){
            $scope.editing = true;
        } else {
            $scope.editing = false;
        }
    }
   
    
    $scope.put = function(){
        var formData = new FormData();
        var formDataSetup = function(){
            formData.append('username', $scope.eUser.username)
            formData.append('email', $scope.eUser.email)
            formData.append('desc', $scope.eUser.desc)
            if($scope.currentFile != ""){ formData.append('profile', $scope.currentFile) }
        };
        var errors = formInputValidate.check($scope.eUser);
        console.log(errors);
        if(/(\.jpg|\.JPG|\.JPEG|\.jpeg|\.png|\.PNG|\.gif|\.GIF)$/g.test($scope.currentFile.name) == false && $scope.currentFile != ""){
            errors.num += 1;
            $scope.errors.profile = 'Profile image must be a image file';
            console.log('file error')
        }
        if(errors.num == 0){
            formDataSetup();
            profile.edit(formData).then(function(response){
                $state.go('profile');
                refresh();
            }, function(error){
                console.log(error);
            });
        } else {
            $scope.errors = errors;
            if(/(\.jpg|\.JPG|\.JPEG|\.jpeg|\.png|\.PNG|\.gif|\.GIF)$/g.test($scope.currentFile.name) == false && $scope.currentFile != "") 
            {$scope.errors.profile = 'Profile image must be a image file';}
        }
    };
    
	
	// Cropping functions for editing profile img
    $scope.saveCrop = function(){
		assets.crop($scope.user.username ,$scope.cropped.image).then(function(response){
            console.log(response);
        }, function(err){
            console.log(err);
        });
		ngDialog.closeAll();
		$scope.userImgUri = $scope.cropped.image;
	};
    
    $scope.del = function(){
        profile.remove().then(function(res){
            console.log(res);
            $state.go('login');
        });
    };
	
    $scope.crop = function(){
        ngDialog.open({ template: 'partials/directives/cropper.html', 
            scope: $scope, 
            width: '100vw', 
            height: '70vh',
            showClose: false           
        });
    }
	
	// Form validate function for editing profile
	$scope.validate = function(input, field){
        var obj = {};
        obj[field] = input;
        if(input != undefined){
            var errs = formInputValidate.check(obj);
            if(errs.num > 0){
                $scope.errors[field] = errs[field];
                console.log(JSON.stringify(errs[field]));
                //$scope.$apply();
            } else if(field === "username" || field === "email") {
                if(input != $scope.user.username && input != $scope.user.email){
                    formInputValidate.taken(field, input).then(function(res){
                        if(res.length != 0){
                            var capLetter = field.charAt(0).toUpperCase(), restStr = field.split(field[0]), fullStr = capLetter + restStr[1] + ' is already taken.'  
                            $scope.errors[field] = fullStr;
                        } else {
                           $scope.errors[field] = ""; 
                        }
                    })  
                }
            } else {
                $scope.errors[field] = "";
            }    
        }
     };
    
    // Get profile image
    $scope.canCrop = false;
    assets.get($scope.user.username, 'profile').then(function(response){
        if(response.thumb == true){
            if(response.cropped == true){
                $scope.userImgUri = response.uri + 'cropped.png';
                //$scope.$apply();
            } else {
                $scope.userImgUri = response.uri + 'default.' + response.type;
                //$scope.$apply();
            }
            
            $scope.imgUriFolder = response.uri;
            $scope.imgType = response.type;
			console.log(response.scaled)
			if(response.scaled == true){
				$scope.canCrop = true;
			} else {
				$scope.canCrop = false;
			}
            $scope.cropped = {
                source: response.uri + 'scaled.' + response.type
            };
            console.log(response);
        } else {
            $scope.userImgUri = response.uri + 'original.' + response.type;
            //$scope.$apply();
        }
    }, function(err){
        console.log(err);
    })
    
    // Logout
    
    $scope.logout = function(){
        $cookies.remove('accessToken');
        $state.go('login');
    };
    
    // Add images to gallery
    var gAdding = false;
    $scope.galleryLoading = true;
    $scope.galleryDText = 'Remove images from gallery';
    $scope.galleryT = false;
    $scope.galleryD = false;
    $scope.gallery = [];
    var gCurrentFiles = "";
    $scope.gChangeFile = function(files){
        if(gAdding == false){
            $scope.gCurrentFiles = files;
            $scope.$apply();    
        }
    }
    $scope.addToGallery = function(){
        gAdding = true;
        $scope.galleryLoading = true;
        var maxLimit = $scope.gCurrentFiles.length;
        var currentFiles = $scope.gCurrentFiles;
        var i = 0;
        var fullRes = [];
        var main = function(){
            var fd = new FormData();
            fd.append('file', currentFiles[i]);
            assets.create(fd).then(function(res){
                    fullRes.push(res);
                    loop();
                }, function(err){
                    console.log(err);
                    loop();
            })    
            i++;
        };
        var loop = function(){
            if(i <= maxLimit - 1){
                main();
                //loop();
            }
            if(i == maxLimit){
                    gAdding = false;
                    console.log('rn')
                    setTimeout(function(){
                        galleryData();
                        $scope.galleryLoading = false;
                        $scope.gCurrentFiles = [];
                    }, 2000);
            }
        }
        if($scope.gCurrentFiles.length > 0){
            main();
        }
    };
    
    $scope.galleryToggle = function(){
        if($scope.galleryT == false){
            $scope.galleryT = true;
        } else {
            $scope.galleryT = false;
        }
    }
    
    
	
	// Gallery
    var galleryData = function(){
        var cb = function(res){
           console.log(res);
           if(Array.isArray(res)){
               $scope.gallery = [];
                for(var i=0; i < res.length; i++){
                    res[i].delete = false;
                    $scope.gallery.push(res[i]);
                    console.log(res[i].uri)
                    if(i == res.length - 1){ /*console.log(JSON.stringify($scope.gallery))*/ }
                }
            } else {
                $scope.gallery = [];
                res.delete = false;
                $scope.gallery.push(res);
                console.log("notArray")
                $scope.$apply();
            }
        }
        assets.get($scope.user.username, 'gallery').then(function(res){
            cb(res);
            $scope.galleryLoading = false;
        }, function(err){
            console.log(err);
        })
    }
    
    // Gallery Delete
    
    $scope.galleryDelToggle = function(){
        if($scope.galleryD == false){
            $scope.galleryD = true;
            $scope.galleryDText = 'Stop removing images from gallery';
        } else {
            $scope.galleryD = false;
            $scope.galleryDText = 'Remove images from gallery';
        }
    }
    
    galleryData();
    
    $scope.galleryDel = function(){
        var maxLimit = $scope.gallery.length;
        //var delArray = [];
        var i = 0;
        var main = function(){
           if($scope.gallery[i].delete == true){
            assets.remove(JSON.stringify([{ uri: $scope.gallery[i].uri, user: $scope.gallery[i].user, filename: $scope.gallery[i].filename }])).then(function(res){
                console.log(res);
                //console.log($scope.gallery[i]);
        
                //$scope.gallery.splice(i, 1);
                loop();
            }, function(err){
                console.log(err);
                loop();
            })
            i++;
        } else {
            console.log(i + ' not deleting')
            i++;
            loop();
        }
        }
        var loop = function(){
            if(i <= maxLimit - 1){
                main();
                if(i == maxLimit){
                    for(var s = maxLimit - 1; s >= 0; s--){
                        if($scope.gallery[s].delete == true){
                            $scope.gallery.splice(s, 1);
                        }
                    }
                    if($scope.gallery.length == 0){
                       $scope.galleryD = false;
                       $scope.galleryDText = 'Remove images from gallery';
                    }
                }
                //loop();
            }
        }
        if(maxLimit > 0){
            main();
        }
    }
    
    var all = false;
    $scope.gallerySAText = "Select All";
    $scope.galleryDelSelectAll = function(){
        if(all == false){
            all = true;
            $scope.gallerySAText = "Deselect All";
        } else {
            all = false;
            $scope.gallerySAText = "Select All";
        }
        for(var w=0; w < $scope.gallery.length; w++){
            $scope.gallery[w].delete = all;
        }
    }
    
    $scope.galleryDelSelect = function(img){
        if($scope.galleryD && img !== undefined){
           if(img.delete == undefined) img.delete = false;
           img.delete = img.delete == true ? false : true;
        }
    };
    
    // Gallery set to profile picture
    
    $scope.gallerySetAsProfile = function(imgData){
        if($scope.profileLoading == false && $scope.galleryD == false && gAdding == false){
            assets.editProfile(imgData).then(function(res){
                refresh();
                galleryData();
            }, function(err){
                console.log(err);
            })    
        }
    };
    
    // Get new profile data
    
    var refresh = function(){
        $scope.profileLoading = true;
        token = $cookies.get('accessToken');
        $scope.user = jwtHelper.decodeToken(token);
        $scope.editing = false;
        $scope.currentFile = "";
        formData = new FormData();
        $scope.eUser = { username: $scope.user.username, email: $scope.user.email, desc: $scope.user.desc };
        setTimeout(function(){
              assets.get($scope.user.username, 'profile').then(function(response){
            if(response.thumb == true){
                if(response.cropped == true){
                    $scope.userImgUri = response.uri + 'cropped.png';
                    //$scope.$apply();
                } else {
                    $scope.userImgUri = response.uri + 'default.' + response.type;
                    //$scope.$apply();
                }

                $scope.imgUriFolder = response.uri;
                $scope.imgType = response.type;
				if(response.scaled == true){
				$scope.canCrop = true;
				} else {
					$scope.canCrop = false;
				}
				$scope.cropped = {
					source: response.uri + 'scaled.' + response.type
				};
                $scope.cropped = {
                    source: response.uri + 'scaled.' + response.type
                };
                console.log(response);
            } else {
                    $scope.userImgUri = response.uri + 'original.' + response.type;
                    //$scope.$apply();
                }
            }, function(err){
                console.log(err);
            })  
            if(formData.get('profile') != ""){
                    galleryData();
            }
            $scope.profileLoading = false;
        }, 3000)
        
    };
})