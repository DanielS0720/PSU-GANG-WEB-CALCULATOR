import Image from "next/image";

interface TierImageProps {
  src: string;
  alt: string;
}

// Renders the recommended tier image — the visual protagonist of the result.
// Image assets are delivered by Daniel into /public/tiers/.
export function TierImage({ src, alt }: TierImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={320}
      height={320}
      className="w-full h-auto rounded-md"
      priority
    />
  );
}
