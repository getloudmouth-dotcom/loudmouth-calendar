import { C } from "../theme";

export default function Skeleton({ width, height, radius = 6, style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        background: C.surface2,
        borderRadius: radius,
        animation: "skeleton-pulse 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}
