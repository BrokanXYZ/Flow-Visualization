/// <reference path="/scripts/babylon.3.0.js" />

"use strict";


// Client's socket vars
var mySocketId = null;
var socket = io();

// Essential Babylon vars
var canvas;
var scene;
var engine;


// List of edge objects
//
// Edge
// 	1. srcIP
// 	2. dstIP
// 	3. srcPort
// 	4. dstPort
// 	5. numPackets
// 	6. numBytes

var tiers;
var centerNode;

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

class Edge{

	constructor(edgeObj){
		
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
				this.nodes[i].mesh = BABYLON.Mesh.CreateSphere("tier" + this.tierNum + "_node" + i, 16, this.nodes[i].meshSize, scene);

				// Create and place ports around node
			    var portTheta = 0;
			    var portDeltaTheta = (2*Math.PI)/this.nodes[i].ports.length;
			    for(var j=0; j<this.nodes[i].ports.length; j++){
			        this.nodes[i].ports[j].mesh = BABYLON.Mesh.CreateSphere("node" + i + "_port" + this.nodes[i].ports[j].num, 16, this.nodes[i].meshSize/6, scene);
			        this.nodes[i].ports[j].mesh.position = new BABYLON.Vector3((this.nodes[i].meshSize/2) * Math.cos(portTheta), 0, (this.nodes[i].meshSize/2) * Math.sin(portTheta));
			        
			        //MATERIAL
			        this.nodes[i].ports[j].mesh.material =  new BABYLON.StandardMaterial("node" + i + "_port" + this.nodes[i].ports[j].num, scene);
			        this.nodes[i].ports[j].mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
			        this.nodes[i].ports[j].mesh.material.diffuseColor = new BABYLON.Color3(parseInt(this.nodes[i].ports[j].num) % 5, parseInt(this.nodes[i].ports[j].num) % 9, parseInt(this.nodes[i].ports[j].num) % 2);

			        this.nodes[i].ports[j].mesh.parent = this.nodes[i].mesh;
			        portTheta += portDeltaTheta;
			    }
			    
			    // Place node
				this.nodes[i].mesh.position = new BABYLON.Vector3(this.radius * Math.cos(theta), 0, this.radius * Math.sin(theta));
				theta += deltaTheta;
    		}


    		console.log(this.nodes);
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
	this.connections = false;

