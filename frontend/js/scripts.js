// if ("WebSocket" in window) {
   //  alert("WebSocket is supported by your Browser!");
    
    // Let us open a web socket
    var ipAddresses;
    var linkNames;
    var status = "STOPPED";
    var displayArray =[];
    var displayTable = document.getElementById("displayTable");
    var ws = new WebSocket("ws://127.0.0.1:8888",'echo-protocol');
     
    ws.onopen = function() {
       
       // Web Socket is connected, send data using send()
      //  ws.binaryType = "blob";
      //  ws.send('START');
      //  alert("Message is sent...");
    };
     
    ws.onmessage = function (evt) { 
      status = "RUNNING";
      // var received_msg = evt.data;
      // console.log(received_msg);
       //alert("Message is received...");       
       //received_msg.trim();
      var injsonobj = JSON.parse(evt.data);
      if(injsonobj.command === "STOP"){
         status = "STOPPED"; 
      }
      else if(injsonobj.command === "START_IP"){
         status = "STOPPED"; 
         //console.log("IP ADDRESSES:", injsonobj.value)
         ipAddresses=injsonobj.value;
         console.log("IP ADDRESSES:", ipAddresses);
      }
      else if(injsonobj.command === "START_LINK"){
         status = "STOPPED"; 
         //console.log("IP ADDRESSES:", injsonobj.value)
         linkNames=injsonobj.value;
         console.log("LINK NAMES:", linkNames);
      }
      else if(injsonobj.command === "TIMEOUT"){
         alert("!! TIMEOUT !!");
      }
      else if(injsonobj.command === "DATA"){
         var data = injsonobj.value;
         console.log(data);
         var webSocketArray = data.split("\n");
         var datalength = webSocketArray.length;
         // console.log("Size of received data lines: ", datalength-1 );
         for(var i=0; i<datalength; i++ ){

            var recvArray= webSocketArray[i].split(" ");
            recvArray[0]= parseInt(recvArray[0]);
            updateTable(recvArray);

         }
         
         // console.log(displayArray);
      }
      

    };
     
    ws.onclose = function() { 
      status = "STOPPED";
       // websocket is closed.
      alert("Connection is closed..."); 
    };
    
//  } else {
   
    // The browser doesn't support WebSocket
   //  alert("WebSocket NOT supported by your Browser!");
//  }
function ServiceStart() {
   if(status === "STOPPED"){
   
      displayArray =[];
      var rowCount=displayTable.rows.length;
      // console.log('displayTable.length :', rowCount);
      for (var i = 1; i < rowCount; i++) {
         // console.log('delete row :', i);
         displayTable.deleteRow(1);
      }  
      
      var url = document.getElementById("url").value;
      
      if(ws.readyState != 1){
         console.log('Server not ready !');
         alert("Server not ready !"); 
      }
      else if(url === ''){
         console.log('Please enter URL');
         alert("Please enter URL"); 
      }   
      else{
         var jsonobj={"command":"START","value":String(url)}            
         ws.send(JSON.stringify(jsonobj));
      }
   }
   else {alert("Server Busy !");}
   
 }

 function ServiceStop() {   
   if(ws.readyState != 1){
      console.log('Server not available !');
      alert("Server not available !"); 
   } 
   else{
      var jsonobj={"command":"STOP","value":" "}            
      ws.send(JSON.stringify(jsonobj));
   } 
     
   
 }

 function SavetoDB() {   
   if(ws.readyState != 1){
      console.log('Server not available !');
      alert("Server not available !"); 
   } 
   else{
      var jsonobj={"command":"SAVE","value":displayArray}            
      ws.send(JSON.stringify(jsonobj));
   } 
     
   
 }
 document.getElementById("start_button").onclick = ServiceStart;
 document.getElementById("stop_button").onclick = ServiceStop;
 document.getElementById("save_button").onclick = SavetoDB;

 function updateTable(recvArray){
  // console.log(recvArray);
   
   var index;
   for(index=0; index<displayArray.length; index++){

      if(displayArray[index][0] === recvArray[0]){
         displayArray.splice(index,1,recvArray);
         displayTable.deleteRow(index+1);
         insertRowTable(recvArray,index,displayTable);
         break;
      }
      else if(displayArray[index][0] > recvArray[0]){
         displayArray.splice(index,0,recvArray);
         insertRowTable(recvArray,index,displayTable);
         break;
      }
   }
   if(recvArray[0] ==1 && displayArray[0] === undefined ){
      displayArray.push(recvArray);
      insertRowTable(recvArray,0,displayTable)

   }
   else if(recvArray[0] > displayArray[displayArray.length-1][0]){
      displayArray.push(recvArray);
      insertRowTable(recvArray,displayArray.length-1,displayTable)
   }

 }

 function insertRowTable(recvArray,index,displayTable){

   var row = displayTable.insertRow(index+1);
   var cell1 = row.insertCell(0);
   var cell2 = row.insertCell(1);
   var cell3 = row.insertCell(2);
   var cell4 = row.insertCell(3);
   var cell5 = row.insertCell(4);
   var cell6 = row.insertCell(5);
   var cell7 = row.insertCell(6);
   var cell8 = row.insertCell(7);
   cell1.innerHTML = recvArray[0];
   if (ipAddresses.includes(recvArray[1])){
      cell2.innerHTML = "<span style='color:#E74C3C;font-weight:bold'  >" + recvArray[1]+"   "+linkNames[ipAddresses.indexOf(recvArray[1])] +"</span>" ;
   }
   else{
      cell2.innerHTML = recvArray[1];
   }
   
   cell3.innerHTML = recvArray[2];
   cell4.innerHTML = recvArray[3];
   cell5.innerHTML = recvArray[4];
   cell6.innerHTML = recvArray[5];
   cell7.innerHTML = recvArray[6];
   cell8.innerHTML = recvArray[7];


 }