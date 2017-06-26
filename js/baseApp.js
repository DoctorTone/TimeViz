/**
 * Created by atg on 14/05/2014.
 */
//Common baseline for visualisation app

function BaseApp() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.container = null;
    this.rayCaster = new THREE.Raycaster();
    this.objectList = [];
    this.root = null;
    this.mouse = new THREE.Vector2();
    this.mouseRaw = new THREE.Vector2();
    this.mouseDown = false;
    this.pickedObjects = [];
    this.startTime = 0;
    this.elapsedTime = 0;
    this.clock = new THREE.Clock();
}

BaseApp.prototype.init = function(container) {
    this.container = container;
    console.log("BaseApp container =", container);
    this.createRenderer();
    console.log("BaseApp renderer =", this.renderer);
    this.createCamera();
    this.createControls();

    var _this = this;
    this.container.addEventListener('mousedown', function(event) {
        _this.mouseClicked(event);
    }, false);
    window.addEventListener('resize', function(event) {
        _this.windowResize(event);
    }, false);
};

BaseApp.prototype.createRenderer = function() {
    this.renderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true, antialias: true});
    this.renderer.setClearColor(0x5c5f64, 1.0);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild( this.renderer.domElement );
};

BaseApp.prototype.mouseClicked = function(event) {
    //Update mouse state
    this.mouseRaw.x = event.clientX;
    this.mouseRaw.y = event.clientY;

    this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    this.mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
    this.mouseDown = true;

    this.rayCaster.setFromCamera( this.mouse, this.camera );

    this.pickedObjects.length = 0;
    this.pickedObjects = this.rayCaster.intersectObjects(this.scene.children, true);
};

BaseApp.prototype.windowResize = function(event) {
    //Handle window resize
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( window.innerWidth , window.innerHeight );
    //console.log('Size =', )
};

BaseApp.prototype.createScene = function() {
    this.scene = new THREE.Scene();

    var ambientLight = new THREE.AmbientLight(0x383838);
    this.scene.add(ambientLight);

    var pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(400,400,400);
    pointLight.name = 'PointLight';
    this.scene.add(pointLight);
};

BaseApp.prototype.createCamera = function() {
    const CAM_X = 750, CAM_Y = 350, CAM_Z = 875;
    const NEAR_PLANE = 0.1, FAR_PLANE = 10000;
    this.defaultCamPos = new THREE.Vector3(CAM_X, CAM_Y, CAM_Z);
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, NEAR_PLANE, FAR_PLANE );
    this.camera.position.copy(this.defaultCamPos);
};

BaseApp.prototype.createControls = function() {
    this.controls = new THREE.TrackballControls(this.camera, this.container);
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 1.0;

    this.controls.noZoom = false;
    this.controls.noPan = false;

    this.controls.staticMoving = true;
    this.controls.dynamicDampingFactor = 0.3;

    this.controls.keys = [ 65, 83, 68 ];

    const LOOK_X = -85, LOOK_Y = 275, LOOK_Z = 120;
    let lookAt = new THREE.Vector3(LOOK_X, LOOK_Y, LOOK_Z);
    this.controls.setLookAt(lookAt);
};

BaseApp.prototype.update = function() {
    //Do any updates
    this.controls.update();
    this.mouse.clicked = false;
};

BaseApp.prototype.run = function() {
    this.renderer.render( this.scene, this.camera );
    var _this = this;
    this.update();
    requestAnimationFrame(function() { _this.run(); });
};