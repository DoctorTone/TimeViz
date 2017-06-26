/**
 * Created by atg on 14/05/2014.
 */

function getDuplicates(arr, xAxis, yAxis) {
    //Get frequency of required members
    let dupes = [];
    let i, j, item, currentItem;
    for(i=0; i<arr.length; ++i) {
        item = arr[i];
        for(j=0; j<arr.length; ++j) {
            if(i == j) continue;

            currentItem = arr[j];
            if(item[xAxis] == currentItem[xAxis] &&
                    item[yAxis] == currentItem[yAxis]) {
                dupes.push(item[xAxis]);
                dupes.push(item[yAxis]);
            }
        }
    }

    if(dupes.length == 0) return null;

    //Convert array to object
    let frequency = {};
    let key1, key2;
    for(i=0; i<dupes.length; i+=2) {
        key1 = dupes[i];
        key2 = dupes[i+1];
        if(!(key1 in frequency)) {
            frequency[key1] = {};
            frequency[key1][key2] = 1;
        }
        else {
            ++(frequency[key1][key2]);
        }
    }

    return frequency;
}

function eliminateDuplicates(arr) {
    var r = [];
    start: for(var i = 0; i < arr.length; ++i) {
        for(var x = 0; x < r.length; ++x) {
            if(r[x]==arr[i]) {
                continue start;
            }
        }
        r[r.length] = arr[i];
    }
    return r;
}

function eliminateInvalidCells(arr) {
    //Assume invalid to be empty or undefined values
    //Assume there are NO duplicates!!!
    var out=[];

    for(var index=0; index<arr.length; ++index) {
        if(arr[index] != null && arr[index] != undefined) {
            out.push(arr[index]);
        }
    }

    return out;
}

function populatePanel(data, left, top) {
    //Fill in node panel details and display
    var element = $('#nodePanel');
    element.show();
    element.css('top', top-15);
    element.css('left', left+15);

    for(var key in data) {
        var item = document.getElementById(key);
        if (item) {
            item.innerHTML = data[key];
        }
    }
}

var X_AXIS=0, Y_AXIS=1, Z_AXIS=2;

//Init this app from base
function VisApp() {
    BaseApp.call(this);
}

VisApp.prototype = new BaseApp();

//Render states and styles
var RENDER_NORMAL= 0, RENDER_STYLE=1;
var RENDER_CULL= 0, RENDER_COLOUR= 1, RENDER_TRANSPARENT=2;

VisApp.prototype.init = function(container) {
    BaseApp.prototype.init.call(this, container);
    this.data = null;
    this.updateRequired = false;
    this.nodesRendered = 0;
    this.spritesRendered = 0;
    this.nodesInSlider = 0;
    this.guiControls = null;
    this.dataFile = null;
    this.filename = "horror.json";
    this.currentNode = 0;
    //Always have appearance and data folders to gui
    this.guiAppear = null;
    this.guiData = null;
    //Time slider
    this.sliderPos = 0;
    //Rendering style
    this.renderStyle = RENDER_CULL;
    this.outlineNodeName = null;
    //Camera recording
    this.camPos = [];
    this.currentCamPos = -1;
    //Lights
    this.lightRange = 500;
};

VisApp.prototype.update = function() {
    //Perform any updates
    var clicked = this.mouse.clicked;

    BaseApp.prototype.update.call(this);

    if(this.pickedObjects.length > 0) {
        //DEBUG
        //console.log("Picked ", this.pickedObjects.length, "objects");
        //Show node info if selected
        var showingNode = false;
        for(var hit=0; hit<this.pickedObjects.length; ++hit) {
            var node = this.pickedObjects[hit].object.name;
            if(node.indexOf('Node') >= 0) {
                //Remove 'node'
                var name = node.substr(5, node.length-5);
                var data = this.getDataItem(name);
                if(data) {
                    populatePanel(data, this.mouseRaw.x, this.mouseRaw.y);
                    showingNode = true;
                    //Draw outline around node
                    //this.outlineNode(node);
                    break;
                }
            }
        }
        if(!showingNode) {
            $("#nodePanel").hide();
            //this.outlineNode(false);
        }
        this.pickedObjects.length = 0;
    } else {
        if(clicked) {
            $("#nodePanel").hide();
            //this.outlineNode(false);
        }
    }
};

