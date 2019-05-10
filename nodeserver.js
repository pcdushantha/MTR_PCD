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

mydb.connect(function(err) {
    if (err) throw err;
    console.log("Connected to Database!");    

});
mydb.query("SELECT ip_addr,link_name FROM dumps.mtr", function (err, result, fields) {
    if (err) throw err;
     console.log("result: ",result);
    // console.log("No of Rows: ",result.affectedRows);
    Object.keys(result).forEach(function(key) {
        var row = result[key];
        ipAddresses.push(row.ip_addr);
        linkNames.push(row.link_name);
        // console.log(typeof ipAddresses);
    });
    console.log("IP ADDRESSES: ",ipAddresses); 
    console.log("LINK NAMES: ",linkNames);        
});

mydb.end(function(err) {
    if (err) throw err;
    console.log("Disconnected from Database!");
});

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
            if(injsonobj.command === 'START' && process === undefined){

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
            else if(injsonobj.command === 'STOP'  && process != undefined){               
               // process.stdin.end();
                //process.stdout.end();
                process.kill('SIGINT');
                clearTimeout(timeout);
                process = undefined                                
            }
            else if(injsonobj.command === 'SAVE'  && process != undefined){
                // save data to the database
            }             
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }

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