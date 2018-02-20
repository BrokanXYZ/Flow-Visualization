
//Essential vars
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//Config vars
var port = 80;
var verbose = false;

//User specific vars
var UUID = require('uuid/v1');
var IP = 'N/A';

// Active clients
//		0 = userID
//		1 = IP
clients = [];



//Initial file request
app.get('/', function(req, res){
	//Obtain IP
	IP = req.header('x-forwarded-for') || req.connection.remoteAddress;
	//Load index
	console.log('trying to load %s', __dirname + '/serving/index.html');
	res.sendFile(__dirname + '/serving/index.html');
});

//All other file requests
app.get( '/*' , function(req, res, next) {
	//This is the current file they have requested
	var file = req.params[0]; 

	//For debugging, we can track what files are requested.
	if(verbose) console.log('\t :: Express :: file requested : ' + file);

	//Send the requesting client the file.
	res.sendFile( __dirname + '/' + file );
});

//Socket method definitions
io.on('connection', function(socket){

	//Initialize user vars
	socket.userID = UUID();
	socket.userIP = IP;


	// Activated on new client connection
    socket.on('onconnected', function(onSuccess) {
		//tell the server someone connected
		console.log('++ User ' + socket.userID + ' has connected with the IP: ' + socket.userIP);
		//push client data to client list
		clients.push([socket.userID, IP]);
		//tell client they've connected
		var data = [socket.userID];
		onSuccess(data);
    });


    //Called when client disconnects
	socket.on('disconnect', function(){
		console.log('-- User ' + socket.userID + ' disconnected (' + socket.userIP + ')');

		//Remove this player from active list
		for(var x=0; x<clients.length; x++){
			if(clients[x][0] == socket.userID){
				clients.splice(x,1);
				break;
			}
		}
		
		//Let other clients know this player disconnected
		io.emit('playerDisconnect', socket.userID);
	});



	socket.on('executeNFdump', function(data) {

		// TODO: error handling * * * * * * * * * 


		//Vars to return to client
		var nodes = [];
		var summary = '';
		var connections = [];

		//Child process def
		var cp = require('child_process');



		// 1. Get node data

		// 1a. Run nfdump
		var getIPs = cp.spawnSync('nfdump', ['-s' + data.stat, '-O' + data.orderBy, '-n' + data.numNodes, '-r' + data.fileName, '-o' + 'csv'], { encoding : 'utf8' });

		// 1b. Parse data
		//Split up lines
		var output = getIPs.stdout.split(/\r?\n/);

		//Pull node data 
		for(i=1; i<output.length-5; i++){
			var tempNode = new Object();
			var tempCols = output[i].split(',');

			tempNode.tstart = tempCols[0];
			tempNode.tend = tempCols[1];
			tempNode.td = tempCols[2];
			tempNode.proto = tempCols[3];
			tempNode.ip = tempCols[4];
			tempNode.flows = tempCols[5];
			tempNode.flowsP = tempCols[6];
			tempNode.ipkt = tempCols[7];
			tempNode.ipktP = tempCols[8];
			tempNode.ibyt = tempCols[9];
			tempNode.ibytP = tempCols[10];
			tempNode.ipps = tempCols[11];
			tempNode.ibps = tempCols[12];
			tempNode.ibpp = tempCols[13];
			tempNode.ports = [];

			nodes.push(tempNode);
		}

		//Pull summary data
		summary = output[output.length-2].split(',');




		// 2. Get connection data

		// 2a. Run nfdump
		var getConnections = cp.spawnSync('nfdump', ['-O' + 'flows','-r' + data.fileName, '-o' + 'fmt:%ts,%te,%td,%pr,%sa,%da,%sp,%dp,%pkt,%byt,%fl,%bps,%pps,%bpp', '-A' + 'srcip,dstip,srcport,dstport'], { encoding : 'utf8' });

		// 2b. Parse data
		//Split up lines
		output = getConnections.stdout.split(/\r?\n/);

		//Pull connection data 
		for(i=1; i<output.length-6; i++){

			var tempConnection = new Object();
			var tempCols = output[i].split(',');
			var tempString, tempFloat;

			tempConnection.tstart = tempCols[0];
			tempConnection.tend = tempCols[1];
			tempConnection.td = tempCols[2].trim();
			tempConnection.proto = tempCols[3].trim();
			tempConnection.srcad = tempCols[4].trim();
			tempConnection.dstad = tempCols[5].trim();
			tempConnection.srcpt = tempCols[6].trim();
			tempConnection.dstpt = tempCols[7].trim();

			// If M or G prefix is used... remove and convert... else use as is
			tempString = tempCols[8].trim();

			if(tempString[tempString.length-1]=='M'){
				tempFloat = parseFloat(tempString.substr(0,tempString.length-2));
				tempFloat *= 1000000
			}else if(tempString[tempString.length-1]=='G'){
				tempFloat = parseFloat(tempString.substr(0,tempString.length-2));
				tempFloat *= 1000000000
			}else{
				tempFloat = parseFloat(tempString);
			}

			tempConnection.pkt = tempFloat;


			// If M or G prefix is used... remove and convert... else use as is
			tempString = tempCols[9].trim();

			if(tempString[tempString.length-1]=='M'){
				tempFloat = parseFloat(tempString.substr(0,tempString.length-2));
				tempFloat *= 1000000
			}else if(tempString[tempString.length-1]=='G'){
				tempFloat = parseFloat(tempString.substr(0,tempString.length-2));
				tempFloat *= 1000000000
			}else{
				tempFloat = parseFloat(tempString);
			}

			tempConnection.byt = tempFloat;

			// If M or G prefix is used... remove and convert... else use as is
			tempString = tempCols[10].trim();

			if(tempString[tempString.length-1]=='M'){
				tempFloat = parseFloat(tempString.substr(0,tempString.length-2));
				tempFloat *= 1000000
			}else if(tempString[tempString.length-1]=='G'){
				tempFloat = parseFloat(tempString.substr(0,tempString.length-2));
				tempFloat *= 1000000000
			}else{
				tempFloat = parseFloat(tempString);
			}

			tempConnection.flows = tempFloat;

			// **Might be calculated incorrectly
			tempConnection.bps = tempCols[11].trim();
			tempConnection.pps = tempCols[12].trim();
			tempConnection.bpp = tempCols[13].trim();

			connections.push(tempConnection);
		}




		// 3. Generate port data for nodes from the connection data
		var srcadFound, dstadFound, done, updated;
		var j;


		for(i=0; i<connections.length; i++){

			srcadFound = false;
			dstadFound = false;
			done = false;
			j=0;

			// Search through nodes
			while(!(srcadFound && dstadFound) && !done){

				// Update src node
				if(connections[i].srcad == nodes[j].ip){
					updated = false;

					// Search for existing entry in node[i] for connections[i]'s port
					for(x=0; x<nodes[j].ports.length; x++){
						if(nodes[j].ports[x].num == connections[i].srcpt){
							//1. update it!
							nodes[j].ports[x].outFlows += connections[i].flows;
							nodes[j].ports[x].outPkts += connections[i].pkt;
							nodes[j].ports[x].outByts += connections[i].byt;

							updated = true;
						}
					}

					//2. if not found... add a new entry
					if(!updated){
						var tempPort = new Object();
						tempPort.num = connections[i].srcpt;
						tempPort.inFlows = 0;
						tempPort.inPkts = 0;
						tempPort.inByts = 0;
						tempPort.outFlows = connections[i].flows;
						tempPort.outPkts = connections[i].pkt;
						tempPort.outByts = connections[i].byt;

						nodes[j].ports.push(tempPort);
					}

					// srcad for connection[i] is done
					srcadFound = true;
				}


				// Update dst node
				if(connections[i].dstad == nodes[j].ip){
					updated = false;

					// Search for existing entry in node[i] for connections[i]'s port
					for(x=0; x<nodes[j].ports.length; x++){
						if(nodes[j].ports[x].num == connections[i].dstpt){
							//1. update it!
							nodes[j].ports[x].inFlows += connections[i].flows;
							nodes[j].ports[x].inPkts += connections[i].pkt;
							nodes[j].ports[x].inByts += connections[i].byt;

							updated = true;
						}
					}

					//2. if not found... add a new entry
					if(!updated){
						var tempPort = new Object();
						tempPort.num = connections[i].dstpt;
						tempPort.inFlows = connections[i].flows;
						tempPort.inPkts = connections[i].pkt;
						tempPort.inByts = connections[i].byt;
						tempPort.outFlows = 0;
						tempPort.outPkts = 0;
						tempPort.outByts = 0;

						nodes[j].ports.push(tempPort);
					}

					// dstad for connection[i] is done
					dstadFound = true;
				}


				// incr through nodes
				j++

				// Done if we have exhausted nodes 
				if(j>=nodes.length){
					done=true;
				}
			}	



		}





		// 4. Package data
		var returnData = [true, nodes, connections, summary];

		// 5. Send data to client
		socket.emit('NFdumpReturn', returnData);

	});

});







http.listen(port, function(){
	console.log('listening on *: ' + port);
});