"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
/** Source images load directly, without duplicating media or creating a proxy endpoint. */
export function EditorialImage(props: ImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = typeof props.src === "string" ? props.src : "";
  const isSource = source.startsWith(
    "https://apexnewsindia.in/wp-content/uploads/",
  );
  if (!isSource) return <Image {...props} alt={props.alt} />;
  const failed = failedSource === source;
  return (
    <Image
      {...props}
      src={failed ? "/images/source-unavailable.svg" : source}
      unoptimized
      referrerPolicy="no-referrer"
      alt={failed ? "Source image unavailable" : props.alt}
      onError={(event) => {
        setFailedSource(source);
        props.onError?.(event);
      }}
    />
  );
}