VisApp.prototype.createScene = function() {
    //Init base createsScene
    BaseApp.prototype.createScene.call(this);

    var _this = this;

    this.axesGroup = new THREE.Object3D();
    this.axesGroup.name = "groupSlider";
    var fontLoader = new THREE.FontLoader();
    fontLoader.load("fonts/helvetiker_regular.typeface.json", function(response) {
        _this.font = response;
        //addAxes(_this.axesGroup, response);
    });

    this.GROUND_DEPTH = 960;
    this.GROUND_WIDTH = 720;
    addGroundPlane(this.scene, this.GROUND_WIDTH, this.GROUND_DEPTH);
    this.SLIDER_WIDTH = 350;
    this.SLIDER_HEIGHT = 275;
    this.SLIDER_DEPTH = 20;
    //addTimeSlider(this.axesGroup, this.SLIDER_WIDTH, this.SLIDER_HEIGHT, this.SLIDER_DEPTH);
    this.axesGroup.position.z = -this.mapOffset;
    this.scene.add(this.axesGroup);
    this.sliderEnabled = true;

    //Load json data
    var dataLoad = new dataLoader();
    var dataParser = function(data) {
        _this.data = data;
        _this.addSceneContents();
    };

    dataLoad.load("data/speed.json", dataParser);

    //Light box
    var boxGeom = new THREE.BoxGeometry(2, 2, 2);
    var boxMat = new THREE.MeshBasicMaterial( {color: 0xffffff});
    var box = new THREE.Mesh(boxGeom, boxMat);
    box.name = 'lightBox';
    var light = this.scene.getObjectByName('PointLight', true);
    if(light) {
        box.position.copy(light.position);
    }

    this.scene.add(box);
};

VisApp.prototype.addSceneContents = function() {
    //Create a node for each data item
    const X_INC = 150;
    this.visNodes = [];
    let nodeGroups = [];
    let groupNodeNames = ['landRecords', 'airRecords', 'waterRecords'];
    let group, nodeGroup, numGroups = groupNodeNames.length;
    for(group=0; group<numGroups; ++group) {
        nodeGroup = new THREE.Object3D();
        nodeGroup.name = groupNodeNames[group];
        this.scene.add(nodeGroup);
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
            info.xPos = j * X_INC;
            visNode.init(info);
            visNode.setBounds(this.yearOffset, this.mapOffset, this.yearScale);
            visNode.createGeometry();
            nodeGroups[j].add(visNode.getNode());
        }
    }

    this.reDrawNodes();
};

VisApp.prototype.outlineNode = function(name) {
    //Generate or remove highlight around given node

    //Ensure we aren't clicking same node twice
    if(this.outlineNodeName == name +'outline') return;

    //Remove any existing highlighting
    var node;
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
            var outlineMat = new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.BackSide});
            var outlineMesh;
            var outlineGeom;
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
            this.scene.add(outlineMesh);
        }
    }
};

VisApp.prototype.createGUI = function() {
    //Create GUI - controlKit
    var yearOffset = 1890;
    var year = 1890;
    this.yearOffset = yearOffset;
    this.year = year;
    this.yearScale = 8;
    this.mapOffset = 220;
    var yearSelection = 5;
    this.yearSelection = yearSelection;
    var _this = this;
    window.addEventListener('load',function(){
        var appearanceConfig = {
            labelWidth: 100,
            labelWidthRange : [50,300],
            labelHeight: 50,
            labelHeightRange: [30, 250],
            speedScale: 1,
            speedScaleRange: [1, 10],
            renderStyles: ["Cull", "Colour", "Transparent"],
            nodeColour: '#0000ff',
            sliderColour: '#5f7c9d',
            groundColour: '#16283c',
            backgroundColour: '#5c5f64'
        };

        var dataConfig = {
            year: year,
            yearRange: [yearOffset, 2000],
            selection: yearSelection,
            selectionRange: [yearSelection, 110],
            showSlider: true
        };

        var controlKit = new ControlKit();

        controlKit.addPanel({width: 250})
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
                .addSelect(appearanceConfig, 'renderStyles', {
                    selected: 0,
                    onChange: function(index) {
                        _this.onChangeRenderStyle(appearanceConfig.renderStyles[index]);
                    }
                })
                .addColor(appearanceConfig, 'nodeColour', {colorMode: 'hex', onChange: function() {
                    _this.onNodeColourChanged(appearanceConfig.nodeColour);
                }})
                .addColor(appearanceConfig, 'sliderColour', {colorMode: 'hex', onChange: function() {
                    _this.onSliderColourChanged(appearanceConfig.sliderColour);
                }})
                .addColor(appearanceConfig, 'groundColour', {colorMode: 'hex', onChange: function() {
                    _this.onGroundColourChanged(appearanceConfig.groundColour);
                }})
                .addColor(appearanceConfig, 'backgroundColour', {colorMode: 'hex', onChange: function() {
                    _this.onBackgroundColourChanged(appearanceConfig.backgroundColour);
                }})
            .addGroup({label: 'Data', enable: false})
                .addButton("Next", function() {
                    _this.onNextRecord();
                }, {label: 'Record'})
                .addButton("Previous", function() {
                    _this.onPreviousRecord();
                }, {label: 'Record'})
    });
};

