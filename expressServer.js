const express = require('express')
const app = express()
const request = require('request');
const jwt = require('jsonwebtoken');
const auth = require('./lib/auth');

//------------------database 연결 ----------------------
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost', //서버의 주소
  user     : 'root', // 접근 계정 이름
  password : '1q2w3e4r', // 계정 비밀번호
  database : 'fintech1116' // 데이터베이스 이름
});
connection.connect();
//------------------database 연결 ----------------------

app.set('views', __dirname + '/views');//랜더링할 파일이 있는 디렉토리 
app.set('view engine', 'ejs'); // 사용하는 뷰 엔진

app.use(express.json()); // JSON 타입의 데이터를 받기위한 설정
app.use(express.urlencoded({ extended: false })); // urlencoded 타입의 데이터를 받기위한 설정

app.use(express.static(__dirname + '/public')); //디자인 파일이 위치할 정적 요소들을 저장하는 디렉토리

var clientId = "q7kH44ThJwjpvNRg0BbJvE1yxvx5X53DKz1rNgPF" // 클라이언트 아이디 변경
var clientSecret = "yVT6irMr2h4ZTHzZY7sDpbvhm1nlOzr4nP7DYRVy" // 클라이언트 시크릿 변경

app.get('/test',function(req, res){
  console.log(req.decoded);
  res.render('blank');
})

app.get('/signup', function(req, res){
  res.render('signup');
})

app.get('/login', function(req, res){
  res.render('login');
})

app.get('/main', function(req, res){
  res.render('main');
})

app.get('/balance', function(req, res){
  res.render('balance');
})

app.get('/qrcode', function(req, res){
  res.render('qrcode');
})

app.get('/qrreader', function(req, res){
  res.render('qrreader');
})

app.get('/authResult', function(req, res){
  var authCode = req.query.code;
  console.log("인증코드 : ", authCode)
  var option = {
    method : "POST",
    url : "https://testapi.openbanking.or.kr/oauth/2.0/token",
    headers : {
      "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8"
    },
    form : {
      code : authCode,
      client_id : clientId,
      client_secret : clientSecret,
      redirect_uri : "http://localhost:3000/authResult",
      grant_type : "authorization_code"
    }
  }
  request(option, function (error, response, body) {
    var accessRequestResult = JSON.parse(body);
    console.log(accessRequestResult);
    res.render("resultChild", { data: accessRequestResult });
  });
})

app.post('/signup', function(req, res){
  console.log(req.body);
  var userName = req.body.userName;
  var userPassword = req.body.userPassword;
  var userEmail = req.body.userEmail;
  var userAccessToken = req.body.userAccessToken;
  var userRefreshToken = req.body.userRefreshToken;
  var userSeqNo = req.body.userSeqNo;
  var insertUserSql = "INSERT INTO user (`name`, `email`, `accesstoken`, `refreshtoken`, `userseqno`, `password`) VALUES (?, ?, ?, ?, ?, ?)"
  connection.query(insertUserSql,[userName, userEmail, userAccessToken, userRefreshToken, userSeqNo, userPassword], function (error, results, fields) {
    if (error) throw error;
    else {
      res.json(1);
    }
  });
})

app.post('/login', function(req, res){
  var userEmail = req.body.userEmail;
  var userPassword = req.body.userPassword;
  var searchEmailSql = "SELECT * FROM user WHERE email = ?";
  connection.query(searchEmailSql,[userEmail, userPassword], function (error, results, fields) {
    if (error) throw error;
    else {
      if(results.length == 0){
        res.json("회원이 존재하지 않습니다")
      }
      else {
        var storedUserPassword = results[0].password;
        if(storedUserPassword == userPassword){
          //로그인 완료
          var tokenKey = "f@i#n%tne#ckfhlafkd0102test!@#%";
          jwt.sign(
            {
              userId: results[0].id,
              userEmail: results[0].email,
            },
            tokenKey,
            {
              expiresIn: "10d",
              issuer: "fintech.admin",
              subject: "user.login.info",
            },
            function (err, token) {
              console.log("로그인 성공", token);
              res.json(token);
            }
          );

        }
        else {
          res.json("비밀번호를 잘못 입력했습니다");
          //로그인 실패
        }
      }
    }
  });
})

app.post('/list', auth, function(req, res){
  //user/me 요청 만들기
  var userId = req.decoded.userId;
  var userSelectSql = "SELECT * FROM user WHERE id = ?";
  connection.query(userSelectSql, [userId], function(err, results){
    if(err){throw err}
    else {
      var userAccessToken = results[0].accesstoken;
      var userSeqNo = results[0].userseqno;
      var option = {
        method : "GET",
        url : "https://testapi.openbanking.or.kr/v2.0/user/me",
        headers : {
          //토큰
          Authorization : "Bearer " + userAccessToken
        },
        //get 요청을 보낼때 데이터는 qs, post 에 form, json 입력가능
        qs : {
          user_seq_no : userSeqNo
        }
      }
      request(option, function (error, response, body) {
        var listResult = JSON.parse(body);
        console.log(listResult);
        res.json(listResult)
      });
    }    
  })
})

