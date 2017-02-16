/**
 * Created by DrTone on 19/01/2017.
 */
//Visual node representation

var VisNode = function() {
    var geomConfig = {
        nodeRadius: 5,
        nodeWidthSegments: 8,
        nodeHeightSegments: 8,
        defaultColour: 0x0000ff
    };
    this.nodeGeometry = new THREE.SphereBufferGeometry(geomConfig.nodeRadius, geomConfig.nodeWidthSegments, geomConfig.nodeHeightSegments);
    this.nodeMaterial = new THREE.MeshLambertMaterial( {color: geomConfig.defaultColour} );
    this.nodeMaterialTransparent = new THREE.MeshLambertMaterial( {color: geomConfig.defaultColour, transparent: true, opacity: 0.25} );
    this.nodeXPos = 0;
    this.yearOffset = 0;
    this.yearScale = 4;
    this.mapOffset = 0;
    this.speedScale = 3;
    this.labelPosition = new THREE.Vector3();
    this.geomPosition = new THREE.Vector3();
    this.alignment = 3;
    this.textColour =  new THREE.LineBasicMaterial( {color: 0xffff00} );
    this.labelScale = new THREE.Vector3(100, 50, 1);
};

VisNode.prototype = {
    init: function(info) {
        this.date = info.Date;
        this.year = info.Year;
        this.location = info.Location;
        this.driver = info.Driver;
        this.vehicle = info.Vehicle;
        this.speed = info.Speed;

        //Geometry for this node
        this.nodeGroup = new THREE.Object3D();

        return true;
    },

    setBounds: function(dataMin, areaMin, areaScale) {
        this.yearOffset = dataMin;
        this.mapOffset = areaMin;
        this.yearScale = areaScale;
    },

    createGeometry: function() {
        this.nodeMesh = new THREE.Mesh(this.nodeGeometry, this.nodeMaterial);
        this.nodeMesh.position.set(this.nodeXPos, this.speed/this.speedScale, ((this.year - this.yearOffset)*this.yearScale)-this.mapOffset);
        this.nodeGroup.add(this.nodeMesh);
        var label = this.createLabel();
        this.nodeGroup.add(label);
        this.label = label;
    },

    createLabel: function() {
        var limit = 20;
        this.labelPosition.copy(this.nodeMesh.position);
        this.labelPosition.y += this.alignment;
        return spriteManager.create(this.vehicle, limit, this.textColour, this.labelPosition, this.labelScale, 32, 1, true, true);
    },

    updateLabelWidth: function(scale) {
        this.label.scale.x = scale;
    },

    updateLabelHeight: function(scale) {
        this.label.scale.y = scale;
    },

    getNode: function() {
        return this.nodeGroup;
    },

    getYear: function() {
        return this.year;
    },

    getSpeed: function() {
        return this.speed;
    },

    setColour: function(colour) {
        this.nodeMaterial.color.setStyle(colour);
        this.nodeMaterial.needsUpdate = true;
    },

    setSpeedScale: function(scale) {
        this.speedScale = scale;
        this.nodeMesh.position.set(this.nodeXPos, this.speed/this.speedScale, ((this.year - this.yearOffset)*this.yearScale)-this.mapOffset);
        this.label.position.copy(this.nodeMesh.position);
        this.label.position.y += this.alignment;
    },

    setVisibility: function(groupStatus) {
        this.nodeGroup.visible = groupStatus;
    },

    setTransparency: function(transparency) {
        this.nodeMesh.material = transparency ? this.nodeMaterialTransparent : this.nodeMaterial;
        this.label.material.opacity = transparency ? 0.1 : 1.0;
        this.label.material.needsUpdate = true;
    }
};


