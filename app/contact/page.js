"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("General");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess(false);

    const { error: insertError } = await supabase
      .from("feed_contact_messages")
      .insert({
        name: name.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
      });

    if (insertError) {
      setError("Something went wrong. Please try again.");
      setSending(false);
      return;
    }

    setSuccess(true);
    setName("");
    setEmail("");
    setTopic("General");
    setMessage("");
    setSending(false);
  }

  return (
    <main>
      <header className="header">
        <Link href="/" className="logo">
          Feed Me Budapest
        </Link>

        <nav>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>

      <section className="how-page">
        <div className="how-page-inner">
          <p className="eyebrow">CONTACT</p>

          <h1>
            See something
            <br />
            we should know?
          </h1>

          <p className="how-lead">
            Found outdated information, know a place we should review,
            or just want to get in touch? Send us a message.
          </p>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div className="contact-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="contact-field">
              <label htmlFor="topic">What is this about?</label>
              <select
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Outdated information">
                  Outdated information
                </option>
                <option value="Restaurant suggestion">
                  Restaurant suggestion
                </option>
                <option value="Restaurant owner or team">
                  Restaurant owner or team
                </option>
                <option value="Technical issue">
                  Technical issue
                </option>
              </select>
            </div>

            <div className="contact-field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what we should know..."
                rows={7}
                required
              />
            </div>

            {error && <p className="contact-error">{error}</p>}

            {success && (
              <p className="contact-success">
                Thanks — your message has been received.
              </p>
            )}

            <button
              type="submit"
              className="feed-button contact-button"
              disabled={sending}
            >
              {sending ? "SENDING..." : "SEND MESSAGE"}
            </button>
          </form>

          <div className="contact-note">
            <strong>About our recommendations</strong>

            <p>
              Feed Me Budapest is independently curated. Restaurant
              recommendations cannot be purchased, and submitting a place
              through this form does not guarantee inclusion.
            </p>

            <p>
              Our recommendations and supporting information are reviewed
              every month.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
