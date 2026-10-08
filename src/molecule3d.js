import * as THREE from 'three';

/**
 * Creates and mounts an interactive 3D molecular renderer inside a container.
 * @param {HTMLElement} container - The DOM element to attach the canvas to.
 * @param {Object} options - Configuration for scene type: 'hero' | 'ribbon' | 'surface' | 'pocket' | 'docking' | 'docking-zoomed' | 'final'
 * @returns {Object} Controller with destroy() and setMode() methods.
 */
export function createMolecularViewer(container, options = {}) {
  const {
    mode = 'ribbon', // 'hero' | 'ribbon' | 'surface' | 'pocket' | 'docking' | 'docking-zoomed' | 'final'
    autoRotate = true,
    interactive = true
  } = options;

  if (!container) return null;

  // Clear container
  container.innerHTML = '';
  const width = container.clientWidth || 400;
  const height = container.clientHeight || 340;

  // Scene, Camera, Renderer
  const scene = new THREE.Scene();
  
  // Camera
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 0, mode === 'docking-zoomed' ? 18 : 34);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight1.position.set(20, 30, 25);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.0);
  dirLight2.position.set(-25, -15, -20);
  scene.add(dirLight2);

  const pointLight = new THREE.PointLight(0xa855f7, 1.2, 50);
  pointLight.position.set(0, 5, 10);
  scene.add(pointLight);

  // Group to hold all molecular objects for unified rotation
  const molGroup = new THREE.Group();
  scene.add(molGroup);

  // Helper: create smooth ribbon backbone
  function buildProteinRibbon() {
    const group = new THREE.Group();
    const points = [];
    const numResidues = 90;
    
    // Generate folded globule backbone path with alpha helices & loops
    for (let i = 0; i < numResidues; i++) {
      const t = (i / numResidues) * Math.PI * 5;
      const r = 9 + Math.sin(t * 1.5) * 3;
      const x = Math.sin(t) * r + Math.sin(i * 0.4) * 2;
      const y = Math.cos(t * 0.7) * (r * 0.9) + Math.cos(i * 0.5) * 2;
      const z = Math.sin(t * 1.8) * 8 + Math.cos(i * 0.6) * 3;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    const divisions = 450;
    const curvePoints = curve.getPoints(divisions);

    // Color gradient across sequence (Rainbow: Blue -> Cyan -> Green -> Yellow -> Red)
    const colors = [];
    const color = new THREE.Color();
    for (let i = 0; i <= divisions; i++) {
      const frac = i / divisions;
      // Hue from 0.65 (blue) down to 0.0 (red)
      const hue = (1.0 - frac) * 0.65;
      color.setHSL(hue, 0.95, 0.52);
      colors.push(color.r, color.g, color.b);
    }

    // Extrude ribbon tube
    const tubeGeometry = new THREE.TubeGeometry(curve, divisions, 0.55, 12, true);
    
    // Vertex colors
    const pos = tubeGeometry.attributes.position;
    const vertexColors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const ringIndex = Math.floor((i / pos.count) * divisions);
      const frac = Math.min(1, Math.max(0, ringIndex / divisions));
      color.setHSL((1.0 - frac) * 0.65, 0.95, 0.52);
      vertexColors[i * 3] = color.r;
      vertexColors[i * 3 + 1] = color.g;
      vertexColors[i * 3 + 2] = color.b;
    }
    tubeGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

    const ribbonMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.15
    });

    const ribbonMesh = new THREE.Mesh(tubeGeometry, ribbonMaterial);
    group.add(ribbonMesh);

    // Add secondary structure decorative coils/helices
    for (let h = 0; h < 4; h++) {
      const hPoints = [];
      const center = curvePoints[Math.floor(divisions * (0.2 + h * 0.22))];
      const helixRadius = 1.6;
      for (let k = 0; k < 30; k++) {
        const angle = k * 0.7;
        const hx = center.x + Math.cos(angle) * helixRadius;
        const hy = center.y + (k - 15) * 0.3;
        const hz = center.z + Math.sin(angle) * helixRadius;
        hPoints.push(new THREE.Vector3(hx, hy, hz));
      }
      const hCurve = new THREE.CatmullRomCurve3(hPoints);
      const hGeom = new THREE.TubeGeometry(hCurve, 30, 0.35, 8, false);
      const hMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.65 - h * 0.16, 0.9, 0.55),
        roughness: 0.3
      });
      group.add(new THREE.Mesh(hGeom, hMat));
    }

    return group;
  }

  // Helper: create molecular surface / solvent accessible cluster
  function buildMolecularSurface(highlightPocket = false, isPocketMode = false) {
    const group = new THREE.Group();
    const sphereGeom = new THREE.SphereGeometry(1, 16, 16);
    
    // Generate cluster of atomic spheres that form the protein globule
    const numSpheres = 180;
    const pocketCenter = new THREE.Vector3(1.5, 0.5, 4.0);

    for (let i = 0; i < numSpheres; i++) {
      const phi = Math.acos(-1 + (2 * i) / numSpheres);
      const theta = Math.sqrt(numSpheres * Math.PI) * phi;
      const radius = 9 + Math.sin(i * 1.2) * 2.5;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta) * 0.85;
      const z = radius * Math.cos(phi) * 0.85;
      const pos = new THREE.Vector3(x, y, z);

      // Distance to pocket
      const distToPocket = pos.distanceTo(pocketCenter);

      // Carve out a pocket cleft near pocketCenter
      if (distToPocket < 3.2) {
        continue; // hollow out binding pocket
      }

      const sphereSize = 1.3 + Math.sin(i * 0.5) * 0.35;
      let sphereColor;

      if (isPocketMode) {
        // High probability (red) -> Medium (orange) -> Low (grey/white)
        if (distToPocket < 5.2) {
          sphereColor = new THREE.Color(0xef4444); // Red high probability
        } else if (distToPocket < 7.8) {
          sphereColor = new THREE.Color(0xf59e0b); // Orange medium
        } else {
          sphereColor = new THREE.Color(0xd1d5db); // Gray/white low
        }
      } else if (highlightPocket) {
        // Blue/purple surface with colorful pocket
        if (distToPocket < 5.8) {
          sphereColor = new THREE.Color().setHSL(0.8 - (distToPocket / 5.8) * 0.3, 0.9, 0.55);
        } else {
          const depthColor = 0.55 + Math.sin(i * 0.1) * 0.08;
          sphereColor = new THREE.Color().setHSL(0.58, 0.85, depthColor);
        }
      } else {
        // Standard sleek azure/cyan protein surface
        const depth = 0.45 + (z / 20) * 0.2;
        sphereColor = new THREE.Color().setHSL(0.58, 0.75, Math.max(0.3, Math.min(0.7, depth)));
      }

      const mat = new THREE.MeshStandardMaterial({
        color: sphereColor,
        roughness: 0.35,
        metalness: 0.1
      });

      const mesh = new THREE.Mesh(sphereGeom, mat);
      mesh.position.copy(pos);
      mesh.scale.set(sphereSize, sphereSize, sphereSize);
      group.add(mesh);
    }

    return group;
  }

  // Helper: create docked ligand molecule (ball-and-stick)
  function buildDockedLigand(isZoomed = false) {
    const group = new THREE.Group();
    const pocketCenter = isZoomed ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(1.5, 0.5, 4.0);

    // Ligand atoms and bonds (coumarin / aromatic derivative)
    const atomOffsets = [
      { pos: [0, 0, 0], el: 'C' },
      { pos: [1.3, 0.5, 0.2], el: 'C' },
      { pos: [2.2, -0.4, -0.2], el: 'C' },
      { pos: [1.8, -1.7, -0.6], el: 'O' },
      { pos: [0.5, -2.1, -0.7], el: 'C' },
      { pos: [-0.4, -1.2, -0.4], el: 'C' },
      { pos: [-1.7, -1.6, -0.5], el: 'C' },
      { pos: [-2.6, -0.7, -0.2], el: 'C' },
      { pos: [-2.2, 0.6, 0.2], el: 'C' },
      { pos: [-0.9, 1.0, 0.3], el: 'C' },
      // Sidechain substituents
      { pos: [3.5, 0.1, -0.1], el: 'C' },
      { pos: [4.4, -0.8, -0.5], el: 'O' },
      { pos: [3.8, 1.3, 0.5], el: 'OH' },
      { pos: [-3.8, -1.1, -0.3], el: 'Cl' }
    ];

    const bonds = [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
      [5, 6], [6, 7], [7, 8], [8, 9], [9, 0],
      [2, 10], [10, 11], [10, 12], [7, 13]
    ];

    const atomColors = {
      C: 0x84cc16,   // Fluorescent lime/green
      O: 0xef4444,   // Red
      OH: 0xf87171,  // Coral
      N: 0x3b82f6,   // Blue
      Cl: 0x10b981   // Green
    };

    const atomPositions = [];

    // Scale for zoomed mode
    const scale = isZoomed ? 2.2 : 1.1;

    atomOffsets.forEach(({ pos, el }) => {
      const aPos = new THREE.Vector3(
        pocketCenter.x + pos[0] * scale,
        pocketCenter.y + pos[1] * scale,
        pocketCenter.z + pos[2] * scale
      );
      atomPositions.push(aPos);

      const radius = (el === 'Cl' ? 0.65 : el === 'O' || el === 'OH' ? 0.55 : 0.5) * (isZoomed ? 1.3 : 1.0);
      const geom = new THREE.SphereGeometry(radius, 20, 20);
      const mat = new THREE.MeshStandardMaterial({
        color: atomColors[el] || 0xeab308,
        emissive: atomColors[el] || 0xeab308,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.15
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(aPos);
      group.add(mesh);
    });

    // Bonds (cylinders)
    bonds.forEach(([i, j]) => {
      const p1 = atomPositions[i];
      const p2 = atomPositions[j];
      const dist = p1.distanceTo(p2);
      const cylGeom = new THREE.CylinderGeometry(0.16 * (isZoomed ? 1.5 : 1), 0.16 * (isZoomed ? 1.5 : 1), dist, 8);
      const cylMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        roughness: 0.3
      });
      const bondMesh = new THREE.Mesh(cylGeom, cylMat);
      
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      bondMesh.position.copy(mid);
      bondMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3().subVectors(p2, p1).normalize()
      );
      group.add(bondMesh);
    });

    // If zoomed pose mode, add interacting amino acid residue sticks & labels!
    if (isZoomed) {
      const residues = [
        { name: 'TYR102', pos: new THREE.Vector3(6.5, 4.2, -1.0), bondTo: 12, label: 'TYR102' },
        { name: 'PHE103', pos: new THREE.Vector3(7.2, 0.5, -2.5), bondTo: 11, label: 'PHE103' },
        { name: 'LEU106', pos: new THREE.Vector3(6.8, -3.2, -1.5), bondTo: 2, label: 'LEU106' },
        { name: 'VAL109', pos: new THREE.Vector3(4.5, -6.5, 0.5), bondTo: 4, label: 'VAL109' }
      ];

      residues.forEach(res => {
        // Residue anchor sphere
        const resGeom = new THREE.SphereGeometry(0.65, 16, 16);
        const resMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
        const resMesh = new THREE.Mesh(resGeom, resMat);
        resMesh.position.copy(res.pos);
        group.add(resMesh);

        // Dashed interaction bond line
        const targetPos = atomPositions[res.bondTo];
        const lineGeom = new THREE.BufferGeometry().setFromPoints([res.pos, targetPos]);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xf43f5e,
          dashSize: 0.4,
          gapSize: 0.25,
          linewidth: 2
        });
        const line = new THREE.Line(lineGeom, lineMat);
        line.computeLineDistances();
        group.add(line);
      });
    }

    return group;
  }

  // Populate according to mode
  function buildScene(targetMode) {
    while (molGroup.children.length > 0) {
      molGroup.remove(molGroup.children[0]);
    }

    if (targetMode === 'hero') {
      // Hero: Full protein surface in glowing quantum cyan/violet + docked fluorescent ligand
      const surface = buildMolecularSurface(true, false);
      const ligand = buildDockedLigand(false);
      molGroup.add(surface);
      molGroup.add(ligand);
      camera.position.set(0, 0, 32);
    } else if (targetMode === 'ribbon') {
      // Ribbon only (Rainbow color)
      const ribbon = buildProteinRibbon();
      molGroup.add(ribbon);
      camera.position.set(0, 0, 32);
    } else if (targetMode === 'surface') {
      // Pure protein surface
      const surface = buildMolecularSurface(false, false);
      molGroup.add(surface);
      camera.position.set(0, 0, 34);
    } else if (targetMode === 'cartoon') {
      // Cartoon representation: prominent secondary structure helices and beta-sheets
      const ribbon = buildProteinRibbon();
      ribbon.scale.set(1.25, 1.25, 1.25);
      molGroup.add(ribbon);
      camera.position.set(0, 0, 32);
    } else if (targetMode === 'pocket') {
      // Binding-site pocket highlighted (Red / Orange / Gray)
      const surface = buildMolecularSurface(false, true);
      molGroup.add(surface);
      camera.position.set(0, 0, 34);
    } else if (targetMode === 'docking') {
      // Surface + docked ligand
      const surface = buildMolecularSurface(true, false);
      const ligand = buildDockedLigand(false);
      molGroup.add(surface);
      molGroup.add(ligand);
      camera.position.set(0, 0, 32);
    } else if (targetMode === 'docking-zoomed') {
      // Close up of pocket and ligand with residue sticks
      const bgPocket = buildMolecularSurface(true, false);
      bgPocket.position.set(-2, 0, -6);
      molGroup.add(bgPocket);

      const ligandZoomed = buildDockedLigand(true);
      molGroup.add(ligandZoomed);
      camera.position.set(0, 0, 19);
    } else if (targetMode === 'final') {
      // High-resolution docked complex
      const surface = buildMolecularSurface(true, false);
      const ligand = buildDockedLigand(false);
      molGroup.add(surface);
      molGroup.add(ligand);
      camera.position.set(0, 0, 31);
    }
  }

  buildScene(mode);

  // Mouse / Touch Interaction Controls
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let currentRotation = { x: 0.1, y: 0.2 };

  if (interactive) {
    const onPointerDown = (e) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      molGroup.rotation.y += deltaX * 0.008;
      molGroup.rotation.x += deltaY * 0.008;

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.02;
      camera.position.z = Math.max(10, Math.min(60, camera.position.z + zoomFactor));
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
  }

  // Animation Loop
  let animationFrameId;
  let clock = new THREE.Clock();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (autoRotate && !isDragging) {
      molGroup.rotation.y += delta * 0.35;
      molGroup.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.12;
    }

    renderer.render(scene, camera);
  }

  animate();

  // Resize Handler
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w && h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  });
  resizeObserver.observe(container);

  return {
    destroy() {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
    setMode(newMode) {
      buildScene(newMode);
    },
    resetView() {
      molGroup.rotation.set(0, 0, 0);
      camera.position.set(0, 0, mode === 'docking-zoomed' ? 18 : 34);
    }
  };
}
