/// <reference path="/scripts/babylon.3.0.js" />

"use strict";


// Client's socket vars
var mySocketId = null;
var socket = io();

// Essential Babylon vars
var canvas;
var scene;
var engine;



// Global mesh vars
var tiers = [];
var connections = [];
var centerNode;

// Global visual generation vars (with default values)
var nodesPerTier = 5;

// Individual GUIs that are open
var openWindows = [];












// Entry point
document.addEventListener("DOMContentLoaded", startBabylonJS, false);

// Entry Function
function startBabylonJS() {
    if (BABYLON.Engine.isSupported()) {
		initBabylon();
		setupSocketIO();
		setupScene();
		visGenGUI();
		interactiveGUI();

    }else{
		console.log("Your browser doesn't support Babylon.js! \n:(");
		alert("Your browser doesn't support Babylon.js! \n:(");
	}
}

class Connection{

	constructor(connectionObj){
		// 1. Copy data returned from server
		this.srcip = connectionObj.srcip;
		this.dstip = connectionObj.dstip;
		this.srcpt = connectionObj.srcpt;
		this.dstpt = connectionObj.dstpt;
		this.proto = connectionObj.proto;
		this.byt = connectionObj.byt;
		this.pkt = connectionObj.pkt;
		this.flows = connectionObj.flows;
		this.bpp = connectionObj.bpp;
		this.bps = connectionObj.bps;
		this.pps = connectionObj.pps;
		this.td = connectionObj.td;
		this.tend = connectionObj.tend;
		this.tstart = connectionObj.tstart;

		// 2. Get src and dst positions
		this.srcPosition;
		this.dstPosition;

		var srcFound = false;
		var dstFound = false;
		var x = 0;
		var y = 0;
		var z = 0;


		// First, check centerNode

		// Source
		if(centerNode.ip==this.srcip){
			z=0;
			while(!srcFound && z<centerNode.ports.length){
				if(centerNode.ports[z].num==this.srcpt){
					this.srcPosition = centerNode.ports[z].mesh.position;
					srcFound = true;
				}
				z++;
			}
		}

		// Destination
		if(centerNode.ip==this.dstip){
			z=0;
			while(!dstFound && z<centerNode.ports.length){
				if(centerNode.ports[z].num==this.dstpt){
					this.dstPosition = centerNode.ports[z].mesh.position;
					dstFound = true;
				}
				z++;
			}
		}




		// Second, check all other nodes
		while((!srcFound || !dstFound) && x<tiers.length){

			y=0;

			while((!srcFound || !dstFound) && y<tiers[x].nodes.length){

				// Source
				if(tiers[x].nodes[y].ip==this.srcip){
					z=0;
					while(!srcFound && z<tiers[x].nodes[y].ports.length){
						if(tiers[x].nodes[y].ports[z].num==this.srcpt){
							this.srcPosition = new BABYLON.Vector3(tiers[x].nodes[y].ports[z].mesh.position.x + tiers[x].nodes[y].mesh.position.x,
																	tiers[x].nodes[y].ports[z].mesh.position.y + tiers[x].nodes[y].mesh.position.y,
																	tiers[x].nodes[y].ports[z].mesh.position.z + tiers[x].nodes[y].mesh.position.z);
							srcFound = true;
						}
						z++;
					}
				}


				// Destination 
				if(tiers[x].nodes[y].ip==this.dstip){
					z=0;
					while(!dstFound && z<tiers[x].nodes[y].ports.length){
						if(tiers[x].nodes[y].ports[z].num==this.dstpt){
							this.dstPosition = new BABYLON.Vector3(tiers[x].nodes[y].ports[z].mesh.position.x + tiers[x].nodes[y].mesh.position.x,
																	tiers[x].nodes[y].ports[z].mesh.position.y + tiers[x].nodes[y].mesh.position.y,
																	tiers[x].nodes[y].ports[z].mesh.position.z + tiers[x].nodes[y].mesh.position.z);
							dstFound = true;
						}
						z++;
					}
				}


				y++;
			}
			x++;
		}


		this.test = false;

		// 3. If src and dst positions where found, then draw the connection. Otherwise do not draw.
		if(srcFound && dstFound){

			this.test = true;


			// Bezier Curve with control point being the midpoint b/w src and dst at a constant HEIGHT
			this.mesh = BABYLON.MeshBuilder.CreateTube("connection_" + this.srcip + ":" + this.srcpt + " to " + this.dstip + ":" + this.dstpt, 
					{path: BABYLON.Curve3.CreateQuadraticBezier(this.srcPosition, new BABYLON.Vector3((this.srcPosition.x + this.dstPosition.x)/2, 100, (this.srcPosition.z + this.dstPosition.z)/2), this.dstPosition, 20).getPoints(), 
					radius: 0.25, 
					tessellation: 4, 
					sideOrientation: BABYLON.Mesh.SINGLESIDE, 
					updatable: true}, 
				scene);
		}

	}

}

