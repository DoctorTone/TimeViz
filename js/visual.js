
var X_AXIS=0, Y_AXIS=1, Z_AXIS=2;

class VisApp extends BaseApp {
    constructor() {
        super();

        this.data = null;
        this.updateRequired = false;
        this.nodesRendered = 0;
        this.spritesRendered = 0;
        this.nodesInSlider = 0;
        this.guiControls = null;
        this.dataFile = null;
        this.currentNode = 0;
        //Always have appearance and data folders to gui
        this.guiAppear = null;
        this.guiData = null;
        //Time slider
        this.sliderPos = 0;
        this.outlineNodeName = null;
        //Camera recording
        this.camPos = [];
        this.currentCamPos = -1;
    }

    init(container) {
        super.init(container);
    }

    update() {
        super.update();
    }

    createScene() {
        super.createScene();

        this.GROUND_WIDTH = 1600;
        this.GROUND_HEIGHT = 1200;
        this.addGroundPlane();

        //Load json data
        let dataLoad = new dataLoader();

        dataLoad.load("data/speed.json", data => {
            this.data = data;
            this.addSceneContents();
        });
    }

    addGroundPlane() {
        // create the ground plane
        let width = this.GROUND_WIDTH, height = this.GROUND_HEIGHT;
        let planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
        let textureLoader = new THREE.TextureLoader();
        let texture = textureLoader.load("images/grid.png");
        let planeMaterial = new THREE.MeshLambertMaterial({map: texture, transparent: true, opacity: 0.5});
        let plane = new THREE.Mesh(planeGeometry,planeMaterial);
        let overlap = 10;

        // rotate and position the plane
        plane.rotation.x=-0.5*Math.PI;
        //plane.position.set(width/2 - overlap, 0, 0);

        this.addToScene(plane);

        //Second plane
        planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
        planeMaterial = new THREE.MeshLambertMaterial({color: 0x16283c});
        plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x=-0.5*Math.PI;
        //plane.position.set(width/2 - overlap, -1, 0);

        //Give it a name
        plane.name = 'ground';

        // add the plane to the scene
        this.addToScene(plane);
    }

    addSceneContents() {
        //Create a node for each data item
        const X_INC = 150;
        const X_START = 150;
        this.visNodes = [];
        let nodeGroups = [];
        let groupNodeNames = ['landRecords', 'airRecords', 'waterRecords'];
        let group, nodeGroup, numGroups = groupNodeNames.length;
        for(group=0; group<numGroups; ++group) {
            nodeGroup = new THREE.Object3D();
            nodeGroup.name = groupNodeNames[group];
            this.addToScene(nodeGroup);
            nodeGroups.push(nodeGroup);
        }
        let numSets = this.data.length;
        let numNodes;
        let i,j, visNode, info, currentDataSet;

        for(j=0; j<numSets; ++j) {
            currentDataSet = this.data[j];
            numNodes = currentDataSet.length;
            for(i=0; i<numNodes; ++i) {
                visNode = new VisNode();
                this.visNodes.push(visNode);
                info = currentDataSet[i];
                info.xPos = (j * X_INC) - X_START;
                visNode.init(info);
                visNode.setBounds(this.yearOffset, this.mapOffset, this.yearScale);
                visNode.createGeometry();
                nodeGroups[j].add(visNode.getNode());
            }
        }

        this.reDrawNodes();
    }

