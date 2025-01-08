'use client'

import dynamic from 'next/dynamic'
 
const Map3DComponent = dynamic(() => import('@/components/Map3D'), {
  ssr: false,
})

const Home: React.FC = () => {
  return (
    <div style={{ height: '100vh' }}>
      <Map3DComponent />
    </div>
  );
};

export default Home;