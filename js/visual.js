
let appearanceConfig = {
    Width: 300,
    labelWidthRange : [250,500],
    Height: 125,
    labelHeightRange: [100, 350],
    speedScale: 0.1,
    speedScaleRange: [0.1, 1],
    nodeScale: 1.0,
    nodeScaleRange: [0.5, 5],
    Node: '#0000ff',
    Ground: '#16283c',
    Back: '#5c5f64'
};

let saveConfig = {
    Width: appearanceConfig.Width,
    Height: appearanceConfig.Height,
    speedScale: appearanceConfig.speedScale,
    nodeScale: appearanceConfig.nodeScale,
    Node: appearanceConfig.Node,
    Ground: appearanceConfig.Ground,
    Back: appearanceConfig.Back
};

const X_AXIS=0, Y_AXIS=1, Z_AXIS=2;
const LAND=0, AIR=1, WATER=2;
const NUM_VEHICLE_TYPES = 3;
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
        this.currentLandNode = 0;
        this.currentAirNode = 0;
        this.currentWaterNode = 0;
        this.currentDataset = LAND;
        //Always have appearance and data folders to gui
        this.guiAppear = null;
        this.guiData = null;
        //Time slider
        this.sliderPos = 0;
        this.outlineNodeName = null;
        //Camera recording
        this.camPos = [];
        this.currentCamPos = -1;
        this.baseName = "timeVizConfig";
    }

    init(container) {
        super.init(container);

        //Load any preferences
        let prefs = localStorage.getItem(this.baseName + "Saved");
        if(prefs) {
            let value;
            for(let prop in appearanceConfig) {
                value = localStorage.getItem(this.baseName + prop);
                if(value) {
                    this.setGUI(prop,value);
                }
            }
            let colour = localStorage.getItem(this.baseName + "Back");
            if(colour) {
                this.renderer.setClearColor(colour, 1.0);
            }
        }
    }

    update() {
        super.update();
    }

    createScene() {
        super.createScene();

        this.GROUND_WIDTH = 16000;
        this.GROUND_HEIGHT = 12000;
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
        planeMaterial = new THREE.MeshLambertMaterial({color: appearanceConfig.Ground});
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
        const X_INC = 500;
        const X_START = 500;
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
        let startingNodes = [], endingNodes = [];

        for(j=0; j<numSets; ++j) {
            currentDataSet = this.data[j];
            numNodes = currentDataSet.length;
            for(i=0; i<numNodes; ++i) {
                i === 0 ? startingNodes.push(this.visNodes.length) : false;
                visNode = new VisNode();
                this.visNodes.push(visNode);
                info = currentDataSet[i];
                info.xPos = (j * X_INC) - X_START;
                info.labelScaleX = appearanceConfig.Width;
                info.labelScaleY = appearanceConfig.Height;
                info.speedScale = 1/appearanceConfig.speedScale;
                info.nodeScale = appearanceConfig.nodeScale;
                info.nodeColour = appearanceConfig.Node;
                visNode.init(info);
                visNode.setBounds(this.yearOffset, this.mapOffset, this.yearScale);
                visNode.createGeometry();
                nodeGroups[j].add(visNode.getNode());
            }
        }

        for(let i=0, numNodes=startingNodes.length; i<(numNodes-1); ++i) {
            endingNodes[i] = startingNodes[i+1] - startingNodes[i];
        }
        endingNodes[2] = this.visNodes.length - startingNodes[2];

        for(let i=0, numNodes=startingNodes.length; i<numNodes; ++i) {
            this.visNodes[startingNodes[i]].select(true);
        }

        this.updateInfoPanel();

        this.startingNodes = startingNodes;
        this.endingNodes = endingNodes;
    }

    createGUI() {
        //Create GUI - controlKit
        let yearOffset = 1890;
        let year = 1890;
        this.yearOffset = yearOffset;
        this.year = year;
        this.yearScale = 25;
        this.mapOffset = 1500;
        let yearSelection = 5;
        this.yearSelection = yearSelection;
        window.addEventListener('load', () => {

            let controlKit = new ControlKit();

            controlKit.addPanel({width: 200})
                .addSubGroup({label: 'Appearance', enable: false})
                    .addColor(appearanceConfig, 'Node', {colorMode: 'hex', onChange: () => {
                        this.onNodeColourChanged(appearanceConfig.Node);
                    }})
                    .addColor(appearanceConfig, 'Ground', {colorMode: 'hex', onChange: () => {
                        this.onGroundColourChanged(appearanceConfig.Ground);
                    }})
                    .addColor(appearanceConfig, 'Back', {colorMode: 'hex', onChange: () => {
                        this.onBackgroundColourChanged(appearanceConfig.Back);
                    }})
                .addSubGroup({label: 'Labels', enable: false})
                    .addSlider(appearanceConfig,'Width','labelWidthRange',{label: 'Width', dp: 1, onChange: () => {
                        this.onLabelScale(X_AXIS, appearanceConfig.Width);
                    }})
                    .addSlider(appearanceConfig,'Height','labelHeightRange',{label: 'Height', dp: 1, onChange: () => {
                        this.onLabelScale(Y_AXIS, appearanceConfig.Height);
                    }})
                .addSubGroup({label: 'Nodes', enable: false})
                    .addSlider(appearanceConfig,'speedScale','speedScaleRange',{label: 'Scale', dp: 1, onChange: () => {
                        this.onSpeedScale(appearanceConfig.speedScale);
                    }})
                    .addSlider(appearanceConfig, 'nodeScale', 'nodeScaleRange', {label: 'Size', dp: 1, onChange: () => {
                        this.onNodeScaleChanged(appearanceConfig.nodeScale);
                    }})

                .addSubGroup({label: "Preferences"})
                .addButton("Save", () => {
                    for(let prop in saveConfig) {
                        if(prop in appearanceConfig) {
                            saveConfig[prop] = appearanceConfig[prop];
                        }
                    }
                    this.savePreferences(saveConfig);
                });
        });
    }

    setGUI(prop, value) {
        let newValue = parseFloat(value);
        if(isNaN(newValue)) {
            appearanceConfig[prop] = value;
            return;
        }
        appearanceConfig[prop] = newValue;
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
            this.visNodes[i].setSpeedScale(1/scale);
        }
    }

    onNodeColourChanged(colour) {
        let i, numNodes = this.visNodes.length;
        for(i=0; i<numNodes; ++i) {
            this.visNodes[i].setColour(colour);
        }
    }

    onNodeScaleChanged(scale) {
        let i, numNodes = this.visNodes.length;
        for(i=0; i<numNodes; ++i) {
            this.visNodes[i].setNodeScale(scale);
        }
    }

    onGroundColourChanged(colour) {
        let ground = this.getObjectByName('ground');
        if(ground) {
            ground.material.color.setStyle(colour);
        }
    }

    onBackgroundColourChanged(colour) {
        this.renderer.setClearColor(colour, 1.0);
    }

    savePreferences(config) {
        for(let prop in config) {
            localStorage.setItem(this.baseName+prop, config[prop]);
        }
        localStorage.setItem(this.baseName+"Saved", "Saved");
    }

    nextRecord() {
        let currentNode = this.getCurrentNode();
        if(currentNode === undefined) return;

        ++currentNode;
        if(currentNode >= this.endingNodes[this.currentDataset]) return;

        let nodeNumber = currentNode + this.startingNodes[this.currentDataset];

        this.visNodes[nodeNumber - 1].select(false);
        this.visNodes[nodeNumber].select(true);
        this.setCurrentNode(currentNode);
        this.updateInfoPanel();
    }

    previousRecord() {
        let currentNode = this.getCurrentNode();
        if(!currentNode) return;

        --currentNode;
        let nodeNumber = currentNode + this.startingNodes[this.currentDataset];

        this.visNodes[nodeNumber + 1].select(false);
        this.visNodes[nodeNumber].select(true);
        this.setCurrentNode(currentNode);
        this.updateInfoPanel();
    }

    getCurrentNode() {
        let currentNode;
        switch(this.currentDataset) {
            case LAND:
                currentNode = this.currentLandNode;
                break;

            case AIR:
                currentNode = this.currentAirNode;
                break;

            case WATER:
                currentNode = this.currentWaterNode;
                break;

            default:
                break;
        }

        return currentNode;
    }

    setCurrentNode(node) {
        switch(this.currentDataset) {
            case LAND:
                this.currentLandNode = node;
                break;

            case AIR:
                this.currentAirNode = node;
                break;

            case WATER:
                this.currentWaterNode = node;
                break;

            default:
                break;
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

    changeRecordType(type) {
        //Set data type
        switch(type) {
            case "selectTypeLand":
                this.currentDataset = LAND;
                break;

            case "selectTypeAir":
                this.currentDataset = AIR;
                break;

            case "selectTypeWater":
                this.currentDataset = WATER;
                break;

            default:
                break;
        }
    }

    updateInfoPanel() {
        let dataSet, vehicleData;
        let elemPrefix = ["land", "air", "water"];
        let currentNodes = [this.currentLandNode, this.currentAirNode, this.currentWaterNode];
        for(let i=0; i<NUM_VEHICLE_TYPES; ++i) {
            dataSet = this.data[i];
            vehicleData = dataSet[currentNodes[i]];
            $('#' + elemPrefix[i] + 'Speed').html(vehicleData.Speed.toFixed(1));
            $('#' + elemPrefix[i] + 'Year').html(vehicleData.Year);
        }
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

    $('#previousRecord').on("click", () => {
        app.previousRecord();
    });
    $('#nextRecord').on("click", () => {
        app.nextRecord();
    });

    $('[id^="selectType"]').on("change", function() {
        app.changeRecordType(this.id);
    });

    app.run();
});