VisApp.prototype.onLabelScale = function(axis, scale) {
    //Scale vis node labels
    var i, numNodes = this.visNodes.length;
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
};

VisApp.prototype.onSpeedScale = function(scale) {
    var i, numNodes = this.visNodes.length;
    for(i=0; i<numNodes; ++i) {
        this.visNodes[i].setSpeedScale(3/scale);
    }
};

VisApp.prototype.onChangeRenderStyle = function(style) {

};

VisApp.prototype.onNodeColourChanged = function(colour) {
    var i, numNodes = this.visNodes.length;
    for(i=0; i<numNodes; ++i) {
        this.visNodes[i].setColour(colour);
    }
};

VisApp.prototype.onSliderColourChanged = function(colour) {
    var slider = this.scene.getObjectByName('timeSlider', true);
    if(slider) {
        slider.material.color.setStyle(colour);
    }
};

VisApp.prototype.onGroundColourChanged = function(value) {
    var ground = this.scene.getObjectByName('ground');
    if(ground) {
        ground.material.color.setStyle(value);
    }
};

VisApp.prototype.onBackgroundColourChanged = function(value) {
    this.renderer.setClearColor(value, 1.0);
};

VisApp.prototype.onNextRecord = function() {
    var numNodes = this.visNodes.length;
    if(this.currentNode + 1 === numNodes) return;
    this.visNodes[this.currentNode].setTransparency(true);
    ++this.currentNode;
    this.visNodes[this.currentNode].setTransparency(false);
};

VisApp.prototype.onPreviousRecord = function() {
    if(this.currentNode === 0) return;
    this.visNodes[this.currentNode].setTransparency(true);
    --this.currentNode;
    this.visNodes[this.currentNode].setTransparency(false);
};

VisApp.prototype.onYearChanged = function(year) {
    var slider = this.scene.getObjectByName('groupSlider', true);
    if(slider) {
        slider.position.z = (year-this.yearOffset)*this.yearScale-this.mapOffset;
        this.reDrawNodes();
        this.updateInfoPanel();
    }
};

VisApp.prototype.onSelectionChanged = function(selection) {
    var slider = this.scene.getObjectByName('timeSlider', true);
    if(slider) {
        slider.scale.z = selection*this.yearScale;
        this.reDrawNodes();
    }
};

VisApp.prototype.onToggleSlider = function(status) {
    var slider = this.scene.getObjectByName('timeSlider', true);
    if(slider) {
        slider.visible = status;
    }
};

VisApp.prototype.updateInfoPanel = function() {
    $('#currentYear').html(this.year);
    //Get data fo this year
    var i, node, maxSpeed = 0, numNodes = this.visNodes.length;
    for(i=0; i<numNodes; ++i) {
        node = this.visNodes[i];
        if(node.getYear() === this.year) {
            if(node.getSpeed() > maxSpeed) {
                $('#landSpeed').html(Math.round(node.getSpeed()));
            }
        }
    }
};

VisApp.prototype.styleChanged = function(value) {
    switch (value) {
        case 'Cull':
            this.renderStyle = RENDER_CULL;
            break;
        case 'Colour':
            this.renderStyle = RENDER_COLOUR;
            break;
        case 'Transparent':
            this.renderStyle = RENDER_TRANSPARENT;
            break;
    }
    this.updateRequired = true;
};

