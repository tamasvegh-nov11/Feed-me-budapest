"use client";

import { useEffect, useRef, useState } from "react";

export default function RestaurantPhoto({
  placeId,
  photoIndex = 0,
  alt,
}) {
  const wrapperRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!placeId) return;

    const element = wrapperRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "250px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [placeId]);

  if (!placeId || failed) {
    return null;
  }

  const src = `/api/place-photo?placeId=${encodeURIComponent(
    placeId
  )}&photoIndex=${photoIndex}`;

  return (
    <div ref={wrapperRef} className="restaurant-photo-wrap">
      {shouldLoad && (
        <img
          src={src}
          alt={alt || ""}
          className="restaurant-photo"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
