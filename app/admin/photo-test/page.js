"use client";

import { useState } from "react";

export default function PhotoTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function testSalvePhoto() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/cache-place-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId: "R001",
          restaurantName: "Salve Pizza Napoletana Basilica",
          photoIndex: 1,

          sourceUrl:
              "https://www.feedme-budapest.com/api/place-photo?placeId=ChIJgSWQgAvdQUcRGzU1QwbpYmU&index=1",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Photo caching failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.eyebrow}>
          FEED ME BUDAPEST
        </div>

        <h1 style={styles.title}>
          Photo Cache Test
        </h1>

        <p style={styles.text}>
          Test caching a Salve restaurant photo into the
          Supabase feed-media bucket.
        </p>

        <button
          onClick={testSalvePhoto}
          disabled={loading}
          style={styles.button}
        >
          {loading
            ? "Caching photo…"
            : "Cache Salve photo"}
        </button>

        {error && (
          <div style={styles.error}>
            <strong>Error</strong>
            <div>{error}</div>
          </div>
        )}

        {result && (
          <div style={styles.success}>
            <strong>Success</strong>

            <div style={styles.row}>
              <span>Storage path:</span>
              <code>
                {result.storagePath}
              </code>
            </div>

            <div style={styles.row}>
              <span>Public URL:</span>
              <a
                href={result.publicUrl}
                target="_blank"
                rel="noreferrer"
                style={styles.link}
              >
                Open cached image
              </a>
            </div>

            <div style={styles.imageWrap}>
              <img
                src={result.publicUrl}
                alt="Cached Salve"
                style={styles.image}
              />
            </div>
          </div>
        )}
      </div>
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
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "40px 16px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: 620,
    background: "#fffdf7",
    border: "1px solid #ddd7ca",
    borderRadius: 22,
    padding: 28,
    boxSizing: "border-box",
  },

  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: 700,
  },

  title: {
    fontFamily: "Georgia, serif",
    fontSize: 42,
    margin: "10px 0",
  },

  text: {
    lineHeight: 1.5,
    opacity: 0.75,
  },

  button: {
    width: "100%",
    border: "none",
    background: green,
    color: cream,
    padding: 16,
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 16,
    marginTop: 20,
  },

  error: {
    marginTop: 20,
    background: "#f8dddd",
    padding: 16,
    borderRadius: 12,
    lineHeight: 1.5,
  },

  success: {
    marginTop: 20,
    background: "#e2ebdf",
    padding: 16,
    borderRadius: 12,
  },

  row: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  link: {
    color: green,
    fontWeight: 700,
  },

  imageWrap: {
    marginTop: 20,
  },

  image: {
    width: "100%",
    borderRadius: 14,
    display: "block",
  },
};
