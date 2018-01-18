/// <reference path="/scripts/babylon.3.0.js" />

"use strict";

console.log("what up!");

// Essential Babylon vars
var canvas;
var scene;
var engine;

// List of node objects
//
// Node
// 	1. ip
// 	2. numFlows
// 	3. percentFlows
// 	4. numPackets
// 	5. percentPackets
// 	6. numBytes
// 	7. percentBytes
// 	8. pps
// 	9. bps
// 	10. bpp
var nodes = [];


// List of edge objects
//
// Edge
// 	1. srcIP
// 	2. dstIP
// 	3. srcPort
// 	4. dstPort
// 	5. numPackets
// 	6. numBytes
var connections = [];


// Summary of data
// 1. numFlows
// 2. numBytes
// 3. numPackets
// 4. avgBPS
// 5. avgPPS
// 6. avgBPP
var dataSummary = {
	numFlows: 0,
	numBytes: 0,
	numPackets: 0,
	avgBPS: 0,
	avgPPS: 0,
	avgBPP: 0
};




// Entry point
document.addEventListener("DOMContentLoaded", startBabylonJS, false);

// Entry Function
function startBabylonJS() {
    if (BABYLON.Engine.isSupported()) {
		initBabylon();
		loadData();
		createVis();
		createGUI();
    }else{
		console.log(":( Your browser doesn't support Babylon.js!")
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


function loadData(){
	
	// file defs
	var topIPsFile = "serving/netData/toptenips.txt"
	var connectionsFile = "serving/netData/connectionsPorts.txt"
	
	var numOfDataEntries = 10;
	
	// Vars for traversing CSV file
	var skipCount;
	var commaCount;
	var posHolder;
	
	// DONT NEED THESE??? LOOK AT DATA SUMMARY PART 
	var tempIP;
	var tempFlows;
	var tempPFlows
	var tempPPackets;
	var tempPackets;
	var tempBytes;
	var tempPBytes;
	var tempPPS;
	var tempBPS;
	var tempBPP;
	
	//For connections
	// DONT NEED THESE??? LOOK AT DATA SUMMARY PART 
	var tempSrcIP;
	var tempDstIP;
	var tempSrcPort;
	var tempDstPort;
	var done = false;
	
	// LOAD TOP IPs! aka nodes
	var rawFile = new XMLHttpRequest();
    rawFile.open("GET", topIPsFile, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                var allText = rawFile.responseText;
				const allLines = allText.split(/\r\n|\n/);
				
				skipCount=0;
				
				// Reading line by line
				allLines.map((line) => {
					
					commaCount = 0;
					
					//Skip first line & stop after last entry
					if(skipCount>0 && skipCount<=numOfDataEntries){
						
						// Gather data from row (Currently ignoring some)
						for(var i=0; i<line.length; i++){
							if(line[i]==','){
								commaCount++;
								
								if(commaCount==4){
									posHolder=i+1;
								}else if(commaCount==5){
									tempIP=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==6){
									tempFlows=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==7){
									tempPFlows=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==8){
									tempPackets=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==9){
									tempPPackets=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==10){
									tempBytes=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==11){
									tempPBytes=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==12){
									tempPPS=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==13){
									tempBPS=line.substring(posHolder,i);
									posHolder=i+1;
								}
								
							}else if(i==line.length-1){
								tempBPP=line.substring(posHolder,i+1);
							}
						}
						
						// Push data entry to list
						nodes.push({
							ip: tempIP,
							numFlows: tempFlows,
							percentFlows: tempPFlows,
							numPackets: tempPackets,
							percentPackets: tempPPackets,
							numBytes: tempBytes,
							percentBytes: tempPBytes,
							pps: tempPPS,
							bps: tempBPS,
							bpp: tempBPP
						});
						
					// Finally, gather summary data from the last line!
					}else if(skipCount==14){ 
					
						for(var i=0; i<line.length; i++){
							if(line[i]==','){
								commaCount++;
								
								if(commaCount==1){
									dataSummary.numFlows=line.substring(0,i);
									posHolder=i+1;
								}else if(commaCount==2){
									dataSummary.numBytes=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==3){
									dataSummary.numPackets=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==4){
									dataSummary.avgBPS=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==5){
									dataSummary.avgPPS=line.substring(posHolder,i);
									posHolder=i+1;
								}
							}else if(i==line.length-1){
								dataSummary.avgBPP=line.substring(posHolder,i+1);
							}
						}
					}
					skipCount++;
				});
            }
        }
    }
	
	console.log(dataSummary);
    rawFile.send(null);
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	// LOAD connections! aka edges
	var rawFile = new XMLHttpRequest();
    rawFile.open("GET", connectionsFile, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                var allText = rawFile.responseText;
				const allLines = allText.split(/\r\n|\n/);
				
				skipCount = 0;
				
				// Reading line by line
				allLines.map((line) => {
					
					commaCount = 0;
				
					if(line=='Summary'){
						done = true;
					}
				
				
					//Skip first line & stop after last entry
					if(skipCount>0 && !done){
						console.log('lines processed');
						// Gather data from row (Currently ignoring some)
						for(var i=0; i<line.length; i++){
							if(line[i]==','){
								commaCount++;
								
								if(commaCount==3){
									posHolder=i+1;
								}else if(commaCount==4){
									tempSrcIP=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==5){
									tempDstIP=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==6){
									tempSrcPort=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==7){
									tempDstPort=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==11){
									posHolder=i+1;
								}else if(commaCount==12){
									tempPackets=line.substring(posHolder,i);
									posHolder=i+1;
								}else if(commaCount==13){
									tempBytes=line.substring(posHolder,i);
									posHolder=i+1;
								}	
							}
						}
						
						
						
						
						// Push data entry to list
						connections.push({
							srcIP: tempSrcIP,
							dstIP: tempDstIP,
							srcPort: tempSrcPort,
							dstPort: tempDstPort,
							numPackets: tempPackets,
							numBytes: tempBytes
						});
						
						
					}
					
					
					skipCount++;
					
					
					
				});
					
            }
        }
    }
	
    rawFile.send(null);	
}