VisApp.prototype.reDrawNodes = function() {
    var i, numNodes = this.visNodes.length;
    var yearMax = this.year + (this.yearSelection/2), yearMin = this.year - (this.yearSelection/2);
    var node, nodeYear;
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
};

VisApp.prototype.analyseItem = function(item, updatedData) {
    //Analyse this item and adjust appearance accordingly
    var update = null;
    if(!updatedData) return null;

    //See if item in updated data
    var key = item[this.xAxisName];
    if(key in updatedData) {
        var freq = updatedData[key][item[this.yAxisName]];
        if (freq != undefined) {
            update = { material: new THREE.MeshPhongMaterial({color: 0xff0000}),
                position: -freq * 10};
        }
    }
    return update;
};

VisApp.prototype.analyseData = function() {
    //Analyse data and configure accordingly
    var dupes = getDuplicates(this.data, this.xAxisName, this.yAxisName);

    return dupes;
};

VisApp.prototype.generateData = function() {
    //Analyse data first
    var updates = this.analyseData();

    var extraData = this.guiControls.extra;

    //Create node geometry
    var nodeGeometry;
    switch(this.guiControls.NodeStyle) {
        case 'Sphere':
            nodeGeometry = new THREE.SphereGeometry(1,20,20);
            break;

        case 'Cube':
            nodeGeometry = new THREE.BoxGeometry(2, 2, 2);
            break;

        case 'Diamond':
            nodeGeometry = new THREE.OctahedronGeometry(2);
            break;
    }

    var defaultMaterial = new THREE.MeshPhongMaterial({color: 0x7777ff});
    defaultMaterial.color.setStyle(this.guiControls.Node);
    var colourMaterial = new THREE.MeshPhongMaterial({color: 0x141414});
    var transparentMaterial = new THREE.MeshPhongMaterial({color: 0x7777ff, transparent: true, opacity: 0.1});

    var nodes = [];
    //Keep track of which nodes have been visited
    var visited = {};
    var updateRequired;
    this.nodesInSlider = 0;
    for(var i=0; i<this.data.length; ++i) {
        //Only render nodes with valid axis values
        var item = this.data[i];
        var xAxis = item[this.xAxisName];
        var yAxis = item[this.yAxisName];
        var year = item[this.timeAxis];
        var diff = this.guiControls.Selection/2;
        var minYear = this.guiControls.year - diff;
        var maxYear = this.guiControls.year + diff;
        var renderState = RENDER_NORMAL;
        var renderStyle = this.renderStyle; //RENDER_TRANSPARENT;
        //DEBUG
        //console.log("Max=", maxYear, " min=", minYear);
        if(xAxis >= 0 && yAxis >= 0) {
            //Determine how we render this node
            if(year < minYear || year > maxYear) {
                renderState = RENDER_STYLE;
            } else {
                //Check any filtering
                var renderNode = true;
                for(var key in extraData) {
                    //Different action for numeric filtering
                    if(extraData[key] != "" && extraData[key] != item[key]) {
                        if(typeof extraData[key] === 'number') {
                            if(extraData[key] <= item[key]) {
                                renderState = RENDER_STYLE;
                                renderNode = false;
                                break;
                            }
                        }else {
                            renderState = RENDER_STYLE;
                            renderNode = false;
                            break;
                        }
                    }
                }
                if(renderNode) ++this.nodesInSlider;
            }
            //Examine data and adjust accordingly
            updateRequired = this.analyseItem(item, updates);
            if(updateRequired) {
                if(!(x in visited)) {
                    visited[xAxis] = {};
                    visited[xAxis][yAxis] = 0;
                }
                else {
                    ++(visited[xAxis][yAxis]);
                }
            }

            if(renderState != RENDER_NORMAL && renderStyle == RENDER_CULL) continue;

            var nodeMaterial = renderState == RENDER_NORMAL ? defaultMaterial : renderStyle == RENDER_COLOUR ? colourMaterial : transparentMaterial;
            //var node = new THREE.Mesh(sphereGeometry, updateRequired ? updateRequired.material : material);
            var node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.x = item[this.xAxisName] * this.guiControls.xAxisScale;
            node.position.y = item[this.yAxisName] * this.guiControls.yAxisScale;
            node.position.z = this.sliderEnabled ? (item[this.timeAxis]-this.yearMin)/(this.yearMax - this.yearMin) * this.GROUND_DEPTH - this.GROUND_DEPTH/2 : 0;
            var labelPos = new THREE.Vector3();
            labelPos.x = node.position.x;
            labelPos.y = node.position.y;
            labelPos.z = this.sliderEnabled ? node.position.z : updateRequired ? visited[xAxis][yAxis] * -5 : 0;
            //Give node a name
            node.name = 'Node ' + item[this.nameKey];
            ++this.nodesRendered;
            nodes.push(node);
            this.scene.add(node);
            if(this.guiControls.ShowLabels) {
                var top = this.guiControls.LabelTop == '' ? null : this.guiControls.LabelTop;
                var bottom = this.guiControls.LabelBottom == '' ? null : this.guiControls.LabelBottom;
                var colour = this.guiControls.Text;
                if(renderState != RENDER_NORMAL && renderStyle == RENDER_COLOUR) {
                    colour = [20, 20, 20];
                }
                this.generateLabels(item[top], item[bottom], labelPos, colour, this.guiControls.Label, this.guiControls.Border, nodeMaterial.opacity ? nodeMaterial.opacity : 1);
            }
        }
    }
};

