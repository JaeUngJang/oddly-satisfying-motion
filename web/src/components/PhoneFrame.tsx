import type { ReactNode } from "react";

export type FrameShape = "phone" | "card";

const ASPECT: Record<FrameShape, string> = {
  // Plain rounded rectangle, deliberately not a photorealistic device.
  phone: "aspect-[9/19.5]",
  card: "aspect-[4/3]",
};

export function PhoneFrame({
  children,
  shape = "phone",
}: {
  children: ReactNode;
  shape?: FrameShape;
}) {
  const skin = `border border-line bg-surface ${shape === "phone" ? "rounded-[16px]" : "rounded-[4px]"}`;

  return (
    <div className={`relative w-full overflow-hidden ${ASPECT[shape]} ${skin}`}>
      {children}
    </div>
  );
}