class Node{

	constructor(nodeObj){
		// Copy data returned from server
		this.ip = nodeObj.ip;
		this.flows = nodeObj.flows;
		this.flowsP = nodeObj.flowsP;
		this.ibpp = nodeObj.ibpp;
		this.ibps = nodeObj.ibps;
		this.ibyt = nodeObj.ibyt;
		this.ibytP = nodeObj.ibytP;
		this.ipkt = nodeObj.ipkt;
		this.ipktP = nodeObj.ipktP;
		this.ipps = nodeObj.ipps;
		this.proto = nodeObj.proto;
		this.td = nodeObj.td;
		this.tend = nodeObj.tend;
		this.tstart = nodeObj.tstart;
		
		// Ports in use by node
		this.ports = nodeObj.ports;

		// Mesh vars
		this.meshSize = nodeObj.meshSize;
		this.mesh = null;
	}

}

class Tier{

    	constructor(radius, tierNum){
    		//Set obj vars
    		this.radius = radius
    		this.tierNum = tierNum;
    		this.nodes = [];


    		//Array of points to construct circle
			var myPoints = [];

			var theta = 0;
		    var deltaTheta = 0.025*Math.PI;

		    for (var i=0; i<81; i++) {
		        myPoints.push(new BABYLON.Vector3(radius * Math.cos(theta), 0, radius * Math.sin(theta)));
		        theta += deltaTheta;
		    }
			
			//Create dashed circle mesh 
			var tierMesh = BABYLON.MeshBuilder.CreateDashedLines("lines", {points: myPoints, dashNb:500}, scene); 

			this.mesh = tierMesh;
    	}

    	addNode(node){
    		//Add node to tier's node array
    		this.nodes.push(new Node(node));
    	}

    	drawNodes(){
    		//Get new delta theta
    		var theta = 0;
    		var deltaTheta = (2*Math.PI)/this.nodes.length;

    		//Create and place node meshes
    		for(var i=0; i<this.nodes.length; i++){
    			// Create Node
				this.nodes[i].mesh = BABYLON.Mesh.CreateSphere("node" + this.tierNum + "," + i, 16, this.nodes[i].meshSize, scene);
				this.nodes[i].mesh.material = new BABYLON.StandardMaterial("tier" + this.tierNum + "_node" + i + "Mat", scene);
				//this.nodes[i].mesh.material.diffuseColor = new BABYLON.Color3(1.3,1,0.7);
				// Create and place ports around node
			    var portTheta = 0;
			    var portDeltaTheta = (2*Math.PI)/this.nodes[i].ports.length;
			    for(var j=0; j<this.nodes[i].ports.length; j++){
			        this.nodes[i].ports[j].mesh = BABYLON.Mesh.CreateSphere("port" + this.tierNum + "," + i + "," + j, 16, this.nodes[i].meshSize/6, scene);
			        this.nodes[i].ports[j].mesh.position = new BABYLON.Vector3((this.nodes[i].meshSize/1.5) * Math.cos(portTheta), 0, (this.nodes[i].meshSize/1.5) * Math.sin(portTheta));
			        
			        //MATERIAL
			        var portColor = colorHash(this.nodes[i].ports[j].num);

			        this.nodes[i].ports[j].mesh.material =  new BABYLON.StandardMaterial("node" + i + "_port" + this.nodes[i].ports[j].num, scene);
			        this.nodes[i].ports[j].mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
			        this.nodes[i].ports[j].mesh.material.diffuseColor = new BABYLON.Color3(portColor.r, portColor.g, portColor.b);

			        this.nodes[i].ports[j].mesh.parent = this.nodes[i].mesh;
			        portTheta += portDeltaTheta;
			    }
			    
			    // Place node
				this.nodes[i].mesh.position = new BABYLON.Vector3(this.radius * Math.cos(theta), 0, this.radius * Math.sin(theta));
				theta += deltaTheta;
    		}

    	}

}


