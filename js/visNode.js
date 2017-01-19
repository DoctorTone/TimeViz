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
    this.nodeMaterial = new THREE.MeshLambertMaterial( {color: geomConfig.defaultColour});
    this.nodeXPos = 0;
    this.yearOffset = 2000;
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

    createGeometry: function() {
        var nodeMesh = new THREE.Mesh(this.nodeGeometry, this.nodeMaterial);
        nodeMesh.position.set(this.nodeXPos, this.speed, this.year - this.yearOffset);
        this.nodeGroup.add(nodeMesh);
    },

    getNode: function() {
        return this.nodeGroup;
    },

    getYear: function() {
        return this.year;
    },

    getSpeed: function() {
        return this.speed;
    }
};


