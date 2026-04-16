declare module "vanta/dist/vanta.net.min" {
  type VantaConfig = {
    el: HTMLElement;
    THREE: unknown;
    color?: number;
    backgroundColor?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
  };

  type VantaEffect = {
    destroy: () => void;
  };

  const init: (config: VantaConfig) => VantaEffect;
  export default init;
}
