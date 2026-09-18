"use client";

import { useEffect, useRef, useState } from "react";

export default function RestaurantPhoto({
  placeId,
  restaurantName,
  photoIndex = 0,
  alt,
}) {
  const wrapperRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!placeId && !restaurantName) return;

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
  }, [placeId, restaurantName]);

  useEffect(() => {
    if (!shouldLoad) return;

    let cancelled = false;

    async function loadPhoto() {
      try {
        const params = new URLSearchParams();

        if (placeId) {
          params.set("placeId", placeId);
        } else if (restaurantName) {
          params.set("name", restaurantName);
        }

        params.set("index", String(photoIndex));

        const response = await fetch(
          `/api/place-photo?${params.toString()}`
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
  }, [shouldLoad, placeId, restaurantName, photoIndex]);

  if ((!placeId && !restaurantName) || failed) {
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
