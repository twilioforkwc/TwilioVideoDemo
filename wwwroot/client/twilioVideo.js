$(function () {

	var accessTokenUrl = '../token.php';
	var accessManager;
	var identity;
	var accessTokenLock = false;

	var conversationsClient;
	var activeConversation;
	var previewMedia;

	var messagingClient;
    var generalChannel;
	var $chatWindow = $('#messages');
	var readStatusObj = {};
	var lastConsumedMessageIndex;
	var typingTimer;

	var storage = window.localStorage;

	var reconnectionTimer;
	var isInviting = false;
	var reconnectFlg = false;
	var isAutoAccept = false;

	// check for WebRTC
	if (!navigator.webkitGetUserMedia && !navigator.mozGetUserMedia) {
		sweetAlert("WebRTC Error", "WebRTC is not available in your browser.", "error");
		return false;
	}

	// init
	$('#button-logout').prop('disabled', false);
	$('#chat-input').prop('disabled', true);

	// get Access Token
	var name;
	initName();

	function initName() {
		var storedName = storage.getItem('twClientName');
		if (storedName != null && storedName != '') {
			name = storedName;
		}

		if (!!name) {
			getAccessToken(name);
		}
	}


	function getAccessToken(name) {
		if (accessTokenLock) {return;}

		accessTokenLock = true;
		$('#button-preview').prop('disabled', true);
		$('#invite-to-list').prop('disabled', true);
		$('#button-invite').prop('disabled', true);
		$('#button-logout').prop('disabled', true);
		$('#chat-input').prop('disabled', true);

		if (!accessManager) {
			showSpinner();
		}

		$.getJSON(accessTokenUrl + '?name=' + name, function(response) {

			console.log(response);
			identity = response.identity;

			accessManager = new Twilio.AccessManager(response.token);
			accessManager.on('tokenExpired', function(access_manager) {
				console.log('tokenExpired');
				getAccessToken(name);
			});

			// Create a Conversations Client and connect to Twilio
			conversationsClient = new Twilio.Conversations.Client(accessManager);
			conversationsClient.listen().then(clientConnected, function (error) {
				hideSpinner();
				console.log('Could not connect to Twilio: ' + error.message);
				accessTokenLock = false;
				sweetAlert({
					title: "AccessToken取得エラー",
					text: "[OK]クリックでリトライします。",
					type: "error",
				},
				function(){
					getAccessToken(name);
				});
			});


			// Initialize the IP messaging client and Get the general chat channel
			messagingClient = new Twilio.IPMessaging.Client(accessManager, {"logLevel": "debug"});
			var promise = messagingClient.getChannelByUniqueName(chatUniqueName);
			promise.then(function(channel) {
				generalChannel = channel;
				if (!generalChannel) {
					// If it doesn't exist, let's create it
					messagingClient.createChannel({
						uniqueName: chatUniqueName,
						friendlyName: chatFriendlyName
					}).then(function(channel) {
						console.log('Created general channel:');
						generalChannel = channel;
						setupChannel();
					});
				} else {
					console.log('Found general channel:');
					console.log(generalChannel);
					setupChannel();
				}
			});

		})
		.error(function(jqXHR, textStatus, errorThrown) {
			hideSpinner();
			console.log(textStatus);
			console.log(jqXHR.responseText);
			accessTokenLock = false;
			sweetAlert({
				title: textStatus,
				text: jqXHR.responseText,
				type: "error",
			},
			function(){
				$('#button-logout').prop('disabled', false);
			});
		});
	}


	// Set up channel after it has been found
	function setupChannel() {

		// Join the general channel
		generalChannel.join().then(function(channel) {
			console.log('Enter Chat room');

			// Listen for new messages sent to the channel
			generalChannel.on('messageAdded', function(message) {
				removeTyping();
				printMessage(message.author, message.body, message.index, message.timestamp);
				if (message.author != identity) {
					generalChannel.updateLastConsumedMessageIndex(message.index);
				}
			});

			// 招待先プルダウンの描画
			var storedInviteTo = storage.getItem('twInviteTo');
			generateInviteToList(storedInviteTo);

			// 招待先プルダウンの再描画
			generalChannel.on('memberJoined', function(member) {
				console.log('memberJoined');
				member.on('updated', function(updatedMember) {
					updateMemberMessageReadStatus(updatedMember.identity, 
													updatedMember.lastConsumedMessageIndex || 0, 
													updatedMember.lastConsumptionTimestamp);
					console.log(updatedMember.identity, updatedMember.lastConsumedMessageIndex, updatedMember.lastConsumptionTimestamp);
				});
				generateInviteToList();
			});
			generalChannel.on('memberLeft', function(member) {
				console.log('memberLeft');
				generateInviteToList();
			});

			// Typing Started / Ended
			generalChannel.on('typingStarted', function(member) {
				console.log(member.identity + ' typing started');
				showTyping();
			});
			generalChannel.on('typingEnded', function(member) {
				console.log(member.identity + ' typing ended');
				clearTimeout(typingTimer);
			});

			// 最終既読メッセージindex取得
			generalChannel.getMembers().then(function(members) {
				for (i = 0; i < members.length; i++) {
					var member = members[i];
					member.on('updated', function(updatedMember) {
						updateMemberMessageReadStatus(updatedMember.identity, 
														updatedMember.lastConsumedMessageIndex || 0, 
														updatedMember.lastConsumptionTimestamp);
						console.log(updatedMember.identity, updatedMember.lastConsumedMessageIndex, updatedMember.lastConsumptionTimestamp);
					});
					if (identity != member.identity && inviteToNames.indexOf(member.identity) != -1) {
						readStatusObj[identity] = member.lastConsumedMessageIndex;
					}
				}
				// Get Messages for a previously created channel
				generalChannel.getMessages().then(function(messages) {
					$chatWindow.empty();
					var lastIndex = null;
					for (i = 0; i < messages.length; i++) {
						var message = messages[i];
						printMessage(message.author, message.body, message.index, message.timestamp);
						if (message.author != identity) {
							lastIndex = message.index;
						}
					}
					if (lastIndex && lastIndex >= 0) {
						generalChannel.updateLastConsumedMessageIndex(lastIndex);
					}

					hideSpinner();
					$('#chat-input').prop('disabled', false);
				});

			});

		});

	}


	// Send a new message to the general channel
	var $input = $('#chat-input');
	$input.on('keydown', function(e) {
		if (generalChannel) {
			generalChannel.typing();
			if (e.keyCode == 13) {
				removeTyping();
				generalChannel.sendMessage($input.val());
				$input.val('');
			}
		}
	});

	// Typing message
	function showTyping() {
		var $msg;
		if ($chatWindow.find('.typing').length == 0) {
			$msg = $('<span class="typing">');
			$msg.html('入力中 .');
			$chatWindow.append($msg);
		} else {
			$('.typing').append(' .');
		}
		$chatWindow.scrollTop($chatWindow[0].scrollHeight);
		typingTimer = setTimeout(showTyping, 500);
	}

	function removeTyping() {
		$chatWindow.find('.typing').remove();
		clearTimeout(typingTimer);
	}


	// Helper function to print chat message to the chat window
	function printMessage(fromUser, message, index, timestamp) {
		var $user = $('<span class="username">').text(fromUser + ':');

		if (fromUser === identity) {
			$user.addClass('me');
		}

		var $message = $('<span class="message">').text(message);
		var $timestamp = $('<span class="timestamp">').text(moment(timestamp).format('HH:mm'));
		var readStatusText = (fromUser != identity) ? "" : (!readStatusObj[fromUser]) ? "" : (index > readStatusObj[fromUser]) ? "" : "既読";
		var $readStatus = $('<span class="readStatus ' + fromUser + '_index_' + index + '">').text(readStatusText);
		var $container = $('<div class="message-container">');

		$container.append($user).append($message).append($timestamp).append($readStatus);
		$chatWindow.append($container);
		$chatWindow.scrollTop($chatWindow[0].scrollHeight);
	}


	// 既読表示
	function updateMemberMessageReadStatus(updatedIdentity, lastConsumedMessageIndex, lastConsumptionTimestamp) {
		for (var i = 0; i <= lastConsumedMessageIndex; i++) {
			$('.' + identity + '_index_' + i).text('既読');
		}
	}


	// 招待先プルダウンの描画
	function generateInviteToList(defaultName) {

		var selectedName = $('#invite-to-list').val();
		if (!!selectedName) {
			defaultName = selectedName;
		}

		$("#invite-to-list").children().remove();
		var defaultFlg = false;

		generalChannel.getMembers().then(function(members) {

			var identities = [];
			for (var i = 0; i < members.length; i++) {
				identities.push(members[i].identity);
			}

			for (var i = 0; i < inviteToNames.length; i++) {
				if (inviteToNames[i] != name) {
					var inviteToOption = document.createElement('option');
					var login = (identities.indexOf(inviteToNames[i]) != -1) ? "● " : "× ";
					inviteToOption.value = inviteToNames[i];
					inviteToOption.appendChild(document.createTextNode(login + inviteToNames[i]));
					$("#invite-to-list").append(inviteToOption);
					if (inviteToNames[i] == defaultName) {
						defaultFlg = true;
					}
				}
			}

			if (defaultFlg) {
				$('#invite-to-list').val(defaultName);
			}
		});

	}


	// successfully connected!
	var inviting;	// 招待時にAccessToken有効期限切れによる再取得中フラグ
	function clientConnected() {
		accessTokenLock = false;

		// 表示初期化
		if (!activeConversation) {
			$('#button-preview').prop('disabled', false);
		}
		$('#invite-to-list').prop('disabled', false);
		$('#button-invite').prop('disabled', false);
		$('#button-logout').prop('disabled', false);
		$('#button-logout').text('ログアウト（' + name + '）');

		// error handling
		conversationsClient.on('error', function(error) {
			console.error(new Date(), error);
			sweetAlert({
				title: "ネットワークエラー",
				text: "相手との通信がエラーになりました。",
				type: "error",
			},
			function(){
				reconnectFlg = false;
				disconnect();
			});
		});

		// invited
		conversationsClient.on('invite', function (invite) {

			isInviting = false;

			if (!accessManager) {
				invite.reject();
				disconnect();
				return false;
			}
			if (!isAutoAccept) {
				sweetAlert({
					title: invite.from + " との接続を開始しますか？",
					type: "info",
					showCancelButton: true,
				},
				function(isConfirm){
					if (!isConfirm) {
						invite.reject();
						return false;
					}
					invite.accept().then(conversationStarted);
				});
			} else {
				isAutoAccept = false;
				invite.accept().then(conversationStarted);
			}
		});

		if (inviting) {
			inviting = false;
			$('#button-invite').click();
		}
	};


	// conversation is live
	function conversationStarted(conversation) {

		hideSpinner();

		$('#button-invite').text('切断');
		$('#button-preview').prop('disabled', true);
		$('#button-preview').text('プレビューOff');

		reconnectionTimer = setTimeout(reconnect, conversationLimitTime);

		activeConversation = conversation;
		// draw local video, if not already previewing
		if (!previewMedia) {
			conversation.localMedia.attach('#local-media');
		}
		// when a participant joins, draw their video on screen
		conversation.on('participantConnected', function (participant) {
			$('#remote-media').empty();
			participant.media.attach('#remote-media');
		});

		// when a participant disconnects, note in log
		conversation.on('participantDisconnected', function (participant) {
			console.log(new Date(), participant);
			disconnect();

			isAutoAccept = (!isInviting) ? true : false;

			if (reconnectFlg) {
				$('#button-invite').click();
			}
		});

	};

	// bind button to create conversation
	$('#button-invite').click(function () {
		reconnectFlg = false;

		if (accessManager && accessManager.isExpired) {
			inviting = true;
			getAccessToken(name);
			return false;
		}

		var statusText = $('#button-invite').text();
		if (statusText == '切断') {
			reconnectFlg = false;
			disconnect();
			return false;
		} else {

			isInviting = true;

			var inviteTo = $('#invite-to-list').val();
			if (!!inviteTo) {
				storage.setItem('twInviteTo', inviteTo);
			} else {
				return false;
			}

			showSpinner();
			if (activeConversation) {
				// add a participant
				activeConversation.invite(inviteTo);
			} else {
				// create a conversation
				var options = {};
				if (previewMedia) {
					options.localMedia = previewMedia;
				}
				conversationsClient.inviteToConversation(inviteTo, options).then(
					conversationStarted,
					function (error) {
						console.error('Unable to create conversation', error);
						hideSpinner();
						sweetAlert("接続できませんでした。", "接続先がログインしていない可能性があります。", "error");
						return false;
					}
				);
			}
		}
	});


	// disconnect active conversation
	function disconnect() {

		clearTimeout(reconnectionTimer);

		if (activeConversation) {
			activeConversation.localMedia.stop();
			activeConversation.disconnect();
			activeConversation = null;
		}

		if (!!previewMedia) {
			previewMedia.detach('#local-media');
			previewMedia = null;
		}
		$('#remote-media').empty();
		$('#local-media').empty();
		$('#button-invite').text('接続');
		$('#button-preview').text('プレビューOn');
		$('#button-preview').prop('disabled', false);

	}



	// login / logout
	$('#button-logout').click(function () {
		if ($('#button-logout').text() == 'ログイン') {
			var dialog_div = $('<div id="dialog"></div>');
			$(document.body).append(dialog_div);
			var userSelectHtml = '';
			for (var i = 0; i < inviteToNames.length; i++) {
				if (userSelectHtml != '') {
					userSelectHtml += '<br />';
				}
				userSelectHtml += '<button class="user">' + inviteToNames[i] + '</button>';
			}

			$("#dialog").html(userSelectHtml);
			$(".user").css({"position": "relative", "width": "350px", "height": "50px", "margin": "10px"});

			$("#dialog").dialog({
				modal: true,
				width: 'auto',
				height: 'auto',
				title: 'ログイン',
				dialogClass: 'noTitleDialog',
				open: function() {
					$(this).find('button').blur();
					$('.user').click(function () {
						name = $(this).text();
						storage.setItem('twClientName', name);
						getAccessToken(name);
						$("#dialog").dialog("close");
					});
				},
				close: function() {
					$(this).dialog("destroy").remove();
				}
			});

		} else {

			storage.removeItem('twClientName', '');
			location.reload();
		}
	});


	// 画面離脱時の処理
	$(window).bind("beforeunload", function() {

		console.log('beforeunload');

		disconnect();

		$('#button-preview').prop('disabled', true);
		$('#invite-to-list').prop('disabled', true);
		$('#button-invite').prop('disabled', true);
		$('#button-logout').prop('disabled', true);

		if (generalChannel) {
			//var ret = generalChannel.sendMessage('（ログアウトしました）');
			var channel = generalChannel.leave();
			console.log(channel);
			console.log('leaved.');
		}

	});

	// ビデオ通話時間上限（4時間）の前に自動再接続
	function reconnect() {
		reconnectFlg = (isInviting) ? true : false;
		disconnect();
	}


	//  local video preview
	$('#button-preview').click(function () {
		var btnText = $('#button-preview').text();
		if (btnText == 'プレビューOff') {
			previewMedia.detach('#local-media');
			previewMedia = null;
			$('#local-media').empty();
			$('#button-preview').text('プレビューOn');
		} else {
			if (!previewMedia) {
				previewMedia = new Twilio.Conversations.LocalMedia();
			}
			Twilio.Conversations.getUserMedia().then(
				function (mediaStream) {
					previewMedia.addStream(mediaStream);
					previewMedia.attach('#local-media');
				},
				function (error) {
					console.error('Unable to access local media', error);
				}
			);
			$('#button-preview').text('プレビューOff');
		}

	});


	//// スピナーを動作させる関数
	function showSpinner() {
		// 要素作成等初期化処理
		if ($('.spinner').length == 0) {
			// スピナー設置用要素と背景要素の作成
			var spin_div = $('<div id ="spin" class="spinner"></div>');
			var spin_bg_div = $('<div id ="spin-bg" class="spinner"></div>');

			// スピナー用要素をbodyにappend
			$(document.body).append(spin_div, spin_bg_div);

			// 背景色設定
			$(spin_bg_div).css({
				'position': 'fixed',
				'z-index': '10000',
				'top': '0px',
				'left': '0px',
				'width': '100%',
				'height': '100%',
				'background-color': '#000000',
				'opacity': '0.5',
				'filter': 'alpha(opacity=50)',
				'-ms-filter': "alpha(opacity=50)"
			});

			// スピナーに対するオプション設定
			var opts = {
				  lines: 13 // The number of lines to draw
				, length: 44 // The length of each line
				, width: 14 // The line thickness
				, radius: 43 // The radius of the inner circle
				, scale: 0.7 // Scales overall size of the spinner
				, corners: 1 // Corner roundness (0..1)
				, color: '#fff' // #rgb or #rrggbb or array of colors
				, opacity: 0.3 // Opacity of the lines
				, rotate: 0 // The rotation offset
				, direction: 1 // 1: clockwise, -1: counterclockwise
				, speed: 1 // Rounds per second
				, trail: 60 // Afterglow percentage
				, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
				, zIndex: 2e9 // The z-index (defaults to 2000000000)
				, className: 'spinner' // The CSS class to assign to the spinner
				, top: '50%' // Top position relative to parent
				, left: '50%' // Left position relative to parent
				, shadow: false // Whether to render a shadow
				, hwaccel: false // Whether to use hardware acceleration
				, position: 'fixed' // Element positioning
			};

			// スピナーを作動
			new Spinner(opts).spin(document.getElementById('spin'));

		}

		// スピナー始動（表示）
		$('.spinner').show();
	}

	// スピナーを停止させる関数
	function hideSpinner() {
		// スピナー停止（非表示）
		$('.spinner').hide();
	}


});