// Babylon Essentials
function initBabylon(){
	canvas = document.getElementById("renderCanvas");
	engine = new BABYLON.Engine(canvas, true);
	scene = new BABYLON.Scene(engine);

	// Once the scene is loaded, just register a render loop to render it
	engine.runRenderLoop(function () {
		scene.render();
	});

	//Resize window
	window.addEventListener("resize", function () {
		engine.resize();
	});
}


function setupSocketIO(){
	
	socket.emit('onconnected', function(data) {
		mySocketId = data[0];
		console.log("You successfully connected! \nYour ID is " + mySocketId);
	});

	socket.on('NFdumpReturn', function(data) {

		console.log(data);

		//Check for error in nfdump scripts
		if(data[0]){
			buildVis(data);
		}else{
			alert('ERROR: ' + data[1]);
		}
	});

}
	
	
function setupScene(){
	// This creates and positions a free camera (non-mesh)
	var camera = new BABYLON.ArcRotateCamera("camera", 0, 1, 200, new BABYLON.Vector3(0,0,0),scene);
	camera.keysDown = [83];
	camera.keysUp = [87];
	camera.keysLeft = [65];
	camera.keysRight = [68];
	
	// This targets the camera to scene origin
	camera.setTarget(BABYLON.Vector3.Zero());

	// This attaches the camera to the canvas
	camera.attachControl(canvas, true);

	// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
	var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

	// Default intensity is 1. Let's dim the light a small amount
	light.intensity = 0.7;

	// Background Color
	//scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.4);


	/*var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size:2500.0}, scene);
	var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
	skyboxMaterial.backFaceCulling = false;
	skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("/serving/skybox/skybox", scene);
	skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
	skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
	skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
	skybox.material = skyboxMaterial;*/








	// ActionManager for actions with keys
	scene.actionManager = new BABYLON.ActionManager(scene);
	
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {

            switch(evt.sourceEvent.keyCode){
                //Spacebar
                case 32:
					// Close all open pop ups
                    openWindows.forEach(function(GUI) {
                        GUI.dispose();
                    });
                    break;
            }
    }));
}



var genData = function(){

	this.fileName = 'anonFlows';
	this.numNodes = 25;
	this.minNodeSize = 5;
	this.maxNodeSize = 50;
	this.stat = 'ip';
	this.orderBy = 'flows';
	this.nodesPerTier = 5;
	this.connections = false;

	this.executeNFdump = function(){

		// Set global vars
		nodesPerTier = this.nodesPerTier;

		//Package data
		var data = {};
		
		data.fileName = this.fileName;
		data.numNodes = this.numNodes;
		data.minNodeSize = this.minNodeSize;
		data.maxNodeSize = this.maxNodeSize;
		data.stat = this.stat;
		data.orderBy = this.orderBy;
		data.connections = this.connections;
		
		
		//Send to server
		socket.emit('executeNFdump', data);

	}



	this.fileType = '';

	this.downloadStats = function(){

		//Download currently generated stats from nfdump

	}
}


// Customization windows for generating the visualization
function visGenGUI(){
	var dataGetter = new genData();
	var gui = new dat.GUI();	
	gui.domElement.style.marginTop = "40px";
	gui.domElement.style.marginRight = "40px";
	gui.domElement.id = "datGUI";


	var essentials = gui.addFolder('Essentials');
	essentials.add(dataGetter, 'fileName');
	essentials.add(dataGetter, 'nodesPerTier', 1, 100).step(1);
	essentials.add(dataGetter, 'numNodes', 1, 100).step(1);
	essentials.add(dataGetter, 'minNodeSize', 0, 100).step(1);
	essentials.add(dataGetter, 'maxNodeSize', 0, 100).step(1);
	essentials.add(dataGetter, 'stat', ['record', 'srcip', 'dstip', 'ip', 'nhip', 'nhbip', 'router', 'srcport', 'dstport', 'port', 'tos', 'srctos', 'dsttos', 'dir', 'srcas', 'dstas', 'as', 'inif', 'outif', 'if', 'srcmask', 'dstmask', 'srcvlan', 'dstvlan', 'vlan', 'insrcmac', 'outdstmac', 'indstmac', 'outsrcmac', 'srcmac', 'dstmac', 'inmac', 'outmac', 'mask', 'proto'] );
	essentials.add(dataGetter, 'orderBy', ['flows', 'ipkg', 'opkg', 'ibytes', 'obytes', 'ipps', 'opps', 'ibps', 'obps', 'tstart', 'tend'] );
	essentials.add(dataGetter, 'executeNFdump');

	var other = gui.addFolder('Other');
	other.add(dataGetter, 'connections');

	var download = gui.addFolder('Download');
	download.add(dataGetter, 'fileType', ['biline', 'bilong', 'csv', 'extended', 'line', 'long', 'nel', 'nsel', 'pipe', 'raw'])
	download.add(dataGetter, 'downloadStats');
}
	

