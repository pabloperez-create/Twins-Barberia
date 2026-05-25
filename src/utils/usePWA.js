import { useState, useEffect } from "react";

export function usePWA() {
  const [promptEvento, setPromptEvento] = useState(null);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalada
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalada(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPromptEvento(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalada(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const instalar = async () => {
    if (!promptEvento) return;
    promptEvento.prompt();
    const { outcome } = await promptEvento.userChoice;
    if (outcome === "accepted") setInstalada(true);
    setPromptEvento(null);
  };

  return { puedeInstalar: !!promptEvento && !instalada, instalada, instalar };
}
