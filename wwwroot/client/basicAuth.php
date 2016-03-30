<?php

$user = 'twilio';
$pw = 'TwilioVideo';

if (!isset($_SERVER['PHP_AUTH_USER']) || ($_SERVER['PHP_AUTH_USER'] != $user || $_SERVER['PHP_AUTH_PW'] != $pw)) {
	header('WWW-Authenticate: Basic realm="Enter username and password."');
	header('Content-Type: text/plain; charset=utf-8');
	die('このページを見るにはログインが必要です');
}

?>
