<?php
//政务网大模型调用
class zww_model
{
    private $ak = '';
    private $sk = '';
    private $app_code = '52c32f01e31b48afb188afedc1f01da0';
    private $user_info = 'b610bd5a3fdd11eea4eb029fe07ac8d6';

    private $url = 'http://58.215.18.99:8983/agi/api/v1/bot/chatStream';

    public function __construct($ak, $sk, $app_code = '', $user_info = '')
    {
        $this->ak = $ak;
        $this->sk = $sk;
        if ($app_code != '') {
            $this->app_code = $app_code;
        }
        if ($user_info != '') {
            $this->user_info = $user_info;
        }
    }
    private function http_post_stream($url, $post_data, $headers = array(), $stream = false)
    {
        $response_content = "";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_map(function ($key, $value) {
            return "$key: $value";
        }, array_keys($headers), $headers));
        curl_setopt($ch, CURLOPT_TIMEOUT, 0);
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $buffer) use (&$response_content, $stream) {
            $len = strlen($buffer);
            $response_content .= $buffer;
            if ($stream) {
                echo $buffer;
                ob_flush();
                flush();
            }
            return $len;
        });

        curl_exec( $ch);
        if (curl_errno($ch)) {
            echo 'Errno' . curl_error($ch);
        }
        curl_close($ch);
        return $response_content;
    }

    private function create_header($body, $ak, $sk)
    {
        $req_time = time() * 1000;
        $signature = $ak . $sk . $req_time . $body;
        $signature = hash('sha256', $signature);
        $header = array(
            "Content-Type" => "application/json;charset=UTF-8",
            "requestTime" => $req_time,
            "account" => $ak,
            "signature" => $signature,
            "Accept" => "*/*",
            "Transfer-Encoding" => "chunked",
        );
        return $header;
    }


    private function helper_create_data($question, $session_id = '', $chat_type = 'INPUT')
    {
        $data = array(
            'sessionId' => $session_id,
            'content' => $question,
            'chatType' => $chat_type,
            'userInfo' => $this->user_info,
            'appCode' => $this->app_code,
        );
        return json_encode($data, JSON_UNESCAPED_UNICODE);
    }


    private function parse_stream_result($result)
    {
        $content = '';
        $lines = explode("\n", $result);
        foreach ($lines as $line) {
            if (strpos($line, 'data:') === 0) {
                $json_str = trim(substr($line, 5));
                $data = json_decode($json_str, true);
                if (isset($data['content'])) {
                    $content .= $data['content'];
                }
            }
        }
        return $content;
    }

    public function get_anwser($content, $stream = false, $session_id = '', $chat_type = 'INPUT')
    {
        $url = $this->url;
        $body = $this->helper_create_data($content, $session_id, $chat_type);
        $ak = $this->ak;
        $sk = $this->sk;
        $headers = $this->create_header($body, $ak, $sk);
        $res_content = $this->http_post_stream($url, $body, $headers, $stream);
        if (!$stream) {
            $res_content = $this->parse_stream_result($res_content);
            $res = array(
                'code' => 200,
                'data' => $res_content,
            );
            return json_encode($res, JSON_UNESCAPED_UNICODE);
        }

    }

}