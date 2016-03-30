<?php
require_once('Services/Twilio.php'); // Loads the library

// AccessToken TTL (second)
$ttl = 3600;		// max: 3600s = 1h


// Your Account Sid and Auth Token from twilio.com/user/account
$sid = "[Change Your Twilio Account Sid]";
$token = "[Change Your Twilio Auth Token]";

// Video Setting
$TWILIO_CONFIGURATION_SID = '[Change Twilio Video Service SID]';
$videoFriendlyName = "TwilioVideoTest";

// IP Messaging Setting
$TWILIO_IPM_SERVICE_SID = '[Change Twilio IP Messging Service SID]';
$chatAppName = 'TwilioChatDemo';
$identity = $_REQUEST['name'];
$deviceId = 'browser';
$endpointId = $chatAppName . ':' . $identity . ':' . $deviceId;


// ==============================================
$client = new Services_Twilio($sid, $token);
$key = $client->account->signing_keys->create(array("FriendlyName" => $videoFriendlyName));


// You will need your Account Sid and a SigningKey Sid and Secret
// to generate an Access Token for your SDK endpoint to connect to Twilio.
$signingKeySid = $key->sid;
$signingKeySecret = $key->secret;

// Create Access Token
$token = new Services_Twilio_AccessToken($sid, $signingKeySid, $signingKeySecret, $ttl, $identity);

// =============== for Video ===============
$grant = new Services_Twilio_Auth_ConversationsGrant();
$grant->setConfigurationProfileSid($TWILIO_CONFIGURATION_SID);
$token->addGrant($grant);

// =============== for IP Messaging ===============
$ipmGrant = new Services_Twilio_Auth_IpMessagingGrant();
$ipmGrant->setServiceSid($TWILIO_IPM_SERVICE_SID);
$ipmGrant->setEndpointId($endpointId);
$token->addGrant($ipmGrant);

echo json_encode(array(
    'identity' => $identity,
    'token' => $token->toJWT(),
));

?>
