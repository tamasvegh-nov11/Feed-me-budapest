"use client";

import { useEffect, useState } from "react";

const RESTAURANT = {
  id: "R001",
  name: "Salve Pizza Napoletana Basilica",
  placeId: "ChIJgSWQgAvdQUcRGzU1QwbpYmU",
};

export default function PhotoPickerPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState(null);
  const [selected, setSelected] = useState(null);
  const [slideUrl, setSlideUrl] = useState("");
  const [slideLoading, setSlideLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPhotos();
  }, []);

  async function loadPhotos() {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.all(
        Array.from({ length: 6 }, async (_, index) => {
          const response = await fetch(
            `/api/place-photo?placeId=${encodeURIComponent(
              RESTAURANT.placeId
            )}&index=${index}`,
            {
              cache: "no-store",
            }
          );

          const data = await response.json();

          if (!response.ok || !data?.url) {
            return {
              index,
              url: null,
              error: data?.error || "Photo unavailable",
            };
          }

          return {
            index,
            url: data.url,
            attribution: data.attribution || null,
            attributionUri: data.attributionUri || null,
          };
        })
      );

      setPhotos(results);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load photos."
      );
    } finally {
      setLoading(false);
    }
  }

  async function buildSlide(publicUrl) {
    setSlideLoading(true);
    setSlideUrl("");
    setError("");

    try {
      const response = await fetch(
        "/api/build-restaurant-slide",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurantId: RESTAURANT.id,
            photoUrl: publicUrl,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.error || "Could not generate slide."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setSlideUrl(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate slide."
      );
    } finally {
      setSlideLoading(false);
    }
  }

  async function usePhoto(photo) {
    if (!photo?.url) return;

    setSavingIndex(photo.index);
    setError("");
    setSlideUrl("");

    try {
      const response = await fetch(
        "/api/cache-place-photo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurantId: RESTAURANT.id,
            restaurantName: RESTAURANT.name,
            photoIndex: photo.index,
            sourceUrl: photo.url,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not save photo."
        );
      }

      const selectedPhoto = {
        ...photo,
        publicUrl: data.publicUrl,
        storagePath: data.storagePath,
      };

      setSelected(selectedPhoto);

      await buildSlide(data.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save photo."
      );
    } finally {
      setSavingIndex(null);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <div style={styles.eyebrow}>
          FEED ME BUDAPEST
        </div>

        <h1 style={styles.title}>
          Photo Picker
        </h1>

        <p style={styles.subtitle}>
          {RESTAURANT.name}
        </p>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {selected && (
        <div style={styles.success}>
          <strong>✓ Photo selected and cached</strong>

          <div style={styles.successText}>
            Photo #{selected.index + 1} is stored in
            Feed Me Budapest media storage.
          </div>

          <img
            src={selected.publicUrl}
            alt="Selected restaurant"
            style={styles.selectedImage}
          />
        </div>
      )}

      {slideLoading && (
        <div style={styles.loadingBox}>
          Building Feed Me Budapest slide…
        </div>
      )}

      {slideUrl && (
        <div style={styles.slideSection}>
          <div style={styles.eyebrow}>
            GENERATED SLIDE
          </div>

          <h2 style={styles.slideTitle}>
            Feed Me Budapest preview
          </h2>

          <img
            src={slideUrl}
            alt="Generated Feed Me Budapest restaurant slide"
            style={styles.slideImage}
          />
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>
          Loading photos…
        </div>
      ) : (
        <div style={styles.grid}>
          {photos.map((photo) => (
            <div
              key={photo.index}
              style={styles.card}
            >
              {photo.url ? (
                <>
                  <div style={styles.photoNumber}>
                    Photo {photo.index + 1}
                  </div>

                  <img
                    src={photo.url}
                    alt={`${RESTAURANT.name} ${photo.index + 1}`}
                    style={styles.image}
                  />

                  {photo.attribution && (
                    <div style={styles.attribution}>
                      Photo: {photo.attribution}
                    </div>
                  )}

                  <button
                    onClick={() => usePhoto(photo)}
                    disabled={savingIndex !== null}
                    style={{
                      ...styles.button,
                      opacity:
                        savingIndex !== null ? 0.6 : 1,
                    }}
                  >
                    {savingIndex === photo.index
                      ? "Saving…"
                      : "Use this photo"}
                  </button>
                </>
              ) : (
                <div style={styles.unavailable}>
                  Photo {photo.index + 1}
                  <br />
                  unavailable
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const green = "#073b2d";
const cream = "#f7f3e8";

const styles = {
  page: {
    minHeight: "100vh",
    background: cream,
    color: green,
    padding: "32px 16px 80px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  header: {
    maxWidth: 1100,
    margin: "0 auto 28px",
  },

  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: 700,
  },

  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(38px,7vw,64px)",
    margin: "8px 0",
  },

  subtitle: {
    margin: 0,
    opacity: 0.7,
    fontSize: 16,
  },

  error: {
    maxWidth: 1100,
    margin: "0 auto 20px",
    background: "#f8dddd",
    padding: 16,
    borderRadius: 12,
  },

  success: {
    maxWidth: 1100,
    margin: "0 auto 24px",
    background: "#e2ebdf",
    padding: 18,
    borderRadius: 16,
  },

  successText: {
    marginTop: 6,
    marginBottom: 16,
    opacity: 0.75,
  },

  selectedImage: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 14,
    display: "block",
  },

  loadingBox: {
    maxWidth: 1100,
    margin: "0 auto 24px",
    padding: 16,
    borderRadius: 14,
    background: "#fffdf7",
    border: "1px solid #ddd7ca",
  },

  slideSection: {
    maxWidth: 1100,
    margin: "0 auto 32px",
    padding: 20,
    background: "#fffdf7",
    border: "1px solid #ddd7ca",
    borderRadius: 18,
  },

  slideTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 30,
    margin: "8px 0 18px",
  },

  slideImage: {
    width: "100%",
    maxWidth: 540,
    aspectRatio: "4 / 5",
    objectFit: "cover",
    borderRadius: 14,
    display: "block",
  },

  loading: {
    maxWidth: 1100,
    margin: "60px auto",
    textAlign: "center",
    opacity: 0.6,
  },

  grid: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 18,
  },

  card: {
    background: "#fffdf7",
    border: "1px solid #ddd7ca",
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
  },

  photoNumber: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: 700,
    marginBottom: 10,
  },

  image: {
    width: "100%",
    aspectRatio: "4 / 5",
    objectFit: "cover",
    borderRadius: 12,
    display: "block",
  },

  attribution: {
    marginTop: 8,
    fontSize: 11,
    opacity: 0.5,
  },

  button: {
    width: "100%",
    border: "none",
    background: green,
    color: cream,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    fontWeight: 700,
    fontSize: 15,
  },

  unavailable: {
    minHeight: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    opacity: 0.45,
  },
};