VisApp.prototype.getDataItem = function(name) {
    //Get data given name
    for(var i=0; i<this.data.length; ++i) {
        var item = this.data[i];
        if(item[this.nameKey] === name) {
            return item;
        }
    }

    return null;
};

VisApp.prototype.generateLabels = function(topName, bottomName, position, textColour, labelColour, borderColour, opacity) {

    var fontSize = this.guiControls.fontSize;
    var scale = new THREE.Vector3(this.guiControls.fontWidth, this.guiControls.fontHeight, 1);
    position.top = true;
    if(textColour != undefined) {
        spriteManager.setTextColour(textColour);
    }

    if(labelColour != undefined) {
        spriteManager.setBackgroundColour(labelColour);
    }

    if(borderColour != undefined) {
        spriteManager.setBorderColour(borderColour);
    }

    if(topName) {
        var labelTop = spriteManager.create(topName, position, scale, 32, 1, true);
        //Give sprite a name
        labelTop.name = "Sprite" + this.spritesRendered++;
        this.scene.add(labelTop);
    }

    position.top = false;
    if(bottomName) {
        position.y -= (3*scale.y/5);
        var labelBottom = spriteManager.create(bottomName, position, scale, 32, 1, true);
        //Give sprite a name
        labelBottom.name = "Sprite" + this.spritesRendered++;
        this.scene.add(labelBottom);
    }
};

function createLabel(name, position, scale, colour, fontSize, opacity) {

    var fontface = "Arial";
    var spacing = 10;

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var metrics = context.measureText( name );
    var textWidth = metrics.width;

    canvas.width = textWidth + (spacing * 2);
    canvas.width *= 2;
    canvas.height = fontSize;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillStyle = "rgba(255, 255, 255, 0.0)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    var red = Math.round(colour[0]);
    var green = Math.round(colour[1]);
    var blue = Math.round(colour[2]);

    context.fillStyle = "rgba(" + red + "," + green + "," + blue + "," + "1.0)";
    context.font = fontSize + "px " + fontface;

    context.fillText(name, canvas.width/2, canvas.height/2);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    //texture.needsUpdate = true;
    var spriteMaterial = new THREE.SpriteMaterial({
            //color: color,
            transparent: false,
            opacity: opacity,
            useScreenCoordinates: false,
            blending: THREE.AdditiveBlending,
            map: texture}
    );

    var sprite = new THREE.Sprite(spriteMaterial);

    sprite.scale.set(scale.x, scale.y, 1);
    sprite.position.set(position.x, position.y, position.z);

    return sprite;
}