// Pop up GUI elements (e.g. nodes, connections...)
function interactiveGUI(){

	canvas.addEventListener("click", function (e){
        var pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if(pickResult.hit){

        	var meshName = pickResult.pickedMesh.name;

			// User clicked on a node!
			if(meshName.substring(0,4)=="node"){
				
				// 0: tier index, 1: node index
				var nodeID = meshName.substring(4, meshName.length).split(",");
				// Get specified node data
				var pickedNode = tiers[nodeID[0]].nodes[nodeID[1]];
			

				// GUI
				var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

				openWindows.push(advancedTexture);
				

				var rect1 = new BABYLON.GUI.Rectangle();
				rect1.alpha = 0.85;
				rect1.width = "280px";
				rect1.height = "130px";
				rect1.cornerRadius = 20;
				rect1.color = "Orange";
				rect1.thickness = 4;
				rect1.background = "green";
				advancedTexture.addControl(rect1);
				rect1.linkWithMesh(pickResult.pickedMesh);   
				rect1.linkOffsetY = -225;


				var label = new BABYLON.GUI.TextBlock();
				label.text = "IP: " + pickedNode.ip + "\n\n" +
							 "Flows: " + pickedNode.flows + " (" + pickedNode.flowsP + "%)\n" +
							 "Packets: " + pickedNode.ipkt/1000 + " K (" + pickedNode.ipktP + "%)\n" +
							 "Bytes: " + (pickedNode.ibyt/1000000000).toFixed(2) + " GB (" + pickedNode.ibytP + "%)";// +
							 //"iPPS: " + pickedNode.ipps + "\n" +
							 //"iBPS: " + pickedNode.ibps + "\n" +
							 //"iBPP: " + pickedNode.ibpp; 
				//label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
				//label.paddingLeftInPixels = 1000;		 
							 
				rect1.addControl(label);

				var target = new BABYLON.GUI.Ellipse();
				target.width = "20px";
				target.height = "20px";
				target.color = "Orange";
				target.thickness = 4;
				target.background = "green";
				advancedTexture.addControl(target);
				target.linkWithMesh(pickResult.pickedMesh);   

				var line = new BABYLON.GUI.Line();
				line.alpha = 0.8;
				line.dash = [10,10];
				line.lineWidth = 4;
				line.color = "Orange";
				line.y2 = 68;
				line.linkOffsetY = 0;
				advancedTexture.addControl(line);
				line.linkWithMesh(pickResult.pickedMesh); 
				line.connectedControl = rect1;  
					

			// User clicked on a port!
			}else if(meshName.substring(0,4)=="port"){
				
				// 0: tier index, 1: node index, 2: port index
				var portID = meshName.substring(4, meshName.length).split(",");
				// Get specified node data
				var pickedPort = tiers[portID[0]].nodes[portID[1]].ports[portID[2]];
			

				// GUI
				var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

				openWindows.push(advancedTexture);
				

				var rect1 = new BABYLON.GUI.Rectangle();
				rect1.alpha = 0.85;
				rect1.width = "200px";
				rect1.height = "210px";
				rect1.cornerRadius = 20;
				rect1.color = "Orange";
				rect1.thickness = 4;
				rect1.background = "blue";
				advancedTexture.addControl(rect1);
				rect1.linkWithMesh(pickResult.pickedMesh);   
				rect1.linkOffsetY = -225;


				var label = new BABYLON.GUI.TextBlock();
				label.text = "Port: " + pickedPort.num + "\n\n" +
							 "In Flows: " + pickedPort.inFlows + "\n" +
							 "In Packets: " + pickedPort.inPkts/1000 + " K\n" +
							 "In Bytes: " + (pickedPort.inByts/1000000000).toFixed(2) + " GB\n\n" +
							 "Out Flows: " + pickedPort.outFlows + "\n" +
							 "Out Packets: " + pickedPort.outPkts/1000 + " K\n" +
							 "Out Bytes: " + (pickedPort.outByts/1000000000).toFixed(2) + " GB";
							 	 
							 
				rect1.addControl(label);

				/*var target = new BABYLON.GUI.Ellipse();
				target.width = "20px";
				target.height = "20px";
				target.color = "Orange";
				target.thickness = 4;
				target.background = "blue";
				advancedTexture.addControl(target);
				target.linkWithMesh(pickResult.pickedMesh);  */ 

				var line = new BABYLON.GUI.Line();
				line.alpha = 0.8;
				line.dash = [10,10];
				line.lineWidth = 4;
				line.color = "Orange";
				line.y2 = 105;
				line.linkOffsetY = 0;
				advancedTexture.addControl(line);
				line.linkWithMesh(pickResult.pickedMesh); 
				line.connectedControl = rect1;  
					
			}









			
        }
	});

}	



