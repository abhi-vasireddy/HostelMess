import React from 'react';
import Lottie from 'lottie-react';

// ✅ 1. Import your LOCAL JSON files here
import successAnim from '../assets/animations/success.json';
import notFoundAnim from '../assets/animations/404.json'; // Make sure file name matches exactly!

// 👇 Placeholder for Loading (Use this until you have loading.json)
const loadingUrl = "https://lottie.host/embed/93315a66-21aa-4395-bf38-422457816040/z10222100.json";

type AnimationType = 'success' | 'loading' | '404';

interface Props {
  type: AnimationType;
  className?: string;
  loop?: boolean;
}

export const LottiePlayer: React.FC<Props> = ({ type, className, loop = true }) => {
  
  // 1. Handle "Loading" (Remote URL)
  // Since we don't have the JSON file yet, we use an iframe
  if (type === 'loading') {
     return (
        <div className={className}>
           <iframe 
             src={loadingUrl} 
             className="w-full h-full border-0 pointer-events-none" // pointer-events-none prevents clicking the iframe
             title="loading"
           />
        </div>
     );
  }

  // 2. Handle Local Animations (Success & 404)
  let animationData;

  switch (type) {
    case 'success':
      animationData = successAnim;
      break;
    case '404':
      animationData = notFoundAnim;
      break;
    default:
      return null;
  }

  return (
    <div className={className}>
      <Lottie 
        animationData={animationData} 
        loop={loop} 
        autoplay={true}
      />
    </div>
  );
};