VisApp.prototype.generateGUIControls = function() {
    //Add filename to gui
    this.guiControls.filename = this.filename;

    //Get UI controls to add
    var i, index;
    var guiLabels = Object.keys(this.data[0]);
    this.xAxisName = guiLabels[guiLabels.length-2];
    this.yAxisName = guiLabels[guiLabels.length-1];
    this.timeAxis = 'year';
    this.nameKey = guiLabels[0];

    var extraGui = {};
    for(i=0; i<guiLabels.length; ++i) {
        extraGui[guiLabels[i]] = "";
    }

    //Create master and sub arrays
    var numRecords = this.data.length;
    var numAttribs = guiLabels.length;
    var master = new Array(numAttribs);

    for(var lists=0; lists<numAttribs; ++lists) {
        master[lists] = [];
    }

    //Populate arrays with relevant values
    var x=0;
    i=0;
    var item;
    for(var elem=0; elem<numRecords; ++elem) {
        item = this.data[elem];
        for(var key in item) {
            master[x++][i] = item[key];
        }
        ++i;
        x=0;
    }

    //Eliminate duplicates
    for(var arr=0; arr<master.length; ++arr) {
        master[arr] = eliminateDuplicates(master[arr]);
        master[arr] = eliminateInvalidCells(master[arr]);
    }

    var _this = this;
    this.guiControls.extra = extraGui;
    for(var label=1; label<guiLabels.length; ++label) {
        var max, min;
        if(guiLabels[label] == this.timeAxis) {
            master[label].sort(function(a,b) {
                return a-b;
            });
            //Assume this is time-based data
            max = master[label][master[label].length-1];
            min = master[label][0];
            this.yearMax = max;
            this.yearMin =  min;
            this.guiControls.year = (max-min)/2 + min;
            var yearChange = this.guiData.add(this.guiControls, guiLabels[label].toString(), min, max).step(1);
            yearChange.listen();
            yearChange.onChange(function(value) {
                _this.updateRequired = true;
            });
            //Add slider depth info
            this.guiControls.Selection = 10;
            this.guiControls.ShowSlider = true;
            var selection = this.guiData.add(this.guiControls, 'Selection', 0, (max-min)*2).step(2);
            selection.listen();
            selection.onChange(function(value) {
                _this.updateRequired = true;
            });
            var timeSlider = this.guiData.add(this.guiControls, 'ShowSlider').listen();
            timeSlider.onChange(function(value) {
                _this.toggleSlider(value);
            });
        }
        else {
            //Convert all numeric values to sliders
            var control=null;
            if(typeof master[label][0] === 'number') {
                master[label].sort(function(a,b) {
                    return a-b;
                });
                min = master[label][0];
                max = master[label][master[label].length-1];
                //Set default value of field
                var field = guiLabels[label].toString();
                this.guiControls.extra[field] = max;
                control = this.guiData.add(this.guiControls.extra, field, min, max);
            } else {
                //Add drop down list of values
                master[label].splice(0, 0, "");
                control = this.guiData.add(this.guiControls.extra, guiLabels[label].toString(), master[label]);
            }

            if(control != null) {
                control.onChange(function(value) {
                    _this.updateRequired = true;
                });
            }
        }
    }

    //DEBUG
    //console.log('Object =', this.guiData.__controllers);
    //var controller = this.guiData.__controllers[0];
    //this.guiDeleted.add(controller);
    //this.guiData.remove(controller);

    //Labelling
    var displayLabels = guiLabels;
    displayLabels.splice(0, 0, '');
    //displayLabels.splice(0, 0, '', 'Project name');
    this.guiAppear.add(this.guiControls, 'LabelTop', displayLabels).onChange(function(value) {
        _this.updateRequired = true;
    });

    this.guiAppear.add(this.guiControls, 'LabelBottom', displayLabels).onChange(function(value) {
        _this.updateRequired = true;
    });
};

VisApp.prototype.toggleSlider = function(slider) {
    //Toggle slider visibility
    var box = this.scene.getObjectByName("timeSlider", true);
    if(box) {
        box.visible = slider;
        this.sliderEnabled = slider;
    }
    this.updateRequired = true;
};

VisApp.prototype.changeLightPos = function(value, axis) {
    //Change light pos
    var light = this.scene.getObjectByName('PointLight', true);
    var box = this.scene.getObjectByName('lightBox', true);
    if(!light || !box) {
        console.log('No light or light box');
        return;
    }
    switch(axis) {
        case -1:
            //X-axis
            light.position.x = value;
            box.position.x = value;
            break;

        case 0:
            //Y-Axis
            light.position.y = value;
            box.position.y = value;
            break;

        case 1:
            //Z-Axis
            light.position.z = value;
            box.position.z = value;
            break;

        default:
            break;
    }
};

