import { useEffect, useState } from "react";

export function FarmMascot() {
  const [animate, setAnimate] = useState(false);
  
  return (
    <div className="relative w-36 h-36 mx-auto">
      {/* Simple SVG mascot - a friendly farm assistant character */}
        <source srcSet="/MH2.webp" type="image/webp" />
        <source srcSet="/MH2.png" type="image/png" />
        <img 
          src="/MH.png" 
          alt="Mascot" 
          loading="eager" 
          decoding="async"
          className="w-full h-full"
        />
    </div>
  );
}