    outlineNode(name) {
        //Generate or remove highlight around given node

        //Ensure we aren't clicking same node twice
        if(this.outlineNodeName == name +'outline') return;

        //Remove any existing highlighting
        let node;
        if(this.outlineNodeName) {
            node = this.scene.getObjectByName(this.outlineNodeName);
            if(node) {
                this.scene.remove(node);
                this.outlineNodeName = null;
            }
        }

        if(name) {
            node = this.scene.getObjectByName(name);
            if (node) {
                let outlineMat = new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.BackSide});
                let outlineMesh;
                let outlineGeom;
                switch (this.guiControls.NodeStyle) {
                    case 'Sphere':
                        outlineGeom = new THREE.SphereGeometry(1, 20, 20);
                        outlineMesh = new THREE.Mesh(outlineGeom, outlineMat);
                        outlineMesh.name = name + 'outline';
                        this.outlineNodeName = outlineMesh.name;
                        break;
                }
                outlineMesh.position = node.position;
                outlineMesh.scale.multiplyScalar(1.2);
                this.addToScene(outlineMesh);
            }
        }
    }

    createGUI() {
        //Create GUI - controlKit
        let yearOffset = 1890;
        let year = 1890;
        this.yearOffset = yearOffset;
        this.year = year;
        this.yearScale = 8;
        this.mapOffset = 220;
        let yearSelection = 5;
        this.yearSelection = yearSelection;
        let _this = this;
        window.addEventListener('load',function(){
            let appearanceConfig = {
                labelWidth: 100,
                labelWidthRange : [50,300],
                labelHeight: 50,
                labelHeightRange: [30, 250],
                speedScale: 0.7,
                speedScaleRange: [0.1, 10],
                renderStyles: ["Cull", "Colour", "Transparent"],
                nodeColour: '#0000ff',
                sliderColour: '#5f7c9d',
                groundColour: '#16283c',
                backgroundColour: '#5c5f64'
            };

            let dataConfig = {
                year: year,
                yearRange: [yearOffset, 2000],
                selection: yearSelection,
                selectionRange: [yearSelection, 110],
                showSlider: true
            };

            let controlKit = new ControlKit();

            controlKit.addPanel({width: 200})
                .addGroup({label: 'Appearance', enable: false})
                .addSlider(appearanceConfig,'labelWidth','labelWidthRange',{label: 'LabelWidth', dp: 1, onChange: function() {
                    _this.onLabelScale(X_AXIS, appearanceConfig.labelWidth);
                }})
                .addSlider(appearanceConfig,'labelHeight','labelHeightRange',{label: 'LabelHeight', dp: 1, onChange: function() {
                    _this.onLabelScale(Y_AXIS, appearanceConfig.labelHeight);
                }})
                .addSlider(appearanceConfig,'speedScale','speedScaleRange',{label: 'SpeedScale', dp: 1, onChange: function() {
                    _this.onSpeedScale(appearanceConfig.speedScale);
                }})
                .addColor(appearanceConfig, 'nodeColour', {colorMode: 'hex', onChange: function() {
                    _this.onNodeColourChanged(appearanceConfig.nodeColour);
                }})
                .addColor(appearanceConfig, 'groundColour', {colorMode: 'hex', onChange: function() {
                    _this.onGroundColourChanged(appearanceConfig.groundColour);
                }})
                .addColor(appearanceConfig, 'backgroundColour', {colorMode: 'hex', onChange: function() {
                    _this.onBackgroundColourChanged(appearanceConfig.backgroundColour);
                }})
        });
    }

    onLabelScale(axis, scale) {
        //Scale vis node labels
        let i, numNodes = this.visNodes.length;
        switch(axis) {
            case X_AXIS:
                for(i=0; i<numNodes; ++i) {
                    this.visNodes[i].updateLabelWidth(scale);
                }
                break;

            case Y_AXIS:
                for(i=0; i<numNodes; ++i) {
                    this.visNodes[i].updateLabelHeight(scale);
                }
                break;

            default:
                console.log("No axis for scale!");
                break;
        }
    }

    onSpeedScale(scale) {
        let i, numNodes = this.visNodes.length;
        for(i=0; i<numNodes; ++i) {
            this.visNodes[i].setSpeedScale(3/scale);
        }
    }

    onNodeColourChanged(colour) {
        let i, numNodes = this.visNodes.length;
        for(i=0; i<numNodes; ++i) {
            this.visNodes[i].setColour(colour);
        }
    }

    onGroundColourChanged(colour) {
        let ground = this.scene.getObjectByName('ground');
        if(ground) {
            ground.material.color.setStyle(colour);
        }
    }

    onBackgroundColourChanged(colour) {
        this.renderer.setClearColor(colour, 1.0);
    }

    onNextRecord() {
        let numNodes = this.visNodes.length;
        if(this.currentNode + 1 === numNodes) return;
        this.visNodes[this.currentNode].setTransparency(true);
        ++this.currentNode;
        this.visNodes[this.currentNode].setTransparency(false);
    }

    onPreviousRecord() {
        if(this.currentNode === 0) return;
        this.visNodes[this.currentNode].setTransparency(true);
        --this.currentNode;
        this.visNodes[this.currentNode].setTransparency(false);
    }

    updateInfoPanel() {
        $('#currentYear').html(this.year);
        //Get data fo this year
        let i, node, maxSpeed = 0, numNodes = this.visNodes.length;
        for(i=0; i<numNodes; ++i) {
            node = this.visNodes[i];
            if(node.getYear() === this.year) {
                if(node.getSpeed() > maxSpeed) {
                    $('#landSpeed').html(Math.round(node.getSpeed()));
                }
            }
        }
    }

    reDrawNodes() {
        let i, numNodes = this.visNodes.length;
        let yearMax = this.year + (this.yearSelection/2), yearMin = this.year - (this.yearSelection/2);
        let node, nodeYear;
        for(i=0; i<numNodes; ++i) {
            node = this.visNodes[i];
            nodeYear = node.getYear();
            node.setVisibility(true);
            if(nodeYear === this.year) {
                node.setTransparency(false);
            } else {
                node.setTransparency(true);
            }
        }
    }

    changeView(view) {
        //Alter cam view
        this.controls.reset();
        switch (view) {
            case FRONT:
                this.camera.position.set(170, 60, 380);
                break;
            case RIGHT:
                this.camera.position.set(460, 35, 0);
                break;
            case LEFT:
                this.camera.position.set(-240, 35, 0);
                break;
            case TOP:
                this.camera.position.set(180, 470, 0);
                break;
        }
        this.controls.setLookAt(new THREE.Vector3(170, 70, 0));
    }
}

const FRONT= 0, RIGHT= 1, LEFT= 2, TOP=3;
$(document).ready(function() {
    //Initialise app
    let container = document.getElementById("WebGL-output");
    let app = new VisApp();
    app.init(container);
    app.createGUI();
    app.createScene();

    //GUI callbacks
    $("#camFront").on("click", function(evt) {
        app.changeView(FRONT);
    });
    $("#camRight").on("click", function(evt) {
        app.changeView(RIGHT);
    });
    $("#camLeft").on("click", function(evt) {
        app.changeView(LEFT);
    });
    $("#camTop").on("click", function(evt) {
        app.changeView(TOP);
    });

    app.run();
});