function buildVis(data){

	//Clear previous nodes
	// * * * * * * * * *
	// tiers and center!!!!!!!!!!

	

	//Newly returned nodes
	var nodes = data[1];





	// First node is the center node
	centerNode = new Node((nodes.splice(0,1))[0]);
	
	centerNode.mesh = BABYLON.Mesh.CreateSphere("centerNode", 16, centerNode.meshSize, scene);
	centerNode.mesh.material = new BABYLON.StandardMaterial("centerNodeMat", scene);
	centerNode.mesh.material.diffuseColor = new BABYLON.Color3(1,1,0.5);

	// Create and place ports around node
    var portTheta = 0;
    var portDeltaTheta = (2*Math.PI)/centerNode.ports.length;
    for(var j=0; j<centerNode.ports.length; j++){
        centerNode.ports[j].mesh = BABYLON.Mesh.CreateSphere("centerNode" + "_port" + centerNode.ports[j].num, 16, centerNode.meshSize/6, scene);
        centerNode.ports[j].mesh.position = new BABYLON.Vector3((centerNode.meshSize/1.5) * Math.cos(portTheta), 0, (centerNode.meshSize/1.5) * Math.sin(portTheta));
        
        //MATERIAL
        var portColor = colorHash(centerNode.ports[j].num);

        centerNode.ports[j].mesh.material =  new BABYLON.StandardMaterial("centerNode" + "_port" + centerNode.ports[j].num, scene);
        centerNode.ports[j].mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
        centerNode.ports[j].mesh.material.diffuseColor = new BABYLON.Color3( portColor.r, portColor.g, portColor.b);

        centerNode.ports[j].mesh.parent = centerNode.mesh;
        portTheta += portDeltaTheta;
    }

	centerNode.mesh.position = new BABYLON.Vector3(0, 0, 0);


	








	// tier control vars
	//var nodesPerTier = 5;
	var numTiers = Math.ceil(nodes.length/nodesPerTier);


	// Create tiers
	for(var x=0; x<numTiers; x++){
		tiers.push(new Tier(100*x + 100, x));
	}



	var nodeIndex = 0;
	var lastNodeIndex = 0;
	var tierIndex = 0;

	// Add nodes to tiers
	while(tierIndex<numTiers){

		while((nodeIndex-lastNodeIndex)<nodesPerTier && nodeIndex<nodes.length){
			tiers[tierIndex].addNode(nodes[nodeIndex]);
			nodeIndex++;
		}
		
		lastNodeIndex = nodeIndex;
		tierIndex++;
	}

	// Draw nodes
	for(var x=0; x<tiers.length; x++){
		tiers[x].drawNodes();
	}








	// Add connections
	var connects = data[2];

	for(var x=0; x<connects.length; x++){
		connections.push(new Connection(connects[x]));
	}


	var test = 0;

	for(var x=0; x<connections.length; x++){
		if(connections[x].test)
			test++;
	}

	console.log("# connections visible = " + test);


}




// Helper Functions
function randomNumber(min,max){
	return Math.random() * (max-min)+min;
}
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}
function colorHash(inputString){
	var sum = 0;
	
	for(var i in inputString){
		sum += inputString.charCodeAt(i);
	}

	var r = ~~(('0.'+Math.sin(sum+1).toString().substr(6))*256);
	var g = ~~(('0.'+Math.sin(sum+2).toString().substr(6))*256);
	var b = ~~(('0.'+Math.sin(sum+3).toString().substr(6))*256);

	return {
		 r: r/100
		,g: g/100
		,b: b/100
	};
}