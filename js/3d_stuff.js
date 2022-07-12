
/*
 * Define a list of anchor points within the 3D view that the user may click on.
 *
 * The anchor points are defined as a dictionary of objects, where the key
 * is the ID of the HTML object to be linked to, and the falue is an object
 * with the following properties:
 *
 *  - anchors: A list of object names in the GLTF model where the anchor will be attached.
 *  - label: A user-friendly name for the anchor.
 */
const points = {
    'wheel-motor': {
        anchors: ['Motor1'],//,'Motor2','Motor3','Motor4'],
        label: 'Elektromotoren'
    },
    'swing-axle': {
        anchors: ['SwingingAxis'],//,'SwingingAxis2'],
        label: 'Ophanging'
    },
    'steering': {
        anchors: ['Steer1'],//,'Steer2','Steer3','Steer4'],
        label: '360° sturing'
    },
    'adjust': {
        anchors: ['Adjust1'],//,'Adjust2','Adjust3','Adjust4'],
        label: 'Aanpasbare werkbreedte'
    },
    'ce-cert': {
        anchors: ['CELogoFake'],
        label: 'Wetgeving'
    },
    'batteries': {
        anchors: ['Batbox'],
        label: 'Batterijen'
    },
    'hydraulics': {
        anchors: ['Hydraulics'],
        label: 'Hydrauliek'
    },
    'threepoint': {
        anchors: ['3point','Attach1'],//,'Attach2'],
        label: 'Driepuntshef'
    },
    'shape': {
        anchors: ['Void'],
        label: 'Vormgeving robotconstructie'
    },
    'rtk-gnss': {
        anchors: ['RTK-GNSS-1'],//,'RTK-GNSS-2'],
        label: 'RTK-GNSS'
    },
};

// Get a reference to the SVG element that is layered over the 3D view.
let svg = document.getElementById('interactive-svg');

// Loop over the anchor points and create SVG elements for each.
for (const [key, value] of Object.entries(points)) {

    // Parent element is a link, such that the entire anchor point is clickable.
    var a = document.createElementNS("http://www.w3.org/2000/svg", 'a');

    // Will link to the HTML element where the ID matches the key of the anchor.
    a.setAttribute('href', '#' + key);

    // Insert a property with callbacks to update the position of the anchor point
    // on the SVG when the user moves the 3D view around.
    value.positionUpdaters = [];

    // Every anchor point has multiple points on the model.
    for (const anchor of value.anchors) {

        // Create a circle for the user to click on. X and Y position will be set via the callback.
        const circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        circle.setAttribute('class', 'node-hover');
        circle.setAttribute('r', 6);

        // Add the circle to the link.
        a.appendChild(circle);

        // Create a text element with the user-readable label.
        const text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        text.textContent = value.label;
        text.setAttribute('text-anchor', 'middle');

        // Add the text to the link.
        a.appendChild(text);

        // Create the callback that will move the text and the circle around as the user moves the 3D view.
        value.positionUpdaters.push((x,y,visible) => {
            circle.setAttribute('cx', x);
            circle.setAttribute('cy',y);
            text.setAttribute('x', x);
            text.setAttribute('y', y + 25);

            circle.setAttribute('visibility', visible ? 'visible' : 'hidden');
            text.setAttribute('visibility', visible ? 'visible' : 'hidden');
        });
    }

    // Add the link to the SVG.
    svg.appendChild(a);
    
}

// Grab a reference to the 3D view.
let canvas = document.getElementById('CIMAT-view');

// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, canvas.width / canvas.height, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer({canvas:canvas});
renderer.setClearColor(0xe8fffd,1.0);

// The GLTF scene.
{
    const loader = new THREE.GLTFLoader();

    loader.load(
        // resource URL
        'cimat_2.glb',
        function ( gltf ) {

            // Add the GLTF scene to the global scene.
            scene.add( gltf.scene );

            // Look up the anchor positions defined earlier.
            for (key of Object.keys(points)) {

                // Look up each object reverenced as anchor objects to be attached to
                points[key].anchor_positions = points[key].anchors.map(anchor => {

                    // Find the object in the GLTF scene by name. Top-level objects only.
                    let pos = gltf.scene.children.find(child => child.name==anchor).position;

                    if (pos) {
                        return new THREE.Vector3(pos.x, pos.y, pos.z);
                    } else {
                        // There is a mismatch between top-level objects in the GLTF and the anchor points.
                        console.error('Missing anchor.');
                        return new THREE.Vector3(0.0,0.0,0.0);
                    }
                });
                
            }
        });
}

// Set up a soft, gray ambient light.
{
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5 );
    scene.add(ambientLight);
}

