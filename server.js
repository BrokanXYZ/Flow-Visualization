
//Essential vars
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//Config vars
var port = 80;
var verbose = false;





app.get('/', function(req, res){
	IP = req.header('x-forwarded-for') || req.connection.remoteAddress;
	console.log('trying to load %s', __dirname + '/serving/index.html');
	res.sendFile(__dirname + '/serving/index.html');
});


app.get( '/*' , function(req, res, next) {
	//This is the current file they have requested
	var file = req.params[0]; 

	//For debugging, we can track what files are requested.
	if(verbose) console.log('\t :: Express :: file requested : ' + file);

	//Send the requesting client the file.
	res.sendFile( __dirname + '/' + file );
});




io.on('connection', function(socket){

	socket.on('visRequest', function(onSuccess) {

		



	
		//Package data
		var data = [socket.userID, clients];
		
		//Send data to client
		onSuccess(data);
    });


http.listen(port, function(){
	console.log('listening on *: ' + port);
});