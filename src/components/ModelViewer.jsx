import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import SampleRobot from './SampleRobot.jsx';
export default function ModelViewer(props) {
  return <div className="canvas"><Canvas camera={{ position:[3.5,2.5,5], fov:42 }} dpr={[1,1.75]}>
    <color attach="background" args={['#111c2b']}/>
    <ambientLight intensity={1.3}/><directionalLight position={[4,6,5]} intensity={2}/>
    <SampleRobot color={props.color} metalness={props.metalness} roughness={props.roughness}/>
    <ContactShadows position={[0,-1.3,0]} scale={5} opacity={0.35} blur={2} far={3}/>
    <OrbitControls autoRotate={props.autoRotate} autoRotateSpeed={1.2} makeDefault minDistance={2.5} maxDistance={10}/>
  </Canvas></div>;
}
