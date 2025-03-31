self.addEventListener("install", (event) => {
    console.log("✅ Service Worker instalado");
  });
  
  self.addEventListener("fetch", (event) => {
    // Aquí podrías hacer caché en el futuro si querés soporte offline
  });
  