VisApp.prototype.changeView = function(view) {
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
};

VisApp.prototype.savePreset = function() {
    //Save visualisation details
    if(!this.data) return;

    var tempCamPos = new THREE.Vector3().copy(this.camera.position);
    var tempCamRot = new THREE.Quaternion().copy(this.camera.quaternion);
    var tempLookat = new THREE.Vector3().copy(this.controls.getLookAt());

    //Save slider details
    var showSlider = this.guiControls.ShowSlider;
    var sliderPos = this.guiControls.year;
    var sliderWidth = this.guiControls.Selection;
    var renderStyle = this.guiControls.RenderStyle;

    var presetDetails = {pos : tempCamPos, rot : tempCamRot, look : tempLookat,
                         showSlider : showSlider, sliderPos : sliderPos, sliderWidth : sliderWidth, renderStyle : renderStyle};

    this.camPos.push(presetDetails);

    //Update preset value
    updatePresets(this.currentCamPos+1, this.camPos.length);
};

VisApp.prototype.gotoNextPreset = function() {
    //Go to next cam pos in list if possible
    if(this.camPos.length < 0) return;

    if(this.currentCamPos >= this.camPos.length-1) return;

    ++this.currentCamPos;
    var presetDetails = this.camPos[this.currentCamPos];

    //Camera details
    this.controls.reset();
    this.controls.setCameraRotation(presetDetails.rot);
    this.camera.position.set(presetDetails.pos.x, presetDetails.pos.y, presetDetails.pos.z);
    this.controls.setLookAt(presetDetails.look);

    //Slider details
    this.guiControls.ShowSlider = presetDetails.showSlider;
    this.toggleSlider(presetDetails.showSlider);
    this.guiControls.year = presetDetails.sliderPos;
    this.guiControls.Selection = presetDetails.sliderWidth;
    this.guiControls.RenderStyle = presetDetails.renderStyle;
    this.styleChanged(presetDetails.renderStyle);
    this.updateRequired = true;

    //Update preset value
    updatePresets(this.currentCamPos+1, this.camPos.length);
};

VisApp.prototype.gotoPreviousPreset = function() {
    //Go to previous cam pos if possible
    if(this.camPos.length < 0) return;

    if(this.currentCamPos <= 0) {
        if(this.currentCamPos == 0 && this.camPos.length == 1) {
            this.currentCamPos = 1;
        } else {
            return;
        }
    }

    --this.currentCamPos;
    var presetDetails = this.camPos[this.currentCamPos];

    //Camera details
    this.controls.reset();
    this.controls.setCameraRotation(presetDetails.rot);
    this.camera.position.set(presetDetails.pos.x, presetDetails.pos.y, presetDetails.pos.z);
    this.controls.setLookAt(presetDetails.look);

    //Slider details
    this.guiControls.ShowSlider = presetDetails.showSlider;
    this.toggleSlider(presetDetails.showSlider);
    this.guiControls.year = presetDetails.sliderPos;
    this.guiControls.Selection = presetDetails.sliderWidth;
    this.guiControls.RenderStyle = presetDetails.renderStyle;
    this.styleChanged(presetDetails.renderStyle);
    this.updateRequired = true;

    //Update preset value
    updatePresets(this.currentCamPos+1, this.camPos.length);
};

function updatePresets(preset, total) {
    if(preset < 1) preset = '*';
    document.getElementById('presetNum').innerHTML = 'Preset :  ' + preset + '/' + total;
}

VisApp.prototype.reset = function() {
    //Reset rendering and data
    this.removeNodes();

    //Clear data
    this.data = null;
    this.dataFile = null;
    this.filename = "";

    //Clear gui controls
    this.guiControls.filename = null;
    this.guiControls = null;
    this.guiAppear = null;
    this.guiData = null;
    this.guiDeleted = null;
    this.gui.destroy();
    this.renderStyle = RENDER_CULL;
    this.createGUI();
};

