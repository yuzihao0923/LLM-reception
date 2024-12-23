<?php
include_once 'zww_model.php';
//设置超时时间
set_time_limit(0);
//设置报错级别
error_reporting(E_ERROR);


header('Content-Type: text/event-stream;charset=utf-8'); // 以事件流的形式告知浏览器进行显示
header('Cache-Control: no-cache'); // 告知浏览器不进行缓存
header('X-Accel-Buffering: no'); //关闭加速缓冲


$question = $_REQUEST['question'];
$session_id = $_REQUEST['session_id'];

file_put_contents("./logs.log",time().$question."\n");
// $question = '如何办理社保卡？';
$config = file_get_contents('./ask_helper_key.config');
$config_arr = json_decode($config, true);
$zww = new zww_model($config_arr['ak'], $config_arr['sk']);
// 打开文件句柄，php://output 表示输出到当前输出流
// 获取答案
$zww->get_anwser($question, true, $session_id);
