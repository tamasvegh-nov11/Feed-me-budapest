"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function Home() {
  const [landmarks, setLandmarks] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function loadFilters() {
      const { data: landmarkData } = await supabase
        .from("feed_landmarks")
        .select("id,name")
        .eq("active", true)
        .order("name");

      const { data: categoryData } = await supabase
        .from("feed_categories")
        .select("id,name")
        .order("name");

      setLandmarks(landmarkData || []);
      setCategories(categoryData || []);
    }

    loadFilters();
  }, []);

  return (
    <main>
      <header className="header">
        <Link href="/" className="logo">
          Feed Me Budapest
        </Link>

        <nav>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/about">About</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <h1>
            You know what you want to see.
            <br />
            <span>We know where you should eat nearby.</span>
          </h1>

          <p className="intro">
            Choose a Budapest landmark, tell us what you feel like eating and
            how far you're willing to walk. We'll show you a small selection of
            places we'd actually recommend.
          </p>

          <div className="finder">
            <div className="field">
              <label>Where will you be?</label>
              <select defaultValue="">
                <option value="" disabled>
                  Select a landmark
                </option>
                {landmarks.map((landmark) => (
                  <option key={landmark.id} value={landmark.id}>
                    {landmark.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>What do you feel like?</label>
              <select defaultValue="">
                <option value="">Any cuisine</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>How far would you walk?</label>
              <select defaultValue="10">
                <option value="10">Up to 10 minutes</option>
                <option value="15">Up to 15 minutes</option>
              </select>
            </div>

            <button className="feed-button">FEED ME</button>
          </div>
        </div>
      </section>

      <section className="how-preview">
        <div>
          <p className="eyebrow">HOW IT WORKS</p>

          <h2>
            Less searching.
            <br />
            More eating.
          </h2>

          <p>
            Feed Me doesn't show you every restaurant nearby. We start with
            places we'd actually recommend, then match them to where you're
            going, what you want and how far you're willing to walk.
          </p>

          <Link href="/how-it-works" className="text-link">
            See how it works →
          </Link>
        </div>

        <div className="steps">
          <div>
            <span>01</span>
            <strong>Choose a landmark</strong>
            <p>Tell us which Budapest sight you're visiting.</p>
          </div>

          <div>
            <span>02</span>
            <strong>Pick what you feel like</strong>
            <p>Choose a food or drink category.</p>
          </div>

          <div>
            <span>03</span>
            <strong>Choose your walking distance</strong>
            <p>Up to 10 or 15 minutes.</p>
          </div>

          <div>
            <span>04</span>
            <strong>We do the rest</strong>
            <p>A small selection of places we'd actually recommend.</p>
          </div>
        </div>
      </section>

      <section className="trust">
        <div>
          <strong>Curated quality</strong>
          <span>Independently selected</span>
        </div>

        <div>
          <strong>Conservative walking distances</strong>
          <span>Realistic and reliable</span>
        </div>

        <div>
          <strong>Made for spontaneous plans</strong>
          <span>No endless searching</span>
        </div>
      </section>

      <footer>
        <strong>Feed Me Budapest</strong>
        <span>Sightseeing is easy. Finding somewhere good to eat nearby isn't.</span>
      </footer>
    </main>
  );
}
