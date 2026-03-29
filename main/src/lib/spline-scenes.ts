export const ORB_SCENE_URL =
  "https://prod.spline.design/UlTAXQVdYQJtV66t/scene.splinecode";

export const JOIN_KEYBOARD_SCENE_URL =
  "https://prod.spline.design/3WH-0gGBL8jEqmW0/scene.splinecode";

const sceneWarmCache = new Map<string, Promise<void>>();

export function preloadSplineScene(sceneUrl: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const cached = sceneWarmCache.get(sceneUrl);
  if (cached) {
    return cached;
  }

  const preloadPromise = fetch(sceneUrl, {
    cache: "force-cache",
    credentials: "omit",
    mode: "cors",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to warm Spline scene: ${response.status}`);
      }

      return response.arrayBuffer();
    })
    .then(() => undefined)
    .catch((error) => {
      sceneWarmCache.delete(sceneUrl);
      throw error;
    });

  sceneWarmCache.set(sceneUrl, preloadPromise);
  return preloadPromise;
}

export function warmSplineScenes(sceneUrls: string[]) {
  const uniqueUrls = Array.from(new Set(sceneUrls));
  for (const sceneUrl of uniqueUrls) {
    void preloadSplineScene(sceneUrl).catch(() => {});
  }
}
