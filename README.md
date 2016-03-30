# Twilio Video デモ

2016/3/29 KDDIウェブコミュニケーションズ Twilio事業部


#### 動作環境

### サーバー
- Microsoft Azure Web Apps
- PHP5.x

### クライアント
- Chromeを推奨



#### 主要プログラム構成

        wwwroot
          bin				// PAREモジュール格納用（後述）
          client			 // Webクライアント用ディレクトリ
            index.php		// メイン画面
          twilioVideo.js	 // メインJSプログラム
          Services		   // Twilio PHP ライブラリ
          .user.ini
          token.php		  // アクセスToken取得用プログラム



#### サーバーセットアップ
- wwwroot以下のディレクトリ・ファイル一式をAzure Web Appsのwwwroot以下に設置

##### ※注意事項  
 - PEARを自前で設置する必要がある（本ソースコードに同梱）  
`/site/wwwroot/bin/PEAR`

 - /site/wwwroot/.user.ini 作成（本ソースコードに同梱）  
`include_path=".;D:\home\site\wwwroot\bin\PEAR"`

 - AzureでTwilio PHPライブラリを利用する際、curlでHTTPS接続時に発生する証明書エラーの回避（本ソースコードに同梱）  
　`/site/wwwroot/Services/Twilio/TinyHttp.php `  

  99行目に以下を追加。  
	`$opts[CURLOPT_SSL_VERIFYPEER] = false;	 // not recommended`

　※本来は証明書を明示的に指定する方法が正しいやり方  
　`curl_setopt($req, CURLOPT_CAINFO, dirname(__FILE__) . '\test.pem'); // recommended`

#### 設定

##### /site/wwwroot/token.php
- Twilioで取得した情報を設定  
　$sid						: Account Sid  
　$token					: Auth Token  
　$TWILIO_CONFIGURATION_SID	: プログラマブルVIDEOのSID  
　$TWILIO_IPM_SERVICE_SID	: IPメッセージングサービスのSID  
　$chatAppName				: IPメッセージングサービスのフレンドリーネーム( * )  

##### /site/wwwroot/client/twilioVideoConfig.js

　var inviteToNames			: ユーザー名（配列で複数のユーザー名を設定できるが、ビデオ通話は2名まで）  
　var chatUniqueName		: ユニークなチャットルーム名  
　var chatFriendlyName 		: IPメッセージングサービスのフレンドリーネーム( * と同じものを設定）  



#### Webアクセス
https://your-subdomain.azurewebsites.net/client/  
※HTTPSアクセス必須  
※Basic認証がかかっています。ユーザー名、パスワードは basicAuth.php にて定義しています。