app.post('/balance',auth, function(req, res){
  //api에 balance 요청을 만들고 res.json() 응답 하세요;
  var finusenum = req.body.fin_use_num;
  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  var transId = "T991599190U" + countnum; //이용기과번호 본인것 입력
  var userId = req.decoded.userId;
  var userSelectSql = "SELECT * FROM user WHERE id = ?";
  connection.query(userSelectSql, [userId], function(err, results){
    if(err){throw err}
    else {
      var userAccessToken = results[0].accesstoken;
      var userSeqNo = results[0].userseqno;
      var option = {
        method : "GET",
        url : "https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num",
        headers : {
          Authorization : "Bearer " + userAccessToken
        },
        //get 요청을 보낼때 데이터는 qs, post 에 form, json 입력가능
        qs : {
          bank_tran_id : transId,
          fintech_use_num : finusenum,
          tran_dtime : "20201119133400"
        }
      }
      request(option, function (error, response, body) {
        var balanceResult = JSON.parse(body);
        console.log(balanceResult);
        res.json(balanceResult)
      });
    }    
  })
})

app.post('/transactionList',auth, function(req, res){
  var finusenum = req.body.fin_use_num;
  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  var transId = "T991599190U" + countnum; //이용기과번호 본인것 입력
  var userId = req.decoded.userId;
  var userSelectSql = "SELECT * FROM user WHERE id = ?";
  connection.query(userSelectSql, [userId], function(err, results){
    if(err){throw err}
    else {
      var userAccessToken = results[0].accesstoken;
      var userSeqNo = results[0].userseqno;
      var option = {
        method : "GET",
        url : "https://testapi.openbanking.or.kr/v2.0/account/transaction_list/fin_num",
        headers : {
          Authorization : "Bearer " + userAccessToken
        },
        //get 요청을 보낼때 데이터는 qs, post 에 form, json 입력가능
        qs : {
          bank_tran_id: transId,
          fintech_use_num:finusenum,
          inquiry_type:"A",
          inquiry_base:"D",
          from_date:"20190101",
          to_date:"20190101",
          sort_order:"D",
          tran_dtime:"20201119143320"
        }
      }
      request(option, function (error, response, body) {
        var transactionListResult = JSON.parse(body);
        console.log(transactionListResult);
        res.json(transactionListResult)
      });
    }    
  })
})

app.post('/withdraw', auth, function(req, res){
  var finusenum = req.body.fin_use_num;
  var tofinusenum = req.body.to_fin_use_num;
  var amount = req.body.amount
  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  var transId = "T991599190U" + countnum; //이용기과번호 본인것 입력
  var userId = req.decoded.userId;
  var userSelectSql = "SELECT * FROM user WHERE id = ?";
  connection.query(userSelectSql, [userId], function(err, results){
    if(err){throw err}
    else {
      var userAccessToken = results[0].accesstoken;
      var userSeqNo = results[0].userseqno;
      var option = {
        method : "POST",
        url : "https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num",
        headers : {
          Authorization : "Bearer " + userAccessToken
        },
        //get 요청을 보낼때 데이터는 qs, post 에 form, json 입력가능
        json : {
          "bank_tran_id": transId,
          "cntr_account_type": "N",
          "cntr_account_num": "7832932596",
          "dps_print_content": "쇼핑몰환불",
          "fintech_use_num": finusenum,
          "wd_print_content": "오픈뱅킹출금",
          "tran_amt": amount,
          "tran_dtime": "20201120105100",
          "req_client_name": "홍길동",
          "req_client_fintech_use_num" : finusenum,
          "req_client_num": "HONGGILDONG1234",
          "transfer_purpose": "ST",
          "recv_client_name": "진상언",
          "recv_client_bank_code": "097",
          "recv_client_account_num": "7832932596"
        }
      }
      request(option, function (error, response, body) {
        console.log(body);
        if(body.rsp_code ="A0000"){
          var countnum2 = Math.floor(Math.random() * 1000000000) + 1;
          var transId2 = "T991599190U" + countnum; //이용기과번호 본인것 입력
          var option = {
            method : "POST",
            url : "https://testapi.openbanking.or.kr/v2.0/transfer/deposit/fin_num",
            headers : {
              Authorization : "Bearer " + "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJUOTkxNTk5MTkwIiwic2NvcGUiOlsib29iIl0sImlzcyI6Imh0dHBzOi8vd3d3Lm9wZW5iYW5raW5nLm9yLmtyIiwiZXhwIjoxNjEzNjI0ODk2LCJqdGkiOiJlNWNlZjgwOC0yYjFlLTRmYjItYTFjOS0xNjk2MGUyM2E4NzYifQ.pkW6zJMj8IG_S-5gROMUGZdZSevkRS0nHBUPyrLz3bQ"
            },
            //get 요청을 보낼때 데이터는 qs, post 에 form, json 입력가능
            json : {
              "cntr_account_type": "N",
              "cntr_account_num": "4262679045",
              "wd_pass_phrase": "NONE",
              "wd_print_content": "환불금액",
              "name_check_option": "on",
              "tran_dtime": "20201120131900",
              "req_cnt": "1",
              "req_list": [
                {
                  "tran_no": "1",
                  "bank_tran_id": transId2,
                  "fintech_use_num": tofinusenum,
                  "print_content": "쇼핑몰환불",
                  "tran_amt": amount,
                  "req_client_name": "홍길동",
                  "req_client_num": "HONGGILDONG1234",
                  "req_client_fintech_use_num": finusenum,
                  "transfer_purpose": "ST"
                }
              ]
            }
          }
          request(option, function (error, response, body) {
            console.log(body);
            res.json(body);
          });
        }
      });
    }    
  })
})

app.listen(3000, function(){
    console.log('서버가 3000번 포트에서 실행중 입니다.');
})
