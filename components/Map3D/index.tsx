'use client';

import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, useGLTF, Html, OrthographicCamera } from '@react-three/drei';
import CameraControlsBase from 'camera-controls';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import styles from './index.module.scss';

type CircleData = {
  position: THREE.Vector3;
  meshIndex: number;
  color: string;
};

type GLTFResult = {
  scene: THREE.Group;
};

export default function Map3D() {
  const { scene } = useGLTF('/svg_map.glb') as GLTFResult;
  const [circleData, setCircleData] = useState<CircleData[]>([]);
  const [cameraTarget, setCameraTarget] = useState(new THREE.Vector3());
  const isCameraAnimating = useRef(false);

  // Generate circle data based on scene
  useMemo(() => {
    const newCircleData: CircleData[] = [];
    let index = 0;
    scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        const color = new THREE.Color(Math.random(), Math.random(), Math.random());
        child.material = new THREE.MeshStandardMaterial({ color });

        const boundingBox = new THREE.Box3().setFromObject(child);
        const center = boundingBox.getCenter(new THREE.Vector3());

        newCircleData.push({
          position: center,
          meshIndex: index,
          color: `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`,
        });
        
        index++;
      }
    });
    setCircleData(newCircleData);
  }, [scene]);

  const hoverMaterial = useRef(new THREE.MeshStandardMaterial({ color: 'hotpink', flatShading: true }));
  const originalMaterials = useRef(new Map<THREE.Mesh, THREE.Material>());

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    const mesh = e.object as THREE.Mesh;
    if (!originalMaterials.current.has(mesh)) {
      originalMaterials.current.set(mesh, mesh.material as THREE.Material);
      mesh.material = hoverMaterial.current;
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    const mesh = e.object as THREE.Mesh;
    const originalMaterial = originalMaterials.current.get(mesh);
    if (originalMaterial) {
      mesh.material = originalMaterial;
      originalMaterials.current.delete(mesh);
    }
  };

  const moveCameraTo = (targetPosition: THREE.Vector3) => {
    isCameraAnimating.current = true;
    setCameraTarget(targetPosition);
  };

  return (
    <Canvas shadows>
      <IsometricCamera
        cameraTarget={cameraTarget}
        isCameraAnimating={isCameraAnimating}
      />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        castShadow
        shadow-camera-near={0.1}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <SomeObject />
      <group>
        {scene.children.map((child, index) =>
          child instanceof THREE.Mesh ? (
            <mesh
              key={index}
              geometry={child.geometry}
              material={child.material}
              position={child.position}
              rotation={child.rotation}
              scale={child.scale}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
              receiveShadow
            />
          ) : null
        )}
      </group>
      {circleData.map((circle, index) => (
        <Html
          key={`${circle.meshIndex}-${index}`}
          position={circle.position.toArray()}
          center
          zIndexRange={[1, 0]}
        >
          <div
            className={styles['map__circles-container']}
            style={{ '--background-color': circle.color } as CSSProperties}
          >
            <div
              className={styles.map__circle}
              onClick={() => moveCameraTo(circle.position)}
            />
          </div>
        </Html>
      ))}
    </Canvas>
  );
}

const SomeObject = () => {
  const objectRef = useRef<THREE.Mesh>(null);
  
  useFrame(({clock}) => {
    objectRef.current!.rotation.y = clock.getElapsedTime()
  });

  return (
    <mesh ref={objectRef} position={[0, 0.1, 0]} scale={0.2} castShadow>
      <boxGeometry />
      <meshStandardMaterial color={new THREE.Color(Math.random(), Math.random(), Math.random())} />
    </mesh>
  );
}

useGLTF.preload('/svg_map.glb');

const boundaryBox =  new THREE.Box3(
  new THREE.Vector3(-1, -1, -1),
  new THREE.Vector3(1, 1, 1)
);

const IsometricCamera = ({
  cameraTarget,
  isCameraAnimating,
}: {
  cameraTarget: THREE.Vector3;
  isCameraAnimating: React.MutableRefObject<boolean>;
}) => {
  const { size, set } = useThree();
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const controlsRef = useRef<CameraControls>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    const aspect = size.width / size.height;
    cameraRef.current.left = -1 * aspect;
    cameraRef.current.right = 1 * aspect;
    cameraRef.current.top = 1;
    cameraRef.current.bottom = -1;
    cameraRef.current.near = 0.1;
    cameraRef.current.far = 1000;
    cameraRef.current.position.set(-15, 15, 15);
    cameraRef.current.lookAt(0, 0, 0);
    cameraRef.current.updateProjectionMatrix();

    set({ camera: cameraRef.current });
  }, [size, set]);

  useEffect(() => {
    if (cameraTarget) setIsAnimating(true);
  }, [cameraTarget]);

  useFrame(() => {
    if (controlsRef.current && cameraRef.current && isAnimating) {
      const controls = controlsRef.current;
      const target = new THREE.Vector3();
      controls.getTarget(target);

      if (target.distanceTo(cameraTarget) < 0.01) {
        isCameraAnimating.current = false;
        setIsAnimating(false);
      }

      controls.setLookAt(
        cameraRef.current.position.x,
        cameraRef.current.position.y,
        cameraRef.current.position.z,
        cameraTarget.x,
        cameraTarget.y,
        cameraTarget.z,
        true
      );
    }

    if (controlsRef.current) {
      controlsRef.current.polarAngle = Math.PI / 4;
      controlsRef.current.azimuthAngle = - Math.PI / 4;
      controlsRef.current.setBoundary(boundaryBox);
    }
  });

  return (
    <>
      <OrthographicCamera ref={cameraRef} />
      <CameraControls
        ref={controlsRef}
        camera={cameraRef.current}
        rotation={false}
        polarAngle={Math.PI / 4}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 4}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
        azimuthAngle={Math.PI / 4}
        maxZoom={2.5}
        minZoom={0.75}
        dampingFactor={0.1}
        mouseButtons={{
          left: CameraControlsBase.ACTION.TRUCK,
          wheel: CameraControlsBase.ACTION.ZOOM,
          right: CameraControlsBase.ACTION.NONE
        }}
      />
    </>
  );
};
