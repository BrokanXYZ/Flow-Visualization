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

var nodes;
var tiers;

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

class Tier{

    	constructor(radius){
    		//Set obj vars
    		this.radius = radius
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
    		this.nodes.push(node);
    	}

    	drawNodes(){
    		//Get new delta theta
    		var theta = 0;
    		var deltaTheta = ((Math.PI*2)/(this.nodes.length*Math.PI))*Math.PI;

    		//Create and place node meshes
    		for(var i=0; i<this.nodes.length; i++){
				nodes[i].mesh = BABYLON.Mesh.CreateSphere("node"+i, 16, nodes[i].flows/1000, scene);
				nodes[i].mesh.position = new BABYLON.Vector3(this.radius * Math.cos(theta), 0, this.radius * Math.sin(theta));
				theta += deltaTheta;
				console.log(nodes[i].mesh.position);
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

	this.fileName = '';
	this.numNodes = 1;
	this.stat = '1';
	this.orderBy = '1';
	this.connections = false;

	this.executeNFdump = function(){

		//Package data
		var data = {};
		
		data.fileName = this.fileName;
		data.numNodes = this.numNodes;
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
				label.text = "Stat Val: " + nodes[pickedNode].val + "\n" +
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
	if(nodes){
		for(var i=0; i<nodes.length; i++){
			nodes[i].mesh.dispose();
		}
	}



	// Create tiers
 	const tier1 = new Tier(100);

	//Set nodes to newly returned nodes
	nodes = data[1];

	//Center node!
	nodes[0].mesh = BABYLON.Mesh.CreateSphere("centerNode", 16, nodes[0].flows/1000, scene);
	nodes[0].mesh.position = new BABYLON.Vector3(0, 0, 0);


	// Create nodes and place along tiers
	for(var i=1; i<nodes.length; i++){
		tier1.addNode(nodes[i]);
	}

	tier1.drawNodes();


		/*// Create connections! (lines)
		var foundSrc;
		var foundDst;
		var srcIndex;
		var dstIndex;
		
		
		for(var i=0; i<connections.length; i++){
			
			foundSrc = false;
			foundDst = false;
			
			for(var j=0; j<nodes.length; j++){
				
				// If both src & dst IP addresses where found... Create line/connection!
				if(foundSrc && foundDst){
					connections[i].mesh = BABYLON.Mesh.CreateLines("line"+i,[nodes[srcIndex].mesh.position, nodes[dstIndex].mesh.position]);
					
					// 0->1 based on numBytes
					var colorWeight = (parseInt(connections[i].numBytes)/889823300)-(127/8898233); 
					
					if(colorWeight>0.5){
						connections[i].mesh.color = new BABYLON.Color3(1,(2-colorWeight*2),0);
					}else if(colorWeight<0.5){
						connections[i].mesh.color = new BABYLON.Color3((colorWeight*2),1,0);
					}else{
						connections[i].mesh.color = new BABYLON.Color3(1,1,0);
					}
					
					
					//console.log(connections[i].srcIP + " --> " + connections[i].dstIP + "(" + colorWeight + ")")
					console.log("number of lines created");
					
					break;
				}
				
				// Check if dst/src IP address exists
				if(connections[i].srcIP == nodes[j].ip){
					srcIndex = j;
					foundSrc = true;
				}else if(connections[i].dstIP == nodes[j].ip){
					dstIndex = j;
					foundDst = true;
				}
				
			}
			
		}*/


}




// Helper Functions
function randomNumber(min,max){
	return Math.random() * (max-min)+min;
}
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}