	this.executeNFdump = function(){

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
			// User clicked on a node!
			if(pickResult.pickedMesh.name.substring(0,4)=="node"){
				
				var pickedNode = parseInt(pickResult.pickedMesh.name.substring(4,pickResult.pickedMesh.name.length));
			
				console.log(pickedNode);
				// GUI
				var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

				openWindows.push(advancedTexture);
				

				var rect1 = new BABYLON.GUI.Rectangle();
				rect1.alpha = 0.85;
				rect1.width = "300px";
				rect1.height = "175px";
				rect1.cornerRadius = 20;
				rect1.color = "Orange";
				rect1.thickness = 4;
				rect1.background = "green";
				advancedTexture.addControl(rect1);
				rect1.linkWithMesh(pickResult.pickedMesh);   
				rect1.linkOffsetY = -225;


				var label = new BABYLON.GUI.TextBlock();
				label.text = "IP: " + nodes[pickedNode].ip + "\n" +
							 "# Flows: " + nodes[pickedNode].flows + " (" + nodes[pickedNode].flowsP + "%)\n" +
							 "# Packets: " + nodes[pickedNode].ipkt + " (" + nodes[pickedNode].ipktP + "%)\n" +
							 "# Bytes: " + nodes[pickedNode].ibyt + " (" + nodes[pickedNode].ibytP + "%)\n" +
							 "iPPS: " + nodes[pickedNode].ipps + "\n" +
							 "iBPS: " + nodes[pickedNode].ibps + "\n" +
							 "iBPP: " + nodes[pickedNode].ibpp; 
							 
							 
							 
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
				line.y2 = 80;
				line.linkOffsetY = 0;
				advancedTexture.addControl(line);
				line.linkWithMesh(pickResult.pickedMesh); 
				line.connectedControl = rect1;  
					
			// User clicked on a line!
			}else if(pickResult.pickedMesh.name.substring(0,4)=="line"){
			
				var pickedLine = parseInt(pickResult.pickedMesh.name[4]);
	
				var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
				openWindows.push(advancedTexture);
			
				var rect1 = new BABYLON.GUI.Rectangle();
				rect1.alpha = 0.85;
				rect1.width = "300px";
				rect1.height = "175px";
				rect1.cornerRadius = 20;
				rect1.color = "White";
				rect1.thickness = 4;
				rect1.background = "Blue";
				advancedTexture.addControl(rect1);
				rect1.linkWithMesh(pickResult.pickedMesh);   
				rect1.linkOffsetY = -225;

				var label = new BABYLON.GUI.TextBlock();
				label.text = "Src IP: " + connections[pickedLine].srcIP + "\n" +
							 "Dst IP: " + connections[pickedLine].dstIP + "\n" +
							 "Src Port: " + connections[pickedLine].srcPort + "\n" +
							 "Dst Port: " + connections[pickedLine].dstPort + "\n" +
							 "# Packets: " + connections[pickedLine].numPackets + "\n" +
							 "# Bytes: " + connections[pickedLine].numBytes; 
							 
							 
							 
				rect1.addControl(label);

				var target = new BABYLON.GUI.Ellipse();
				target.width = "20px";
				target.height = "20px";
				target.color = "White";
				target.thickness = 4;
				target.background = "Blue";
				advancedTexture.addControl(target);
				target.linkWithMesh(pickResult.pickedMesh);   

				var line = new BABYLON.GUI.Line();
				line.alpha = 0.8;
				line.dash = [10,10];
				line.lineWidth = 4;
				line.color = "White";
				line.y2 = 80;
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



	// Create tiers
 	var tier1 = new Tier(100, "1");
 	var tier2 = new Tier(200, "2");
 	var tier3 = new Tier(300, "3");

	//Newly returned nodes
	var nodes = data[1];

	// First node is the center node
	centerNode = new Node((nodes.splice(0,1))[0]);
	
	centerNode.mesh = BABYLON.Mesh.CreateSphere("centerNode", 16, centerNode.meshSize, scene);

	// Create and place ports around node
    var portTheta = 0;
    var portDeltaTheta = (2*Math.PI)/centerNode.ports.length;
    for(var j=0; j<centerNode.ports.length; j++){
        centerNode.ports[j].mesh = BABYLON.Mesh.CreateSphere("node" + i + "_port" + centerNode.ports[j].num, 16, centerNode.meshSize/6, scene);
        centerNode.ports[j].mesh.position = new BABYLON.Vector3((centerNode.meshSize/2) * Math.cos(portTheta), 0, (centerNode.meshSize/2) * Math.sin(portTheta));
        
        //MATERIAL
        centerNode.ports[j].mesh.material =  new BABYLON.StandardMaterial("centerNode" + "_port" + centerNode.ports[j].num, scene);
        centerNode.ports[j].mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
        centerNode.ports[j].mesh.material.diffuseColor = new BABYLON.Color3(parseInt(centerNode.ports[j].num) % 3, parseInt(centerNode.ports[j].num) % 4, parseInt(centerNode.ports[j].num) % 2);

        centerNode.ports[j].mesh.parent = centerNode.mesh;
        portTheta += portDeltaTheta;
    }

	centerNode.mesh.position = new BABYLON.Vector3(0, 0, 0);


	// Create nodes and place along tiers
	for(var i=0; i<nodes.length/3; i++){
		tier1.addNode(nodes[i]);
	}

	tier1.drawNodes();

	for(var i=nodes.length/3; i<(nodes.length*2)/3; i++){
		tier2.addNode(nodes[i]);
	}

	tier2.drawNodes();

	for(var i=(nodes.length*2)/3; i<nodes.length; i++){
		tier3.addNode(nodes[i]);
	}

	tier3.drawNodes();



}




// Helper Functions
function randomNumber(min,max){
	return Math.random() * (max-min)+min;
}
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}