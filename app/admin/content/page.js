"use client";

import { useEffect, useState } from "react";

const VERSION = "FMB-ADMIN-V9";

const STATUS_LABELS = {
  ready_for_review: "Pending",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
  rejected: "Rejected",
  draft: "Draft",
};

export default function ContentAdminPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("ready_for_review");

  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("coffee");

  const [photoPicker, setPhotoPicker] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);

  useEffect(() => {
    const savedKey =
      sessionStorage.getItem("feedme_admin_key");

    if (savedKey) {
      setAdminKey(savedKey);
      loadContent(savedKey);
    }
  }, []);

  async function loadContent(key = adminKey) {
    if (!key) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminKey: key,
        }),
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthenticated(false);
        sessionStorage.removeItem("feedme_admin_key");

        if (response.status === 401) {
          throw new Error(
            `${data.error} Sent ${data.receivedLength ?? "?"} characters, expected ${data.expectedLength ?? "?"}. API: ${data.version ?? "unknown"}`
          );
        }

        throw new Error(
          data.error || "Could not load content."
        );
      }

      setAuthenticated(true);
      setItems(data.items || []);

      sessionStorage.setItem(
        "feedme_admin_key",
        key
      );

      if (selected) {
        const updated = (data.items || []).find(
          (item) => item.id === selected.id
        );

        setSelected(updated || null);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    await loadContent(adminKey);
  }

  function logout() {
    sessionStorage.removeItem("feedme_admin_key");
    setAdminKey("");
    setAuthenticated(false);
    setItems([]);
    setSelected(null);
    setMessage("");
    setPhotoPicker(null);
  }

  async function changeStatus(id, status) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminKey,
          id,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Update failed."
        );
      }

      setMessage(
        status === "approved"
          ? "✓ Content approved and sent to Buffer"
          : "Content rejected"
      );

      setSelected(null);
      setPhotoPicker(null);

      await loadContent(adminKey);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function cancelSchedule(id) {
    const confirmed = window.confirm(
      "Cancel this scheduled Buffer post and move it back to Pending?"
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminKey,
          id,
          action: "cancel_schedule",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not cancel schedule."
        );
      }

      setMessage(
        "✓ Schedule cancelled. Content moved back to Pending."
      );

      setSelected(null);
      setPhotoPicker(null);
      setFilter("ready_for_review");

      await loadContent(adminKey);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateContent() {
    setGenerating(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/generate-content",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminKey,
            topic: generateTopic,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not generate content."
        );
      }

      setMessage(
        `✓ New ${
          generateTopic === "coffee"
            ? "coffee"
            : "pizza"
        } carousel created and added to Pending.`
      );

      setFilter("ready_for_review");
      setSelected(null);
      setPhotoPicker(null);

      await loadContent(adminKey);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not generate content."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function openPhotoPicker(slideIndex) {
    if (!selected) return;

    setPhotoLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/change-content-photo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminKey,
            contentId: selected.id,
            slideIndex,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not load photo choices."
        );
      }

      setPhotoPicker({
        slideIndex,
        restaurant: data.restaurant,
        photos: data.photos || [],
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load photo choices."
      );
    } finally {
      setPhotoLoading(false);
    }
  }

  async function choosePhoto(photo) {
    if (!selected || !photoPicker) return;

    setPhotoSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/change-content-photo",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminKey,
            contentId: selected.id,
            slideIndex: photoPicker.slideIndex,
            photoIndex: photo.index,
            sourceUrl: photo.url,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not change photo."
        );
      }

      setMessage(
        `✓ Photo updated for ${data.restaurant?.name || "restaurant"}.`
      );

      setPhotoPicker(null);

      await loadContent(adminKey);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not change photo."
      );
    } finally {
      setPhotoSaving(false);
    }
  }

  if (!authenticated) {
    return (
      <main style={styles.loginPage}>
        <form onSubmit={login} style={styles.loginBox}>
          <div style={styles.eyebrow}>
            FEED ME BUDAPEST
          </div>

          <h1 style={styles.loginTitle}>
            Content Dashboard
          </h1>

          <p style={styles.subtitle}>
            Enter your admin password.
          </p>

          <input
            type="password"
            value={adminKey}
            onChange={(e) =>
              setAdminKey(e.target.value)
            }
            placeholder="Admin password"
            autoComplete="off"
            style={styles.input}
          />

          <button
            type="submit"
            disabled={loading}
            style={styles.loginButton}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {message && (
            <div style={styles.error}>
              {message}
            </div>
          )}

          <div style={styles.version}>
            {VERSION}
          </div>
        </form>
      </main>
    );
  }

  const filtered = items.filter(
    (item) => item.status === filter
  );

  const tabs = [
    "ready_for_review",
    "approved",
    "scheduled",
    "published",
    "failed",
  ];

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            FEED ME BUDAPEST
          </div>

          <h1 style={styles.title}>
            Content Dashboard
          </h1>

          <p style={styles.subtitle}>
            Generate, review and approve Instagram content.
          </p>
        </div>

        <div style={styles.headerButtons}>
          <button
            onClick={() => loadContent(adminKey)}
            style={styles.secondaryButton}
          >
            Refresh
          </button>

          <button
            onClick={logout}
            style={styles.primaryButton}
          >
            Log out
          </button>
        </div>
      </div>

      <section style={styles.generator}>
        <div>
          <div style={styles.generatorEyebrow}>
            CONTENT GENERATOR
          </div>

          <h2 style={styles.generatorTitle}>
            Create a new post
          </h2>

          <p style={styles.generatorText}>
            The system selects saved restaurant photos,
            builds the branded slides and adds the finished
            carousel to Pending for review.
          </p>
        </div>

        <div style={styles.generatorControls}>
          <button
            onClick={() => setGenerateTopic("coffee")}
            style={{
              ...styles.topicButton,
              ...(generateTopic === "coffee"
                ? styles.activeTopic
                : {}),
            }}
          >
            ☕ Coffee
          </button>

          <button
            onClick={() => setGenerateTopic("pizza")}
            style={{
              ...styles.topicButton,
              ...(generateTopic === "pizza"
                ? styles.activeTopic
                : {}),
            }}
          >
            🍕 Pizza
          </button>

          <button
            onClick={generateContent}
            disabled={generating}
            style={{
              ...styles.generateButton,
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating
              ? "Generating…"
              : "Generate content"}
          </button>
        </div>
      </section>

      <div style={styles.tabs}>
        {tabs.map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setSelected(null);
              setPhotoPicker(null);
            }}
            style={{
              ...styles.tab,
              ...(filter === status
                ? styles.activeTab
                : {}),
            }}
          >
            {STATUS_LABELS[status]}

            <span style={styles.count}>
              {
                items.filter(
                  (item) => item.status === status
                ).length
              }
            </span>
          </button>
        ))}
      </div>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={styles.empty}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          No {STATUS_LABELS[filter].toLowerCase()} content yet.
        </div>
      ) : (
        <div style={styles.grid}>
          <div style={styles.list}>
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item);
                  setPhotoPicker(null);
                }}
                style={{
                  ...styles.card,
                  ...(selected?.id === item.id
                    ? styles.selectedCard
                    : {}),
                }}
              >
                <div style={styles.cardTop}>
                  <span style={styles.type}>
                    {item.content_type?.toUpperCase()}
                  </span>

                  {item.salve_featured && (
                    <span style={styles.salve}>
                      SALVE
                    </span>
                  )}
                </div>

                <h2 style={styles.cardTitle}>
                  {item.title}
                </h2>

                {item.topic && (
                  <div style={styles.topic}>
                    {item.topic}
                  </div>
                )}

                {item.publish_at && (
                  <div style={styles.date}>
                    {new Date(
                      item.publish_at
                    ).toLocaleString()}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div style={styles.preview}>
            {!selected ? (
              <div style={styles.previewEmpty}>
                Select a content item to preview it.
              </div>
            ) : (
              <>
                <div style={styles.previewHeader}>
                  <span style={styles.type}>
                    {selected.content_type?.toUpperCase()}
                  </span>

                  <span style={styles.status}>
                    {STATUS_LABELS[selected.status] || selected.status}
                  </span>
                </div>

                <h2 style={styles.previewTitle}>
                  {selected.title}
                </h2>

                {Array.isArray(selected.media_urls) &&
                  selected.media_urls.length > 0 && (
                    <div style={styles.slideGrid}>
                      {selected.media_urls.map(
                        (url, index) => (
                          <div
                            key={index}
                            style={styles.slideCard}
                          >
                            <img
                              src={url}
                              alt={`Slide ${index + 1}`}
                              style={styles.image}
                            />

                            {selected.status ===
                              "ready_for_review" && (
                              <button
                                onClick={() =>
                                  openPhotoPicker(index)
                                }
                                disabled={photoLoading}
                                style={styles.changePhotoButton}
                              >
                                {photoLoading
                                  ? "Loading…"
                                  : "Change photo"}
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                {photoPicker && (
                  <section style={styles.photoPickerPanel}>
                    <div style={styles.photoPickerHeader}>
                      <div>
                        <div style={styles.generatorEyebrow}>
                          PHOTO PICKER
                        </div>

                        <h3 style={styles.photoPickerTitle}>
                          {photoPicker.restaurant?.name}
                        </h3>
                      </div>

                      <button
                        onClick={() => setPhotoPicker(null)}
                        style={styles.closeButton}
                      >
                        Close
                      </button>
                    </div>

                    <div style={styles.photoChoices}>
                      {photoPicker.photos.map((photo) => (
                        <button
                          key={photo.index}
                          onClick={() => choosePhoto(photo)}
                          disabled={photoSaving}
                          style={styles.photoChoice}
                        >
                          <img
                            src={photo.url}
                            alt={`Option ${photo.index + 1}`}
                            style={styles.photoChoiceImage}
                          />

                          <div style={styles.photoChoiceFooter}>
                            Photo {photo.index + 1}
                            {Number(
                              photoPicker.restaurant
                                ?.selectedPhotoIndex
                            ) === photo.index
                              ? " · Current"
                              : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {selected.caption && (
                  <section style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                      Caption
                    </h3>

                    <p style={styles.caption}>
                      {selected.caption}
                    </p>
                  </section>
                )}

                {selected.publish_at && (
                  <section style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                      Scheduled for
                    </h3>

                    <div>
                      {new Date(
                        selected.publish_at
                      ).toLocaleString()}
                    </div>
                  </section>
                )}

                {selected.status ===
                  "ready_for_review" && (
                  <div style={styles.actions}>
                    <button
                      onClick={() =>
                        changeStatus(
                          selected.id,
                          "approved"
                        )
                      }
                      style={styles.approve}
                    >
                      ✓ Approve
                    </button>

                    <button
                      onClick={() =>
                        changeStatus(
                          selected.id,
                          "rejected"
                        )
                      }
                      style={styles.reject}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {selected.status ===
                  "scheduled" && (
                  <div style={styles.actions}>
                    <button
                      onClick={() =>
                        cancelSchedule(selected.id)
                      }
                      style={styles.cancel}
                    >
                      Cancel schedule
                    </button>
                  </div>
                )}

                {selected.error_message && (
                  <div style={styles.error}>
                    {selected.error_message}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div style={styles.footerVersion}>
        {VERSION}
      </div>
    </main>
  );
}

const green = "#073b2d";
const cream = "#f7f3e8";

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: cream,
    color: green,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },

  loginBox: {
    width: "100%",
    maxWidth: 420,
    background: "#fffdf7",
    border: "1px solid #ddd7ca",
    borderRadius: 22,
    padding: 32,
  },

  loginTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 42,
    margin: "10px 0",
  },

  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: 700,
  },

  subtitle: {
    margin: 0,
    opacity: 0.7,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 15,
    marginTop: 24,
    borderRadius: 12,
    border: "1px solid #ccc5b8",
    fontSize: 16,
  },

  loginButton: {
    width: "100%",
    border: "none",
    background: green,
    color: cream,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 16,
  },

  error: {
    marginTop: 20,
    background: "#f8dddd",
    padding: 15,
    borderRadius: 12,
    lineHeight: 1.5,
  },

  version: {
    marginTop: 20,
    opacity: 0.35,
    fontSize: 11,
  },

  page: {
    minHeight: "100vh",
    background: cream,
    color: green,
    padding: "28px 16px 80px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },

  header: {
    maxWidth: 1200,
    margin: "0 auto 24px",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
  },

  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(34px,6vw,64px)",
    margin: "8px 0",
    lineHeight: 0.95,
  },

  headerButtons: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  primaryButton: {
    border: "none",
    background: green,
    color: cream,
    borderRadius: 12,
    padding: "11px 16px",
  },

  secondaryButton: {
    border: `1px solid ${green}`,
    background: "transparent",
    color: green,
    borderRadius: 12,
    padding: "11px 16px",
  },

  generator: {
    maxWidth: 1200,
    margin: "0 auto 24px",
    background: "#fffdf7",
    border: "1px solid #ddd7ca",
    borderRadius: 20,
    padding: 22,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
  },

  generatorEyebrow: {
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: 700,
    opacity: 0.7,
  },

  generatorTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 30,
    margin: "6px 0",
  },

  generatorText: {
    margin: 0,
    lineHeight: 1.5,
    opacity: 0.7,
    maxWidth: 600,
  },

  generatorControls: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },

  topicButton: {
    border: `1px solid ${green}`,
    background: "transparent",
    color: green,
    borderRadius: 30,
    padding: "11px 16px",
    fontWeight: 700,
  },

  activeTopic: {
    background: green,
    color: cream,
  },

  generateButton: {
    border: "none",
    background: green,
    color: cream,
    borderRadius: 12,
    padding: "13px 20px",
    fontWeight: 700,
    fontSize: 15,
  },

  tabs: {
    maxWidth: 1200,
    margin: "0 auto 25px",
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 4,
  },

  tab: {
    border: "none",
    borderRadius: 30,
    padding: "11px 16px",
    background: "#e9e4d7",
    color: green,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  activeTab: {
    background: green,
    color: cream,
  },

  count: {
    marginLeft: 8,
    opacity: 0.65,
  },

  message: {
    maxWidth: 1200,
    margin: "0 auto 20px",
    padding: 14,
    background: "#e2ebdf",
    borderRadius: 10,
  },

  grid: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
    alignItems: "start",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0,
  },

  card: {
    width: "100%",
    textAlign: "left",
    background: "#fffdf7",
    color: green,
    border: "1px solid #ddd7ca",
    borderRadius: 16,
    padding: 18,
    boxSizing: "border-box",
  },

  selectedCard: {
    border: `2px solid ${green}`,
  },

  cardTop: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },

  type: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: 700,
  },

  salve: {
    background: green,
    color: cream,
    fontSize: 10,
    borderRadius: 20,
    padding: "3px 8px",
  },

  cardTitle: {
    fontFamily: "Georgia, serif",
    margin: "0 0 8px",
    fontSize: 22,
    lineHeight: 1.1,
  },

  topic: {
    fontSize: 14,
    opacity: 0.7,
  },

  date: {
    marginTop: 12,
    fontSize: 12,
    opacity: 0.55,
  },

  preview: {
    background: "#fffdf7",
    borderRadius: 20,
    padding: "clamp(20px,4vw,35px)",
    border: "1px solid #ddd7ca",
    minHeight: 320,
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box",
  },

  previewEmpty: {
    opacity: 0.5,
    textAlign: "center",
    padding: "70px 20px",
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  status: {
    fontSize: 12,
    background: "#e9e4d7",
    padding: "5px 10px",
    borderRadius: 20,
  },

  previewTitle: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(28px,5vw,46px)",
    margin: "18px 0 25px",
    lineHeight: 1.05,
    overflowWrap: "anywhere",
  },

  slideGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px,1fr))",
    gap: 12,
    marginBottom: 28,
  },

  slideCard: {
    minWidth: 0,
  },

  image: {
    width: "100%",
    aspectRatio: "4 / 5",
    objectFit: "cover",
    borderRadius: 12,
    display: "block",
  },

  changePhotoButton: {
    width: "100%",
    marginTop: 8,
    border: `1px solid ${green}`,
    background: "transparent",
    color: green,
    padding: 10,
    borderRadius: 10,
    fontWeight: 700,
  },

  photoPickerPanel: {
    border: "1px solid #ddd7ca",
    background: cream,
    padding: 16,
    borderRadius: 16,
    marginBottom: 28,
  },

  photoPickerHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 16,
  },

  photoPickerTitle: {
    fontFamily: "Georgia, serif",
    fontSize: 24,
    margin: "5px 0 0",
  },

  closeButton: {
    border: `1px solid ${green}`,
    background: "transparent",
    color: green,
    borderRadius: 10,
    padding: "8px 12px",
  },

  photoChoices: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(120px,1fr))",
    gap: 10,
  },

  photoChoice: {
    padding: 0,
    border: "1px solid #ddd7ca",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fffdf7",
    color: green,
    textAlign: "left",
  },

  photoChoiceImage: {
    width: "100%",
    aspectRatio: "4 / 5",
    objectFit: "cover",
    display: "block",
  },

  photoChoiceFooter: {
    padding: 8,
    fontSize: 12,
    fontWeight: 700,
  },

  section: {
    borderTop: "1px solid #ddd7ca",
    paddingTop: 20,
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
  },

  caption: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },

  actions: {
    display: "flex",
    gap: 12,
    marginTop: 30,
    flexWrap: "wrap",
  },

  approve: {
    flex: "1 1 180px",
    border: "none",
    background: green,
    color: cream,
    padding: 15,
    borderRadius: 12,
    fontWeight: 700,
  },

  reject: {
    flex: "1 1 120px",
    border: `1px solid ${green}`,
    background: "transparent",
    color: green,
    padding: 15,
    borderRadius: 12,
  },

  cancel: {
    width: "100%",
    border: "1px solid #9b2c2c",
    background: "#fff7f7",
    color: "#9b2c2c",
    padding: 15,
    borderRadius: 12,
    fontWeight: 700,
  },

  empty: {
    maxWidth: 1200,
    margin: "50px auto",
    textAlign: "center",
    opacity: 0.55,
  },

  footerVersion: {
    maxWidth: 1200,
    margin: "60px auto 0",
    opacity: 0.25,
    fontSize: 11,
  },
};
