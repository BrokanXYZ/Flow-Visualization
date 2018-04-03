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

// Object for the visualization generation interface
var visGenData;



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



// Classes of components for the visualization
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

		// Based upon the drawn nodes... are we capable of drawing it?
		this.drawable = false;

		// Height of the curve
		this.height;


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


		// 3. If src and dst positions were found, then we can draw the connection.
		if(srcFound && dstFound){
			// Connection is drawable!
			this.drawable = true;
		}

	}

	draw(connectionIndex){

		if(this.drawable){
			// Bezier Curve with control point being the midpoint b/w src and dst at a constant HEIGHT
			this.mesh = BABYLON.MeshBuilder.CreateTube("conn_" + connectionIndex, 
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
    		this.nodes.push(new Node(node));
    	}

    	dispose(){
    		//Remove dashed line mesh
    		this.mesh.dispose();

    		//Remove all nodes
    		for(var x=0; x<this.nodes.length; x++){
    			this.nodes[x].mesh.dispose();
    		}
    	}

    	drawNodes(drawPorts){
    		//Get new delta theta
    		var theta = 0;
    		var deltaTheta = (2*Math.PI)/this.nodes.length;

    		//Create and place node meshes
    		for(var i=0; i<this.nodes.length; i++){
    			// Create Node
				this.nodes[i].mesh = BABYLON.Mesh.CreateSphere("node" + this.tierNum + "," + i, 16, this.nodes[i].meshSize, scene);
				this.nodes[i].mesh.material = new BABYLON.StandardMaterial("tier" + this.tierNum + "_node" + i + "Mat", scene);
				//this.nodes[i].mesh.material.diffuseColor = new BABYLON.Color3(1.3,1,0.7);

				if(drawPorts){
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


// SocketIO function definitions
function setupSocketIO(){
	
	socket.emit('onconnected', function(data) {
		mySocketId = data[0];
		console.log("You successfully connected! \nYour ID is " + mySocketId);
	});

	socket.on('NFdumpReturn', function(data) {

		console.log(data);

		//Check for error in nfdump scripts
		if(data[0]!="000"){
			buildVis(data);
		}else{
			alert('ERROR: ' + data[1]);
		}
	});

}
	

// Initialize basic scene elements
function setupScene(){
	// This creates and positions a free camera (non-mesh)
	var camera = new BABYLON.ArcRotateCamera("camera", 0, 1, 200, new BABYLON.Vector3(0,0,0),scene);
	// WASD camera movement
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


// visGenGUI object
var genData = function(){

	this.fileName = 'anonFlows';
	this.numNodes = 20;
	this.minNodeSize = 5;
	this.maxNodeSize = 50;
	this.stat = 'ip';
	this.orderBy = 'flows';
	this.nodesPerTier = 5;
	this.ports = true;
	this.connections = true;
	this.connVisible = 100;
	this.connHeight = 1;

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
		data.ports = this.ports
		data.connections = this.connections;
		
		
		//Send to server
		socket.emit('executeNFdump', data);

	}



	/*this.fileType = '';

	this.downloadStats = function(){

		//Download currently generated stats from nfdump

	}*/
}


// Customization window for generating the visualization
function visGenGUI(){
	visGenData = new genData();
	var gui = new dat.GUI();	
	gui.domElement.style.marginTop = "40px";
	gui.domElement.style.marginRight = "40px";
	gui.domElement.id = "datGUI";


	var essentials = gui.addFolder('Essentials');
	essentials.add(visGenData, 'fileName');
	essentials.add(visGenData, 'nodesPerTier', 1, 100).step(1);
	essentials.add(visGenData, 'numNodes', 1, 100).step(1);
	essentials.add(visGenData, 'minNodeSize', 0, 100).step(1);
	essentials.add(visGenData, 'maxNodeSize', 0, 100).step(1);
	essentials.add(visGenData, 'ports');
	essentials.add(visGenData, 'connections');
	essentials.add(visGenData, 'stat', ['record', 'srcip', 'dstip', 'ip', 'nhip', 'nhbip', 'router', 'srcport', 'dstport', 'port', 'tos', 'srctos', 'dsttos', 'dir', 'srcas', 'dstas', 'as', 'inif', 'outif', 'if', 'srcmask', 'dstmask', 'srcvlan', 'dstvlan', 'vlan', 'insrcmac', 'outdstmac', 'indstmac', 'outsrcmac', 'srcmac', 'dstmac', 'inmac', 'outmac', 'mask', 'proto'] );
	essentials.add(visGenData, 'orderBy', ['flows', 'ipkg', 'opkg', 'ibytes', 'obytes', 'ipps', 'opps', 'ibps', 'obps', 'tstart', 'tend'] );
	essentials.add(visGenData, 'executeNFdump');

	var dynamic = gui.addFolder('Dynamic Options');
	var connVisible = dynamic.add(visGenData, 'connVisible',0, 1000).step(1);
	var connHeight = dynamic.add(visGenData, 'connHeight',0, 100).step(1);


	// Redraw visible connections
	connVisible.onChange(function(visibleConnections){
		
		// Clear all meshes
		for(var x=0; x<connections.length; x++){
			if(connections[x].mesh){
				connections[x].mesh.dispose();
			}
		}

		// Draw connections
		var x=0;

		while(x<visibleConnections && x<connections.length){
			connections[x].draw(x);
			x++;
		}

	});


	// Redraw connections with new height multiplier
	connHeight.onFinishChange(function(value){

		alert(value);

	});


	/*var download = gui.addFolder('Download');
	download.add(visGenData, 'fileType', ['biline', 'bilong', 'csv', 'extended', 'line', 'long', 'nel', 'nsel', 'pipe', 'raw'])
	download.add(visGenData, 'downloadStats');*/
}
	

// Pop up GUI elements (e.g. nodes, connections...)
function interactiveGUI(){

	canvas.addEventListener("click", function (e){
        var pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if(pickResult.hit){

        	// Get name of selected mesh
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
							 "Packets: " + simplifyPacketNum(pickedNode.ipkt) + " (" + pickedNode.ipktP + "%)\n" +
							 "Bytes: " + simplifyByteNum(pickedNode.ibyt) + " (" + pickedNode.ibytP + "%)";// +
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
				// Get specified port data
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
							 "In Packets: " + simplifyPacketNum(pickedPort.inPkts) + "\n" +
							 "In Bytes: " + simplifyByteNum(pickedPort.inByts) + "\n\n" +
							 "Out Flows: " + pickedPort.outFlows + "\n" +
							 "Out Packets: " + simplifyPacketNum(pickedPort.outPkts) + "\n" +
							 "Out Bytes: " + simplifyByteNum(pickedPort.outByts);
							 	 
							 
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
					
			// User clicked on a connection!
			}else if(meshName.substring(0,4)=="conn"){

				// 0: tier index, 1: node index, 2: port index
				var connectionID = meshName.substring(5, meshName.length);
				// Get specified connection data
				var pickedConn = connections[connectionID];

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
				label.text = "Src IP: " + pickedConn.srcip + "\n" +
							 "Src Port: " + pickedConn.srcpt + "\n" +
							 "Dst IP: " + pickedConn.dstip+ "\n" +
							 "Dst Port: " + pickedConn.dstpt + "\n" +
							 "Flows: " + pickedConn.flows + "\n" +
							 "Packets: " + simplifyPacketNum(pickedConn.pkt) + "\n" +
							 "Bytes: " + simplifyByteNum(pickedConn.byt);
							 	 
							 
				rect1.addControl(label);

				var target = new BABYLON.GUI.Ellipse();
				target.width = "20px";
				target.height = "20px";
				target.color = "Orange";
				target.thickness = 4;
				target.background = "blue";
				advancedTexture.addControl(target);
				target.linkWithMesh(pickResult.pickedMesh);   

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

			// User clicked on the center node!
			}else if(meshName.substring(0,10)=="centerNode"){

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
				label.text = "IP: " + centerNode.ip + "\n\n" +
							 "Flows: " + centerNode.flows + " (" + centerNode.flowsP + "%)\n" +
							 "Packets: " + simplifyPacketNum(centerNode.ipkt) + " (" + centerNode.ipktP + "%)\n" +
							 "Bytes: " + simplifyByteNum(centerNode.ibyt) + " (" + centerNode.ibytP + "%)";// +
							 //"iPPS: " + centerNode.ipps + "\n" +
							 //"iBPS: " + centerNode.ibps + "\n" +
							 //"iBPP: " + centerNode.ibpp; 
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

			// User clicked on a port for the center node!
			}else if(meshName.substring(0,10)=="centerPort"){

				// Get port index
				var portID = meshName.substring(11, meshName.length);
				// Get specified port data
				var pickedPort = centerNode.ports[portID];

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
							 "In Packets: " + simplifyPacketNum(pickedPort.inPkts) + "\n" +
							 "In Bytes: " + simplifyByteNum(pickedPort.inByts) + "\n\n" +
							 "Out Flows: " + pickedPort.outFlows + "\n" +
							 "Out Packets: " + simplifyPacketNum(pickedPort.outPkts) + "\n" +
							 "Out Bytes: " + simplifyByteNum(pickedPort.outByts);
							 	 
							 
				rect1.addControl(label);

				/*var target = new BABYLON.GUI.Ellipse();
				target.width = "20px";
				target.height = "20px";
				target.color = "Orange";
				target.thickness = 4;
				target.background = "blue";
				advancedTexture.addControl(target);
				target.linkWithMesh(pickResult.pickedMesh);*/ 

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


// Visualization generation
function buildVis(data){

	//Newly returned nodes
	var nodes = data[1];


	clearCurrentVis();

	createCenterNode();
	
	if(data[0][1]=='1'){
		createTiers(true);
	}else{
		createTiers(false);
	}

	if(data[0][2]=='1'){
		createConnections();
	}




	function clearCurrentVis(){
		//Center node
		if(typeof centerNode !== 'undefined'){
			centerNode.mesh.dispose();
			centerNode = null;
		}

		//Tiers & nodes
		if(typeof tiers !== 'undefined'){
			for(var x=0; x<tiers.length; x++){
				tiers[x].dispose();
			}
			tiers = [];
		}

		//Connections
		if(typeof connections !== 'undefined'){
			for(var x=0; x<connections.length; x++){
				//If the connection has been drawn, then remove it
				if(connections[x].mesh){
					connections[x].mesh.dispose();
				}
			}
			connections = [];
		}
	}


	function createCenterNode(){
		centerNode = new Node((nodes.splice(0,1))[0]);
		
		centerNode.mesh = BABYLON.Mesh.CreateSphere("centerNode", 16, centerNode.meshSize, scene);
		centerNode.mesh.material = new BABYLON.StandardMaterial("centerNodeMat", scene);
		centerNode.mesh.material.diffuseColor = new BABYLON.Color3(1,1,0.5);

		//Create and place ports
	    var portTheta = 0;
	    var portDeltaTheta = (2*Math.PI)/centerNode.ports.length;
	    for(var j=0; j<centerNode.ports.length; j++){
	        centerNode.ports[j].mesh = BABYLON.Mesh.CreateSphere("centerPort" + "_" + j, 16, centerNode.meshSize/6, scene);
	        centerNode.ports[j].mesh.position = new BABYLON.Vector3((centerNode.meshSize/1.5) * Math.cos(portTheta), 0, (centerNode.meshSize/1.5) * Math.sin(portTheta));
	        
	        //MATERIAL
	        var portColor = colorHash(centerNode.ports[j].num);
	        centerNode.ports[j].mesh.material =  new BABYLON.StandardMaterial("centerNodeMat" + "_" + centerNode.ports[j].num, scene);
	        centerNode.ports[j].mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
	        centerNode.ports[j].mesh.material.diffuseColor = new BABYLON.Color3( portColor.r, portColor.g, portColor.b);

	        centerNode.ports[j].mesh.parent = centerNode.mesh;
	        portTheta += portDeltaTheta;
	    }

		centerNode.mesh.position = new BABYLON.Vector3(0, 0, 0);
	}


	function createTiers(drawPorts){
		//Determine # of nessecary tiers
		var numTiers = Math.ceil(nodes.length/nodesPerTier);

		//Create tiers
		for(var x=0; x<numTiers; x++){
			tiers.push(new Tier(100*x + 100, x));
		}


		var nodeIndex = 0;
		var lastNodeIndex = 0;
		var tierIndex = 0;

		//Add nodes to tiers
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
			tiers[x].drawNodes(drawPorts);
		}
	}


	function createConnections(){
		
		var connects = data[2];

		// 1. Create connection objects
		for(var x=0; x<connects.length; x++){
			connections.push(new Connection(connects[x]));
		}

		// 2. Remove connection objects that are not drawable
		for(var x=0; x<connections.length; x++){
			if(!connections[x].drawable){
				connections.splice(x,1);
				x--;
			}
		}

		// 3. Draw all remaining connections
		for(var x=0; x<connections.length; x++){
			connections[x].draw(x);
		}

	}

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
function simplifyPacketNum(number){
	return (number/1000).toFixed(2) + " K";
}
function simplifyByteNum(number){
	return (number/1000000000).toFixed(2) + " GB";
}