VisApp.prototype.keydown = function(event) {
    //Do any key processing
    switch(event.keyCode) {
        case 80: //P
            console.log("Cam =", this.camera.position);
            console.log("Look =", this.controls.getLookAt());
            break;

        default :
            break;
    }
};

function addAxes(group, font) {
    //Create axes;
    //Set up common material
    var material = new THREE.MeshPhongMaterial({color: 0x7777ff});

    //Add graph axes
    var axisYHeight = 275;
    var axisXHeight = 350;
    var axisWidth = 2;
    var cylinderY = new THREE.CylinderGeometry(axisWidth/2, axisWidth/2, axisYHeight, 8, 8, false);
    var cylinderX = new THREE.CylinderGeometry(axisWidth/2, axisWidth/2, axisXHeight, 8, 8, false);

    var axisX = new THREE.Mesh(cylinderX, material);
    var axisY = new THREE.Mesh(cylinderY, material);

    //Orientate axes
    axisX.rotation.z = -Math.PI/2;
    axisX.position.set(axisXHeight/2, 0, 0);
    axisY.position.set(0, axisYHeight/2, 0);

    group.add(axisX);
    group.add(axisY);

    //Labelling
    var options = {
        size: 4,
        height: 1,
        font: font,
        bevelThickness: 0.2,
        bevelSize: 0.1,
        bevelEnabled: false
    };

    var textGeom = new THREE.TextGeometry("Surface", options);
    var axisText = new THREE.Mesh(textGeom, material);
    axisText.position.x = axisXHeight + 2;
    axisText.position.y = 0;
    axisText.position.z = 0;
    group.add(axisText);
    textGeom = new THREE.TextGeometry("Speed", options);
    axisText = new THREE.Mesh(textGeom, material);
    axisText.position.x = -10;
    axisText.position.y = axisYHeight + 2;
    axisText.position.z = 0;
    group.add(axisText);
}

function addGroundPlane(scene, width, height) {
    // create the ground plane
    var planeGeometry = new THREE.PlaneGeometry(width,height,1,1);
    var texture = THREE.ImageUtils.loadTexture("images/grid.png");
    var planeMaterial = new THREE.MeshLambertMaterial({map: texture, transparent: true, opacity: 0.5});
    var plane = new THREE.Mesh(planeGeometry,planeMaterial);
    var overlap = 10;

    // rotate and position the plane
    plane.rotation.x=-0.5*Math.PI;
    //plane.position.set(width/2 - overlap, 0, 0);

    scene.add(plane);

    //Second plane
    planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
    planeMaterial = new THREE.MeshLambertMaterial({color: 0x16283c});
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x=-0.5*Math.PI;
    //plane.position.set(width/2 - overlap, -1, 0);

    //Give it a name
    plane.name = 'ground';

    // add the plane to the scene
    scene.add(plane);
}

function addTimeSlider(group, width, height, depth) {
    //Create time slider box
    //DEBUG - DEPTH NEEDS REWORKING
    var boxDepth = 1, boxScaleZ = 5;
    var boxGeometry = new THREE.BoxGeometry(width, height, boxDepth, 4, 4, 4);
    var boxMaterial = new THREE.MeshPhongMaterial({color: 0x5f7c9d, transparent: true, opacity: 0.4, depthTest: false});
    var box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.scale.z = boxScaleZ;
    box.name = 'timeSlider';
    box.position.set(width/2, height/2, 0);

    group.add(box);
}

//Only executed our code once the DOM is ready.
var FRONT= 0, RIGHT= 1, LEFT= 2, TOP=3;
$(document).ready(function() {
    //Initialise app
    var container = document.getElementById("WebGL-output");
    var app = new VisApp();
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

    $("#presetSave").on("click", function(evt) {
        app.savePreset();
    });
    $("#presetForward").on("click", function(evt) {
        app.gotoNextPreset();
    });
    $("#presetBackward").on("click", function(evt) {
        app.gotoPreviousPreset();
    });

    $('#screen').on("click", function(event) {
        event.preventDefault();
        var can = app.renderer.domElement;
        if (can) {
            try {
                can.toBlob(function(blob) {
                    saveAs(blob, "screenShot.png");
                }, "image/png");
            } catch(e) {
                alert("Couldn't save screenshot");
            }
        }
    });

    $(document).keydown(function(event) {
        app.keydown(event);
    });

    app.run();
});
