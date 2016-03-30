<?php

include_once 'JWT.php';

class Services_Twilio_AccessToken
{
    private $signingKeySid;
    private $accountSid;
    private $secret;
    private $ttl;
    private $identity;
    private $grants;

    public function __construct($accountSid, $signingKeySid, $secret, $ttl = 3600, $identity = null)
    {
        $this->signingKeySid = $signingKeySid;
        $this->accountSid = $accountSid;
        $this->secret = $secret;
        $this->ttl = $ttl;

        if (!is_null($identity)) {
            $this->identity = $identity;
        }

        $this->grants = array();
    }

    /**
     * Add a grant to the access token
     *
     * @param Services_Twilio_Auth_Grant $grant to be added
     *
     * @return $this the updated access token
     */
    public function addGrant(Services_Twilio_Auth_Grant $grant)
    {
        $this->grants[] = $grant;
        return $this;
    }


    public function toJWT($algorithm = 'HS256')
    {
        $header = array(
            'cty' => 'twilio-fpa;v=1',
            'typ' => 'JWT'
        );

        $now = time();

        $grants = array();
        if ($this->identity) {
            $grants['identity'] = $this->identity;
        }

        foreach ($this->grants as $grant) {
            $grants[$grant->getGrantKey()] = $grant->getPayload();
        }

        $payload = array(
            'jti' => $this->signingKeySid . '-' . $now,
            'iss' => $this->signingKeySid,
            'sub' => $this->accountSid,
            'nbf' => $now,
            'exp' => $now + $this->ttl,
            'grants' => $grants
        );

        return JWT::encode($payload, $this->secret, $algorithm, $header);
    }

    public function __toString()
    {
        return $this->toJWT();
    }
}
