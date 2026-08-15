import { useState, useEffect } from "react";

export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return isPortrait;
}