function createVis(){
	// This creates and positions a free camera (non-mesh)
	var camera = new BABYLON.ArcRotateCamera("camera", 0, 1, 200, new BABYLON.Vector3(0,0,0),scene);
	camera.keysDown = [83];
	camera.keysUp = [87];
	camera.keysLeft = [65];
	camera.keysRight = [68];
	
	var boxSize = 100;
	
	// This targets the camera to scene origin
	camera.setTarget(BABYLON.Vector3.Zero());

	// This attaches the camera to the canvas
	camera.attachControl(canvas, true);

	// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
	var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

	// Default intensity is 1. Let's dim the light a small amount
	light.intensity = 0.7;

	// Create Spheres and place randomly!
	for(var i=0; i<nodes.length; i++){
		nodes[i].mesh = BABYLON.Mesh.CreateSphere("node"+i, 16, nodes[i].numFlows/1000, scene);
		nodes[i].mesh.position = new BABYLON.Vector3(randomNumber(-1*(boxSize/2),(boxSize/2)),randomNumber(-1*(boxSize/2),(boxSize/2)),randomNumber(-1*(boxSize/2),(boxSize/2)));
		
		console.log("number of nodes created");
		
	}
	
	
	
	
	
	
	
	
	// Create connections! (lines)
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
		
	}
}



var genData = function(){

	this.fileName = '';
	this.numNodes = 1;
	this.stat = '1';
	this.orderBy = '1';
	this.connections = false;

	this.executeNFdump = function(){

		//EXE NFDUMP SCRIPT

	}



	this.fileType = '';

	this.downloadStats = function(){

		//Download currently generated stats from nfdump

	}


}



function createGUI(){
	
	interactiveGUI();
	visGenGUI();
	
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
		
		// Individual GUIs that are open
		var openWindows = [];

		canvas.addEventListener("click", function (e){
            var pickResult = scene.pick(scene.pointerX, scene.pointerY);

            if(pickResult.hit){
				// User clicked on a node!
				if(pickResult.pickedMesh.name.substring(0,4)=="node"){
					
					var pickedNode = parseInt(pickResult.pickedMesh.name[4]);
				
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
								 "# Flows: " + nodes[pickedNode].numFlows + " (" + nodes[pickedNode].percentFlows + "%)\n" +
								 "# Packets: " + nodes[pickedNode].numPackets + " (" + nodes[pickedNode].percentPackets + "%)\n" +
								 "# Bytes: " + nodes[pickedNode].numBytes + " (" + nodes[pickedNode].percentBytes + "%)\n" +
								 "PPS: " + nodes[pickedNode].pps + "\n" +
								 "BPS: " + nodes[pickedNode].bps + "\n" +
								 "BPP: " + nodes[pickedNode].bpp; 
								 
								 
								 
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
}




// Helper Functions
function randomNumber(min,max){
	return Math.random() * (max-min)+min;
}
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}