// Set up a soft gray directional light, simulating the sun.
{
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight.position.x = 8.0;
    directionalLight.position.y = 5.0;
    directionalLight.position.z = 10.0;

    scene.add( directionalLight );
}

// Arc-ball camera setup.
// Azimuth: the angle the camera has been spun around the vertical axis.
let asimuth = Math.PI/4.0;
// Elevation: the angular up-and-down movement of the camera, remaining at the same distance from the origin.
let elevation = Math.PI/4.0;

// Keep track of whether the mouse button is down or not.
let dragging = false;
let pointer_prevX = 0;
let pointer_prevY = 0;

// When the pointer button goes down, keep an eye on whether the user moves the pointer.
// Listener is attached to the SVG since it covers the canvas.
svg.addEventListener('pointerdown', (evt) => {
    dragging = true;

    // Get the current mouse position.
    pointer_prevX = evt.screenX;
    pointer_prevY = evt.screenY;
});

// Same, but for pointer-up.
// Note: this listener is document-wide, in case the user drags the pointer out of the 3D view.
document.addEventListener('pointerup', (evt) => {
    dragging = false;
});

// When the pointer is moved and the user us dragging, adjust the camera.
document.addEventListener('pointermove', (evt) => {
    if (dragging) {

        // For some reason, evt.movementX and evt.movementY are not available on iOS.
        // So, we compute them ourselves.
        let movementX = evt.screenX - pointer_prevX;
        let movementY = evt.screenY - pointer_prevY;

        // Record the new position so we can get the delta next frame.
        pointer_prevX = evt.screenX;
        pointer_prevY = evt.screenY;

        // Horizontal movement: rotate the camera around the vertical axis.
        asimuth += movementX / 100.0;
        
        // Wrap the angle around to keep it in the range [0,2pi).
        asimuth = 2 * Math.PI * ((asimuth)/(2 * Math.PI)-Math.floor((asimuth)/(2 * Math.PI)));

        // Vertical movement: rotate the camera up and down.
        // Clamp the angle in the range [pi/16,pi/3].
        elevation = Math.max(Math.min(elevation + movementY / 100.0, Math.PI / 3.0), Math.PI / 16.0);

    }
});


// Run the 3D animation.
function animate() {
    // Request the next frame already, to keep a consistent rare.
    requestAnimationFrame( animate );

    // Keep the canvas size in line with how it is resized.
    // Not sure why offsetWidth and offsetHeight are the properties to look at here... but these are the ones that work.
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Update the SVG overlay size to keep in line with the canvas.
    svg.setAttribute('viewBox', '0 0 ' + canvas.width + ' ' + canvas.height )

    // Update the camera projection matrix in case the aspect ratio changes.
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();

    // Update the viewport to the new canvas size.
    renderer.setViewport(0,0,canvas.width,canvas.height);

    // Set the desired view focus point, and distance from origin for the arc-ball camera.
    const center_height = 1.0;
    const distance = 3.0;

    // Update the camera position based on the view focus, distance, asimuth and elevation.
    camera.position.x = distance * Math.cos(asimuth) * Math.cos(elevation);
    camera.position.y = distance * Math.sin(elevation) + center_height;
    camera.position.z = distance * Math.sin(asimuth) * Math.cos(elevation);

    // Rotate the camera to look at the robot.
    camera.lookAt(0,center_height,0);

    // Render the scene.
    renderer.render( scene, camera );

    let already_placed = [];

    // Update the position of each anchor point.
    for (const [key, value] of Object.entries(points)) {

        // There is simetimes a 1-frame delay before the anchor positions are available.
        // This is not noticeable to the user, so just skip those frames.
        if (value.anchor_positions) {

            for (let i = 0; i < value.anchor_positions.length; i++) {

                // Clone the position such that it can be modified without affecting the original.
                let transformed = value.anchor_positions[i].clone();

                // Transform the position into the camera's coordinate system.
                transformed.project(camera);

                value.positionUpdaters[i](
                    ((transformed.x + 1.0)/2.0) * canvas.width,
                    ((1 - transformed.y) / 2.0) * canvas.height,
                    true
                );
            }

        }
    }
}

// Start the animation by scheduling the first callback.
requestAnimationFrame(animate);

// Add a blinking animation to the circles in the SVG overlay to prompt the user to interact with them.
var hovered = false;

for (node of document.getElementsByClassName('node-hover')) {

    node.classList.add('blink_me');

    // The animation is removed as soon as the user hovers over the circle,
    // since the animation is kind of annoying, and will have served its' purpose
    // in hinting that the user can interact with the scene.
    node.onmouseover = () => {
        
        if (!hovered) {
            for (node2 of document.getElementsByClassName('node-hover')) {
                node2.classList.remove('blink_me');
            }
        }
        
        hovered = true;

    };
}