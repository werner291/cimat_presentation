const points = {
    'hydraulics': {
        //anchors: [[2793,578]],
        anchors: [new THREE.Vector3(0,5,-3)],
        label: 'Hydraulisch systeem'
    },
    'wheel-motor': {
        //anchors: [[2450, 1250], [3316, 1468], [520,1824], [1444,2232]],
        anchors: [new THREE.Vector3(-2,1,-4),new THREE.Vector3(2,1,-4),new THREE.Vector3(-2,1,4),new THREE.Vector3(2,1,4)],
        label: 'Wielmotor'
    },
    /*
    'ce-cert': {
        anchors: [[1662,1235]],
        label: 'CE-Certificering'
    },
    'safety': {
        anchors: [[1588,1092],[642,852],[3248,676]],
        label: 'Veiligheid'
    }*/
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
    
    let mtlloader = new THREE.MTLLoader();

    mtlloader.load('model/cimat_test.mtl', (mtl) => {

        let objloader = new THREE.OBJLoader();
        mtl.preload();
        objloader.setMaterials(mtl);

        objloader.load('model/cimat_test.obj', (obj) => {
            scene.add( obj );
        })
        
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

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    svg.setAttribute('viewBox', '0 0 ' + canvas.width + ' ' + canvas.height )

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.update

    renderer.setViewport(0,0,canvas.width,canvas.height);

    const center_height = 2.0;
    const distance = 15.0;

    camera.position.x = distance * Math.cos(asimuth) * Math.cos(elevation);
    camera.position.y = distance * Math.sin(elevation) + center_height;
    camera.position.z = distance * Math.sin(asimuth) * Math.cos(elevation);

    camera.lookAt(0,center_height,0);

    renderer.render( scene, camera );

    for (const [key, value] of Object.entries(points)) {

        for (let i = 0; i < value.anchors.length; i++) {

            let position = value.anchors[i];
            let updater = value.positionUpdaters[i];

            let transformed = position.clone();
            transformed.project(camera);
            updater(((transformed.x + 1.0)/2.0) * canvas.width,
                        ((1 - transformed.y) / 2.0) * canvas.height);
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