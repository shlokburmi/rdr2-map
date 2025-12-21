import { useEffect } from "react";

export function useGamepad(
  setPlayer: React.Dispatch<
    React.SetStateAction<[number, number] | null>
  >
) {
  useEffect(() => {
    const loop = () => {
      const gp = navigator.getGamepads()[0];
      if (!gp) return requestAnimationFrame(loop);

      setPlayer((p) =>
        p
          ? [
              p[0] + gp.axes[1] * -0.0003,
              p[1] + gp.axes[0] * 0.0003,
            ]
          : p
      );

      requestAnimationFrame(loop);
    };
    loop();
  }, []);
}
