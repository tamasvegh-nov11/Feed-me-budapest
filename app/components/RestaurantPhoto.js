"use client";

import { useEffect, useRef, useState } from "react";

export default function RestaurantPhoto({
  placeId,
  photoIndex = 0,
  alt,
}) {
  const wrapperRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
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

  useEffect(() => {
    if (!shouldLoad || !placeId) return;

    let cancelled = false;

    async function loadPhoto() {
      try {
        const response = await fetch(
          `/api/place-photo?placeId=${encodeURIComponent(
            placeId
          )}&index=${photoIndex}`
        );

        if (!response.ok) {
          throw new Error("Photo request failed");
        }

        const data = await response.json();

        if (!cancelled && data?.url) {
          setPhotoUrl(data.url);
        } else if (!cancelled) {
          setFailed(true);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    loadPhoto();

    return () => {
      cancelled = true;
    };
  }, [shouldLoad, placeId, photoIndex]);

  if (!placeId || failed) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="restaurant-photo-wrap">
      {photoUrl && (
        <img
          src={photoUrl}
          alt={alt || ""}
          className="restaurant-photo"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
