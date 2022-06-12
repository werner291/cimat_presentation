const points = {
    'wheel-motor': {
        anchors: ['Motor1','Motor2','Motor3','Motor4'],
        label: 'Elektromotoren'
    },
    'steering': {
        anchors: ['Steer1','Steer2','Steer3','Steer4'],
        label: '360° sturing'
    },
    'adjust': {
        anchors: ['Adjust1','Adjust2','Adjust3','Adjust4'],
        label: 'Instelbare breedte'
    },
    'ce-cert': {
        anchors: ['CELogoFake'],
        label: 'CE Keuring (TODO)'
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
        anchors: ['3point','Attach1','Attach2'],
        label: 'Driepuntshef'
    },
    'shape': {
        anchors: ['Void'],
        label: 'Vormgeving'
    },
    'rtk-gnss': {
        anchors: ['RTK-GNSS-1','RTK-GNSS-2'],
        label: 'RTK-GNSS (TODO!)'
    },
};

let svg = document.getElementById('interactive-svg');

for (const [key, value] of Object.entries(points)) {

    var a = document.createElementNS("http://www.w3.org/2000/svg", 'a');
    a.setAttribute('href', '#' + key);

    value.positionUpdaters = [];

    for (const anchor of value.anchors) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        circle.setAttribute('class', 'node-hover');
        circle.setAttribute('r', 6);

        a.appendChild(circle);

        const text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        text.textContent = value.label;
        text.setAttribute('text-anchor', 'middle');
        svg.appendChild(text);

        value.positionUpdaters.push((x,y) => {
            circle.setAttribute('cx', x);
            circle.setAttribute('cy',y);
            text.setAttribute('x', x);
            text.setAttribute('y', y + 25);
        });
    }

    svg.appendChild(a);
    
}

let canvas = document.getElementById('CIMAT-view');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, canvas.width / canvas.height, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({canvas:canvas});
renderer.setClearColor(0xe8fffd,1.0);

{
    const loader = new THREE.GLTFLoader();

    loader.load(
        // resource URL
        'cimat_2.glb',
        function ( gltf ) {

            scene.add( gltf.scene );

            console.log(gltf);

            for (key of Object.keys(points)) {
                points[key].anchor_positions = points[key].anchors.map(anchor => {
                    let pos = gltf.scene.children.find(child => child.name==anchor).position;
                    if (pos) {
                        console.log('Child anchor: ', key,  pos);
                        return new THREE.Vector3(pos.x, pos.y, pos.z);
                    } else {
                        console.log('Missing anchor.');
                        return new THREE.Vector3(0.0,0.0,0.0);
                    }
                });
                
            }
        });
}

{
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5 );
    scene.add(ambientLight);
}

{
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight.position.x = 8.0;
    directionalLight.position.y = 5.0;
    directionalLight.position.z = 10.0;

    scene.add( directionalLight );
}

let asimuth = Math.PI/4.0;
let elevation = Math.PI/4.0;

let dragging = false;

svg.addEventListener('mousedown', () => {
    dragging = true
});

document.addEventListener('mousemove', (evt) => {
    if (dragging) {
        asimuth += evt.movementX / 100.0;
        
        asimuth = 2 * Math.PI * ((asimuth)/(2 * Math.PI)-Math.floor((asimuth)/(2 * Math.PI)));

        elevation = Math.max(Math.min(elevation + evt.movementY / 100.0, Math.PI / 3.0), Math.PI / 16.0);
    }
});

document.addEventListener('mouseup', (evt) => {
    dragging = false;
});

function animate() {
    requestAnimationFrame( animate );

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    svg.setAttribute('viewBox', '0 0 ' + canvas.width + ' ' + canvas.height )

    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();

    renderer.setViewport(0,0,canvas.width,canvas.height);

    const center_height = 1.0;
    const distance = 3.0;

    camera.position.x = distance * Math.cos(asimuth) * Math.cos(elevation);
    camera.position.y = distance * Math.sin(elevation) + center_height;
    camera.position.z = distance * Math.sin(asimuth) * Math.cos(elevation);

    camera.lookAt(0,center_height,0);

    renderer.render( scene, camera );

    for (const [key, value] of Object.entries(points)) {

        if (value.anchor_positions) {

            for (let i = 0; i < value.anchor_positions.length; i++) {

                let position = value.anchor_positions[i];
                let updater = value.positionUpdaters[i];

                let transformed = position.clone();
                transformed.project(camera);
                updater(((transformed.x + 1.0)/2.0) * canvas.width, ((1 - transformed.y) / 2.0) * canvas.height);
            }
        }
    }
}

requestAnimationFrame(animate);

var hovered = false;

for (node of document.getElementsByClassName('node-hover')) {

    node.classList.add('blink_me');

    node.onmouseover = () => {
        
        if (!hovered) {
            for (node2 of document.getElementsByClassName('node-hover')) {
                node2.classList.remove('blink_me');
            }
        }
        
        hovered = true;

    };
}