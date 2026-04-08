import { useEffect, useRef, useState } from "react";
import { createLoveAudioController } from "../services/audio";

export function useAudio() {
  const controllerRef = useRef(createLoveAudioController());
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Nossa trilha esta pronta para tocar.");

  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller.stop();
    };
  }, []);

  async function toggle() {
    if (isPlaying) {
      controllerRef.current.stop();
      setIsPlaying(false);
      setStatus("A trilha foi pausada. O clima continua aqui.");
      return;
    }

    const result = await controllerRef.current.start();
    setIsPlaying(result.ok);
    setStatus(result.message);
  }

  return {
    isPlaying,
    status,
    toggle,
  };
}
