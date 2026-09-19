"use client";

import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadContent() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/content", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load content.");
      }

      setItems(data.items || []);

      if (selected) {
        const updated = (data.items || []).find(
          (item) => item.id === selected.id
        );
        setSelected(updated || null);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContent();
  }, []);

  async function changeStatus(id, status) {
    setMessage("");

    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Update failed.");
      }

      setMessage(
        status === "approved"
          ? "✓ Content approved"
          : "Content rejected"
      );

      setSelected(null);
      await loadContent();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filtered = items.filter((item) => item.status === filter);

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
          <div style={styles.eyebrow}>FEED ME BUDAPEST</div>
          <h1 style={styles.title}>Content Dashboard</h1>
          <p style={styles.subtitle}>
            Review and approve Instagram content.
          </p>
        </div>

        <button onClick={loadContent} style={styles.refresh}>
          Refresh
        </button>
      </div>

      <div style={styles.tabs}>
        {tabs.map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setSelected(null);
            }}
            style={{
              ...styles.tab,
              ...(filter === status ? styles.activeTab : {}),
            }}
          >
            {STATUS_LABELS[status]}
            <span style={styles.count}>
              {items.filter((item) => item.status === status).length}
            </span>
          </button>
        ))}
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {loading ? (
        <div style={styles.empty}>Loading content…</div>
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
                onClick={() => setSelected(item)}
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
                    <span style={styles.salve}>SALVE</span>
                  )}
                </div>

                <h2 style={styles.cardTitle}>{item.title}</h2>

                {item.topic && (
                  <div style={styles.topic}>{item.topic}</div>
                )}

                <div style={styles.date}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : ""}
                </div>
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

                <h2 style={styles.previewTitle}>{selected.title}</h2>

                {Array.isArray(selected.media_urls) &&
                  selected.media_urls.length > 0 && (
                    <div style={styles.images}>
                      {selected.media_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Slide ${index + 1}`}
                          style={styles.image}
                        />
                      ))}
                    </div>
                  )}

                {selected.caption && (
                  <section style={styles.section}>
                    <h3 style={styles.sectionTitle}>Caption</h3>
                    <p style={styles.caption}>{selected.caption}</p>
                  </section>
                )}

                {Array.isArray(selected.slide_text) &&
                  selected.slide_text.length > 0 && (
                    <section style={styles.section}>
                      <h3 style={styles.sectionTitle}>Slides</h3>

                      {selected.slide_text.map((slide, index) => (
                        <div key={index} style={styles.slideText}>
                          <strong>Slide {index + 1}</strong>
                          <div>
                            {typeof slide === "string"
                              ? slide
                              : JSON.stringify(slide)}
                          </div>
                        </div>
                      ))}
                    </section>
                  )}

                {selected.publish_at && (
                  <section style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                      Scheduled for
                    </h3>
                    <div>
                      {new Date(selected.publish_at).toLocaleString()}
                    </div>
                  </section>
                )}

                {selected.status === "ready_for_review" && (
                  <div style={styles.actions}>
                    <button
                      onClick={() =>
                        changeStatus(selected.id, "approved")
                      }
                      style={styles.approve}
                    >
                      ✓ Approve
                    </button>

                    <button
                      onClick={() =>
                        changeStatus(selected.id, "rejected")
                      }
                      style={styles.reject}
                    >
                      Reject
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
    padding: "40px 20px 80px",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    maxWidth: 1200,
    margin: "0 auto 30px",
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "center",
  },

  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: 700,
  },

  title: {
    fontSize: "clamp(34px, 6vw, 64px)",
    margin: "8px 0",
    fontFamily: "Georgia, serif",
  },

  subtitle: {
    margin: 0,
    opacity: 0.7,
  },

  refresh: {
    border: `1px solid ${green}`,
    background: "transparent",
    color: green,
    borderRadius: 12,
    padding: "10px 16px",
    cursor: "pointer",
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
    cursor: "pointer",
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
    gridTemplateColumns: "minmax(260px, 380px) minmax(0, 1fr)",
    gap: 20,
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  card: {
    width: "100%",
    textAlign: "left",
    background: "#fffdf7",
    color: green,
    border: "1px solid #ddd7ca",
    borderRadius: 16,
    padding: 18,
    cursor: "pointer",
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
  },

  topic: {
    fontSize: 14,
    opacity: 0.7,
  },

  date: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 14,
  },

  preview: {
    background: "#fffdf7",
    borderRadius: 20,
    padding: "clamp(20px, 4vw, 35px)",
    border: "1px solid #ddd7ca",
    minHeight: 420,
  },

  previewEmpty: {
    opacity: 0.5,
    textAlign: "center",
    paddingTop: 100,
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
  },

  status: {
    fontSize: 12,
    background: "#e9e4d7",
    padding: "5px 10px",
    borderRadius: 20,
  },

  previewTitle: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(28px, 5vw, 46px)",
    margin: "18px 0 25px",
  },

  images: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    marginBottom: 28,
  },

  image: {
    width: 180,
    aspectRatio: "4 / 5",
    objectFit: "cover",
    borderRadius: 12,
    flexShrink: 0,
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
  },

  slideText: {
    padding: "10px 0",
    lineHeight: 1.5,
  },

  actions: {
    display: "flex",
    gap: 12,
    marginTop: 30,
  },

  approve: {
    flex: 1,
    border: "none",
    background: green,
    color: cream,
    padding: "15px 20px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  reject: {
    border: `1px solid ${green}`,
    background: "transparent",
    color: green,
    padding: "15px 20px",
    borderRadius: 12,
    cursor: "pointer",
  },

  error: {
    marginTop: 20,
    background: "#f8dddd",
    padding: 15,
    borderRadius: 10,
  },

  empty: {
    maxWidth: 1200,
    margin: "50px auto",
    textAlign: "center",
    opacity: 0.55,
  },
};
