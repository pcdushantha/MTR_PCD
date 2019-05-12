const timeoutms=60000;
const childProcess = require('child_process');
var WebSocketServer = require('websocket').server;
var http = require('http');
//const utf8 = require('utf8');
var mysql = require('mysql');

// mysql connection
var mydb = mysql.createConnection({
    host: "127.0.0.1",
    user: "mtr",
    password: "root"    
  });

var ipAddresses=[];
var linkNames=[];

// mydb.connect(function(err) {
//     if (err) throw err;
//     console.log("Connected to Database!");    

// });
mydb.query("SELECT ip_addr,link_name FROM dumps.mtr", function (err, result, fields) {
    if (err) throw err;
     console.log("result: ",result);
    // console.log("No of Rows: ",result.affectedRows);
    Object.keys(result).forEach(function(key) {
        // console.log("KEY:",key);
        var row = result[key];
        ipAddresses.push(row.ip_addr);
        linkNames.push(row.link_name);
        // console.log(typeof ipAddresses);
    });
    console.log("IP ADDRESSES: ",ipAddresses); 
    console.log("LINK NAMES: ",linkNames);        
});

// mydb.end(function(err) {
//     if (err) throw err;
//     console.log("Disconnected from Database!");
// });

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8888, function() {
    console.log((new Date()) + ' Server is listening on port 8888');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production 
    // applications, as it defeats all standard cross-origin protection 
    // facilities built into the protocol and the browser.  You should 
    // *always* verify the connection's origin and decide whether or not 
    // to accept it. 
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed. 
  return true;
}

//create an array to hold your connections
var connections = [];

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin 
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    var connection = request.accept('echo-protocol', request.origin);
    
    //store the new connection in your array of connections
    connections.push(connection);
    var process;
    var timeout;
    console.log((new Date()) + ' Connection accepted.');
    var outjsonobj={"command":"START_IP","value":ipAddresses}
    connection.sendUTF(JSON.stringify(outjsonobj));
    var outjsonobj={"command":"START_LINK","value":linkNames}
    connection.sendUTF(JSON.stringify(outjsonobj));
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            
            var injsonobj = JSON.parse(message.utf8Data);
            
            switch(injsonobj.command){
                case 'START':
                  // code block
                  if(process === undefined){

                    process = childProcess.spawn('mtr',['-4','-p','-n',injsonobj.value]); 
                    
                    timeout=setTimeout(function(){
                        if(process != undefined){
                            console.log('Timeout kill');
                            process.stdin.end();
                            process.stdout.end();
                            process.kill('SIGINT');
                            process = undefined;                        
                            var outjsonobj={"command":"TIMEOUT","value":" "}
                            connection.sendUTF(JSON.stringify(outjsonobj));
                        }
                        
                    }, timeoutms);
    
                    process.stdout.on('data', function (data) {
                        console.log('stdout: ' + data); 
                        //connection.sendUTF(data);
                        var outjsonobj={"command":"DATA","value":String(data)}
                        connection.sendUTF(JSON.stringify(outjsonobj));    
                    });
    
                    process.stderr.on('data', function (data) {    
                        console.log('stderr: ' + data); 
                        process = undefined; 
                        clearTimeout(timeout);  
                    });
                        
                    process.on('close', function (code) {    
                        console.log('Child process exit with code: ' + code);
                        process = undefined;
                        clearTimeout(timeout);
                        var outjsonobj={"command":"STOP","value":" "}
                        connection.sendUTF(JSON.stringify(outjsonobj)); 
                    });
    
                    console.log('Child Process');
        
                    }
                    break;
                case 'STOP':
                  // code block
                    if(process != undefined){               
                    // process.stdin.end();
                    //process.stdout.end();
                    process.kill('SIGINT');
                    clearTimeout(timeout);
                    process = undefined 
                    }
                    break;
                case 'SAVE':
                  // code block
                    var sql = "INSERT INTO dumps.mtr_save (`name`, `data`) VALUES(?,?)";  
                
                    var today = new Date();
                    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
                    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
                    var name = date+' '+time+' '+injsonobj.url;
                    mydb.query(sql,[name,JSON.stringify(injsonobj.value)], function (err, result) {
                        if (err) throw err;
                        console.log("Number of records inserted: " + result.affectedRows);    
                    });
        
                    break;
                case 'LOAD_DATA':
                // code block
                //SELECT * FROM dumps.mtr_save ORDER BY id DESC LIMIT 0,3;
                //SELECT data FROM dumps.mtr_save ORDER BY id DESC LIMIT 1;
                //SELECT data FROM dumps.mtr_save where name="2019-5-11 19:27:15 www.yahoo.com";
                    // var sql = "SELECT data FROM dumps.mtr_save ORDER BY id DESC LIMIT 1";  
                    var sql = "SELECT data FROM dumps.mtr_save where name="+ JSON.stringify(injsonobj.value) ;
                    
                    mydb.query(sql,function (err, result) {
                        if (err) throw err;
                        console.log("LOAD_DATA result: ",result[0].data);
                        var outjsonobj={"command":"LOAD_DATA","value":result[0].data}
                        connection.sendUTF(JSON.stringify(outjsonobj)); 
                        // console.log("No of Rows: ",result.affectedRows);
                        // var outjsonobj={"command":"LOAD_DATA","value":result}
                        // connection.sendUTF(JSON.stringify(outjsonobj)); 
                              
                    });
        
                    break;
                case 'LOAD_HISTORY':
                // code block
                //SELECT * FROM dumps.mtr_save ORDER BY id DESC LIMIT 0,3;
                //SELECT data FROM dumps.mtr_save ORDER BY id DESC LIMIT 1;
                    var nameArray=[];
                    var sql = "SELECT name FROM dumps.mtr_save ORDER BY id DESC LIMIT 20";  
                
                    
                    mydb.query(sql,function (err, result) {
                        if (err) throw err;
                        Object.keys(result).forEach(function(key) {
                            // console.log("KEY:",key);
                            var row = result[key];  
                            nameArray.push(row.name);                         
                            
                        });
                        console.log(nameArray);
                        var outjsonobj={"command":"LOAD_HISTORY","value":JSON.stringify(nameArray)}
                        connection.sendUTF(JSON.stringify(outjsonobj)); 
                        
                                
                    });
        
                    break;
                default:
                  // code block
              }

        }
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
   
    // var arraylength =connections.length;
    // function testjsfunc(){
    //     var testjs = 'testjs' + String(arraylength);
    //     connection.sendUTF(testjs); 
    // };
    // var id = setInterval(testjsfunc, 1000);
    // var process = childProcess.spawn('node', ['child.js']); 
    

    
});