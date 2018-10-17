app.controller('interfaceState', function($scope, $state, $cookies, interface, jwtHelper, formInputValidate, $sce, messageParser, $window, mediaApi, $rootScope){
    // User data
    var token = $cookies.get('accessToken');
   
    if(typeof token === 'undefined'){ $state.go('login'); };
    $scope.user = jwtHelper.decodeToken(token);
    $scope.logout = function(){
		$cookies.remove('accessToken');
		$state.go('login');
	};
    
    // Chat data
    var failed = false;
    var currentReqStart = 0;
    var currentReqEnd = 0;
    $scope.chatrooms = [];
    $scope.joined = $cookies.get('chatroom') != undefined ? $cookies.get('chatroom') : false;
    $scope.joinedUsers = [];
	$scope.posts = [];
    $scope.joinChat = function(name){
        $scope.messages = [];
        interface.join(name);
        interface.getMessages(name).then(function(res){
            currentReqStart = res.length;
            currentReqEnd = currentReqStart - 30;
            res.map(function(e, i){
                if(i >= currentReqEnd && i <= currentReqStart){
                    $scope.messages.push(e);
                    //console.log(i);
                }
            });
            $scope.messages.map(function(e, i){
                 var time = new Date(e.sentAt)
                 e.date = getDate(time);
                 e.editing = false;
             })
        })
        
    };
    interface.getUsersProfile().then(function(res){   
    $scope.usersUriArr = res;
    console.log(res)
    $scope.getProfileUri = function(username){
        var location;
        $scope.usersUriArr.map(function(e, i){
            console.log(e.username, username);
            if(e.username == username){
                if(e.cropped == true){
                    location = e.uri + 'cropped.png'; 
                } else if(e.thumb == true) {
                    location = e.uri + 'thumb.' + e.type; 
                } else {
                    location = e.uri + 'original.' + e.type; 
                }
            }
        });
        return location;
    }
    }, function(err){
        console.log(err);
    });
    $scope.leaveChat = function(){
        interface.leave($scope.joined);
        $scope.joined = false;
        $scope.messages = [];
    };
    
    // Handle external user(s) joining/leaving chat room and make an alert message.
    var userCb = function(data){
        if(data.addUser == true) { 
            console.log(data.user.username);
            var existsNum = 0;
            $scope.joinedUsers.map(function(e, i){
                // Make sure user is not already in chat
                if(e.username == data.user.username){
                    existsNum++;
                }
            })
            if(existsNum == 0){
                // Alert user joined
                var dt = new Date(Date.now());
                console.log(data.user.uri)
                $scope.joinedUsers.push({ username: data.user.username, uri: data.user.uri, type: data.user.type });  
                $scope.messages.push({ date: getDate(dt), sentAt: Date.now(), user: data.user.username, parts: [{ type: 'alert' , user: data.user.username, alert: 'has joined the chatroom.'}], editing: false })
                $scope.$apply();                                                                       
            } 
        };
        if(data.addUser == false){ $scope.joinedUsers.map(function(e, i){ if(e.username == data.user.username){ 
            // Alert user left
            var dt = new Date(Date.now());
            $scope.joinedUsers.splice(i, 1); 
            $scope.messages.push({ date: getDate(dt), sentAt: Date.now(), user: data.user.username, parts: [{ type: 'alert' , user: data.user.username, alert: 'has left the chatroom.' }], editing: false })
            $scope.$apply();                                                                                 
        } }); }
        if(data.addUser === 'multiple'){ 
            // Used when a client first joins to get list of users that are already present in chatroom.
            $scope.joinedUsers = data.users;
        };
    }
    
    // Service uses our callback function defined above to handle users joining/leaving.
    interface.userPromiseCb(userCb)
    
    // Cht error handling
    var refreshJoined = function(){ 
        $scope.joined = $cookies.get('chatroom');
        $scope.$apply();
    };
    var promCb = function(err){
        // Had to improvise with the time I had, so I made updating an error to meet deadline.
        if(err){
            console.log(err);
			if(err == 'update') {
				refrRooms();
			}
        } else {
            refreshJoined();
            refrRooms();
        }
    };
   
    // Promises and db resources
    interface.promise(promCb);
    var refrRooms = function(){
        // Refresh listing of available chatrooms.
        interface.getRooms().then(function(res){
            $scope.chatrooms = res;
        }, function(err){
            console.log(err);
        });
    }
    var refrUsers = function(type){
        // Refresh listing of users that can then be excluded or included in a private chat.
        interface.getUsers().then(function(res){
            var usrArr = [];
            usrArr[0] = 'wait';
            for(var i=0; i < res.length; i++){
                if($scope.user.username == res[i].username){
                    usrArr[0] = { username: $scope.user.username, creator: true, included: true };
                } else {
                    usrArr.push({ username: res[i].username, creator: false, included: false });
                }
            }
            if(type == 'add'){ $scope.addUsers = usrArr; }
            if(type == 'edit'){ 
				$scope.editUsers = usrArr; 
				if($scope.editroom.users != []){
					for(var i=0; i < $scope.editUsers.length; i++){
						if($scope.editroom.users[i] != undefined){
							if($scope.editroom.users[i] == $scope.editUsers[i].username){
								$scope.editUsers[i].included = true;
								
							}
						}
					}    
				}
			}
        }, function(err){
            console.log(err);
        });
    }
    refrRooms();
    
    // Create chatroom
    $scope.newroom = { name: '', private: false, users: []};
    $scope.addErrs = { name: '', private: '', users: '' };
    $scope.adding = false;
    $scope.addUsers = [];
    $scope.toggleCreate = function(){
        $scope.adding = $scope.adding == true ? false : true;
    };
    refrUsers('add');
	var injectUsers = function(type){
        var arr;
        var array;
        var obj;
        if(type == 'add'){ $scope.newroom.users = []; array = $scope.newroom.users; obj = $scope.newroom; arr = $scope.addUsers }
        if(type == 'edit'){ $scope.editroom.users = []; array = $scope.editroom.users; obj = $scope.editroom; arr = $scope.editUsers }
		for(var i=0; i < arr.length; i++){
			if(arr[i].included == true){
				array.push(arr[i].username);	
			} else if(arr[i].creator == true){
				obj.creator = arr[i].username;
			}	
		};
	};
    $scope.createRoom = function(){
		// Grab all added users
		var data;
		var src = $scope.newroom;
		if($scope.newroom.private == true){
			injectUsers('add');
			data = src;	
		} else {
			data = { name: $scope.newroom.name, private:  $scope.newroom.private, users: [] };
		}
		var errs = formInputValidate.check(data);
		if(errs.num == 0){
			console.log(data)
			interface.createRoom(data).then(function(res){
				refrRooms();
				$scope.adding = false;
			}, function(err){
				console.log(err);
			})
		} else {
			console.log(errs);	
		}
    };
    
    // Delete room
    
    $scope.deleteRoom = function(name){
        interface.deleteRoom({ name: name }).then(function(res){
            refrRooms();
            $scope.editing = false;
        }, function(err){
            console.log(err);
        })
    };
    
    // Edit Room
    $scope.editInitial = {};
    $scope.editroom = {};
    $scope.editing = false;
    $scope.editUsers = []
    $scope.toggleEdit = function(index){
        if($scope.editing == false){
            $scope.editing = true;
            $scope.editroom = $scope.chatrooms[index];
            $scope.editInitial = angular.copy($scope.chatrooms[index]);
            refrUsers('edit');
			//$scope.$apply();
        } else {
            $scope.editing = false;
			refrRooms();
        }
    };
    $scope.editRoom = function(){
        var data;
		var src = $scope.editroom;
		if(src.private == true){
			injectUsers('edit');
			data = src;
            console.log(data);
		} else {
			data = { name: src.name, private:  src.private, users: [], user: $scope.user.username };
		}
        var errs = formInputValidate.check(data);
        if(errs.num == 0){
            interface.editRoom($scope.editInitial, $scope.editroom).then(function(res){
                $scope.editing = false;
            }, function(err){
                console.log(err);
            })    
        } else {
            console.log(errs);
        }
    }
    
    // Join chat if already in cookie
    if($scope.joined != false){
        $scope.messages = [];
        interface.join($scope.joined);
        interface.getMessages($scope.joined).then(function(res){
            $scope.messages = [];
            currentReqStart = res.length;
            currentReqEnd = currentReqStart - 25;
            res.map(function(e, i){
                if(i >= currentReqEnd && i <= currentReqStart){
                    $scope.messages.push(e);
                }
            });
            $scope.messages.map(function(e, i){
                 var time = new Date(e.sentAt)
                 e.date = getDate(time);
                 e.editing = false;
             })
        })
    }
    
    // Scrolling
    var messageScroll;
    $('.messageChatArea, .msgAreaParent, .message').ready(function(){
        // Set msg chat area height to height of all messages combined
        messageScroll = new PerfectScrollbar('.msgAreaParent', { wheelSpeed: 3 });
        
    })
    var scroll = function(){
        messageScroll.update();
         $('.messageAreaParent, .messageChatArea, .message').ready(function(){
            var elem = document.getElementsByClassName('msgAreaParent')[0];
            var y = $('.msgAreaParent').scrollTop();
            var hInit = $('.messageChatArea').innerHeight() - $('.msgAreaParent').outerHeight();
            var h = Math.round(hInit);
            var range = h - 400;
            $scope.atBottom = range <= y && y <= h;
            if($scope.atBottom == true){
                console.log('scrolled to bottom')
                $(".msgAreaParent").animate({
                     scrollTop: elem.scrollHeight
                 }, 600);
            } else {
                $rootScope.newMsgCount++;
                $scope.$apply();
            }
        });
    }
    
    $rootScope.newMsgCount = 0;
    $scope.atBottom = true;
    $scope.scrollToBottom = function(){
        var hInit = $('.messageChatArea').innerHeight() - $('.msgAreaParent').outerHeight();
        var h = Math.round(hInit);
        $(".msgAreaParent").animate({
             scrollTop: h
        }, 600);
    }
    $scope.$watch('atBottom', function(newV, oldV){
        if(oldV == false && newV == true){
            $rootScope.newMsgCount = 0;
            // User has scrolled to bottom of page and has seen all new messages.
        }
    })
    
    // Messaging
    
    $scope.messages = [];
    $scope.trustUrl = function(url){
        return $sce.trustAsResourceUrl(url);
    };
    $scope.message = { text: "" };
    $scope.sendMessage = function(event){
		if($scope.message.text != "" && event.keyCode === 13){
			var cb = function(res){
				var dt = new Date(res.sentAt);
				res.date = getDate(dt);
				res.editing = false;
				$scope.messages.push(res);
			}
			interface.send($scope.message.text, cb);
			$scope.message.text = "";
            scroll();
		}
    }
    var getDate = function (date) {
              var year = date.getFullYear();
              var monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
              var month = (1 + date.getMonth()).toString();
              month = month.length > 1 ? month : '0' + month;
              var day = date.getDate().toString();
              day = day.length > 1 ? day : '0' + day;
              var hours = date.getHours();
              var minutes = date.getMinutes();
              var ampm = hours >= 12 ? 'pm' : 'am';
              hours = hours % 12;
              hours = hours ? hours : 12; // the hour '0' should be '12'
              minutes = minutes < 10 ? '0'+minutes : minutes;
              var strTime = hours + ':' + minutes + ' ' + ampm;
              return monthNames[month - 1] + ' ' + Math.round(day) + ', ' + year + ' ' + strTime;
    };
    var msgCb = function(msgData){
        var dt = new Date(Date.now());
        msgData.date = getDate(dt);
        msgData.editing = false;
        $scope.messages.push(msgData);
        $scope.$apply();
        scroll();
    }
 
  
    $('#msgAreaParent').scroll(function(){
        var elem = document.getElementById('msgAreaParent');
        var y = $('.msgAreaParent').scrollTop();
          var hInit = $('.messageChatArea').innerHeight() - $('.msgAreaParent').outerHeight();
          var h = Math.round(hInit);
          var range = h - 400;
          if(range <= y && y <= h){
              $rootScope.newMsgCount = 0;
              $('.chatScrollToBottom').addClass('chatScrollToBottomHidden')
          } else {
              $('.chatScrollToBottom').removeClass('chatScrollToBottomHidden');
          }
    })
    interface.incoming(msgCb);
    $scope.editMessage = function(query, pos){
        var m = $scope.messages[pos];
        var newParts = messageParser(query.edit);
        var q = { _id: m._id, chatroom: m.chatroom, text: m.text };
        var d = { parts: newParts, user: m.user, chatroom: m.chatroom, sentAt: m.sentAt, text: query.edit }
        interface.editMessage(q, d).then(function(res){
            m.parts = newParts;
            m.text = query.edit;
            m.editing = false;
        }, function(err){
            console.log(err);
        });
    };    
    
    $scope.deleteMessage = function(query){
        interface.delMessage(query).then(function(res){
        $scope.messages.map(function(e, i){
            if(query == e){
                $scope.messages.splice(i, 1);
            }
        })
        }, function(err){
            console.log(err);
        })
    }
    
    var msgDelCb = function(id){
        $scope.messages.map(function(e, i){
            console.log(e._id + ' ' + id)
            if(e._id == id){
                $scope.messages.splice(i, 1);
                $scope.$apply();
            }
        })
    };
    
     var msgEditCb = function(id, text, parts){
        $scope.messages.map(function(e, i){
            if(e._id == id){
                $scope.messages[i].parts = parts;
                $scope.messages[i].text = text;
                $scope.$apply();
            }
        })
    };
    
    interface.msgEditPromise(msgEditCb);
    
    interface.msgDelPromise(msgDelCb);
    
    // Sidebar 
    
    $scope.sidebarExpanded = false;
    $scope.sidebarToggle = function(){
        if($scope.sidebarExpanded == false){
            $scope.sidebarExpanded = true;
            $('.chatAreaWindow').addClass('chatWindowExpanded');
            $('.apiSearchArea').addClass('chatWindowExpanded');
            $('.chatSidebar').addClass('sidebarExpanded');
            $('.chatSidebar').removeClass('sidebarCollapsed');
        } else if($scope.sidebarExpanded == true){
            $scope.sidebarExpanded = false;
            $('.chatAreaWindow').removeClass('chatWindowExpanded');
            $('.apiSearchArea').removeClass('chatWindowExpanded');
            $('.chatSidebar').removeClass('sidebarExpanded');
            $('.chatSidebar').addClass('sidebarCollapsed');
        }
    };
    
    // Image/Video Search Api
    
    $scope.apiResults = [];
    $scope.searchToggleBool = false;
    $scope.searchToggle = function(){
        $scope.searchToggleBool = $scope.searchToggleBool == true ? false : true;
    };
    $scope.vidSearch = function(keyword){
        mediaApi.videos(keyword).then(function(res){
            if($scope.apiResults.length > 0 && $scope.apiResults.length < 50){
                $scope.apiResults = $scope.apiResults.concat(res);
            } else {
                $scope.apiResults = res;
            };
        }, function(err){
            console.log(err);
        })
    }
    $scope.imgSearch = function(keyword){
        mediaApi.images(keyword).then(function(res){
           if($scope.apiResults.length > 0){
                $scope.apiResults = $scope.apiResults.concat(res);
            } else {
                $scope.apiResults = res;
            };
        }, function(err){
            console.log(err);
        })
    };
    
    $scope.gifSearch = function(keyword){
        mediaApi.gifs(keyword).then(function(res){
           if($scope.apiResults.length > 0){
                $scope.apiResults = $scope.apiResults.concat(res);
            } else {
                $scope.apiResults = res;
            };
        }, function(err){
            console.log(err);
        })
    };
    
    $scope.addToMsg = function(uri){
        $scope.message.text = $scope.message.text + ' ' + uri;
        $scope.apiResults.map(function(e, i){
            e.viewed = false;
        });
        $scope.searchToggle();
        $scope.apiResults = [];
        $scope.$apply();
        console.log($scope.apiResults)
    }
    
    // Form validation
    $scope.validate = function(input, field){
        var obj = {};
        obj[field] = input;
        if(input != undefined){
            var errs = formInputValidate.check(obj);
            if(errs.num > 0){
                $scope.addErrs[field] = errs[field];
            } else if(field === "username") {
                if(input != $scope.user.username && input != $scope.user.email){
                    formInputValidate.taken(field, input).then(function(res){
                        if(res.length != 0){
                            var capLetter = field.charAt(0).toUpperCase(), restStr = field.split(field[0]), fullStr = capLetter + restStr[1] + ' is already taken.'  
                            $scope.addErrs[field] = fullStr;
                        } else {
                           $scope.addErrs[field] = ""; 
                        }
                    })  
                }
            } else {
                $scope.addErrs[field] = "";
            }    
        }
     }
});