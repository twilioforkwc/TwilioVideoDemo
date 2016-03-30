<?php
require_once 'basicAuth.php';
?>
<html>
	<head>
		<title>Twilio Video</title>
		<link rel="stylesheet" href="twilioVideo.css">
		<link rel="stylesheet" href="jquery-ui-1.11.4.min.css">
		<link rel="stylesheet" href="sweetalert.css">
	</head>
	<body>
		<div id="controls">
			<div id="preview-controls">
				<button id="button-preview" disabled="disabled">プレビューOn</button>
			</div>
			<div id="invite-controls">
				<div id="invite-controls-elm">
					<select id="invite-to-list" disabled="disabled">
					</select>
					<button id="button-invite" disabled="disabled">接続</button>
				</div>
			</div>
			<div id="logout-controls">
				<button id="button-logout" disabled="disabled">ログイン</button>
			</div>
		</div>
		<div id="media">
			<div id="remote-media"></div>
			<div id="local-media"></div>
			<div id="chat">
				<div id="messages"></div>
				<div id="text-input"><input id="chat-input" type="text" disabled="disabled" placeholder="チャットしてみましょう！" autofocus/></div>
			</div>
		</div>
		<script src="https://media.twiliocdn.com/sdk/js/common/releases/0.1.4/twilio-common.min.js"></script>
		<script src="https://media.twiliocdn.com/sdk/js/conversations/releases/0.13.4/twilio-conversations.min.js"></script>
		<script src="https://media.twiliocdn.com/sdk/rtc/js/ip-messaging/v0.9/twilio-ip-messaging.min.js"></script>
		<script src="moment.min.js"></script>
		<script src="jquery-2.1.4.min.js"></script>
		<script src="jquery-ui-1.11.4.min.js"></script>
		<script src="spin.min.js"></script>
		<script src="sweetalert.min.js"></script>
		<script src="twilioVideoConfig.js"></script>
		<script src="twilioVideo.js"></script>
	</body>
</html>