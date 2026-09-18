"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

function weightedSample(items, count) {
  const pool = [...items];
  const selected = [];

  while (pool.length > 0 && selected.length < count) {
    const totalWeight = pool.reduce(
      (sum, item) => sum + (item.recommendation_weight || 1),
      0
    );

    let random = Math.random() * totalWeight;
    let chosenIndex = 0;

    for (let i = 0; i < pool.length; i++) {
      random -= pool[i].recommendation_weight || 1;

      if (random <= 0) {
        chosenIndex = i;
        break;
      }
    }

    selected.push(pool[chosenIndex]);
    pool.splice(chosenIndex, 1);
  }

  return selected;
}

export default function Home() {
  const [landmarks, setLandmarks] = useState([]);
  const [categories, setCategories] = useState([]);

  const [landmark, setLandmark] = useState("");
  const [category, setCategory] = useState("");
  const [distance, setDistance] = useState("10");

  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function findPlaces() {
    if (!landmark) {
      setError("Please choose a Budapest landmark first.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);
    setResults([]);

    const surpriseMe = category === "CAT12";

    let relationQuery = supabase
      .from("feed_landmark_relations")
      .select("restaurant_id,public_distance")
      .eq("landmark_id", landmark);

    if (distance === "10") {
      relationQuery = relationQuery.eq(
        "public_distance",
        "Within 10 min"
      );
    }

    const { data: relationData, error: relationError } =
      await relationQuery;

    if (relationError) {
      setError("We couldn't load recommendations. Please try again.");
      setLoading(false);
      return;
    }

    if (!relationData || relationData.length === 0) {
      setLoading(false);
      return;
    }

    let eligibleRelations = relationData;

    if (category && !surpriseMe) {
      const ids = relationData.map((item) => item.restaurant_id);

      const { data: categoryLinks, error: categoryError } =
        await supabase
          .from("feed_restaurant_categories")
          .select("restaurant_id")
          .eq("category_id", category)
          .in("restaurant_id", ids);

      if (categoryError) {
        setError("We couldn't load recommendations. Please try again.");
        setLoading(false);
        return;
      }

      const allowedIds = new Set(
        (categoryLinks || []).map((item) => item.restaurant_id)
      );

      eligibleRelations = relationData.filter((item) =>
        allowedIds.has(item.restaurant_id)
      );
    }

    if (eligibleRelations.length === 0) {
      setLoading(false);
      return;
    }

    const eligibleIds = eligibleRelations.map(
      (item) => item.restaurant_id
    );

    const { data: restaurantData, error: restaurantError } =
      await supabase
        .from("feed_restaurants")
        .select(
          "id,name,status,walk_in,confidence,why_we_like_it,good_to_know,primary_area,recommendation_weight"
        )
        .eq("active", true)
        .in("id", eligibleIds);

    if (restaurantError) {
      setError("We couldn't load recommendations. Please try again.");
      setLoading(false);
      return;
    }

    const distanceMap = {};

    eligibleRelations.forEach((item) => {
      distanceMap[item.restaurant_id] = item.public_distance;
    });

    let finalResults = (restaurantData || []).map((restaurant) => ({
      ...restaurant,
      public_distance: distanceMap[restaurant.id],
    }));

    if (surpriseMe) {
      finalResults = weightedSample(finalResults, 3);
    } else {
      finalResults.sort((a, b) => {
        if (
          a.public_distance === "Within 10 min" &&
          b.public_distance !== "Within 10 min"
        ) {
          return -1;
        }

        if (
          b.public_distance === "Within 10 min" &&
          a.public_distance !== "Within 10 min"
        ) {
          return 1;
        }

        return a.name.localeCompare(b.name);
      });

      finalResults = finalResults.slice(0, 5);
    }

    setResults(finalResults);
    setLoading(false);

    setTimeout(() => {
      document
        .getElementById("results")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function googleMapsLink(name) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${name}, Budapest`
    )}`;
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
            Choose a Budapest landmark, tell us what you feel like eating
            and how far you're willing to walk. We'll show you a small
            selection of places we'd actually recommend.
          </p>

          <div className="finder">
            <div className="field">
              <label>Where will you be?</label>

              <select
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              >
                <option value="">Select a landmark</option>

                {landmarks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>What do you feel like?</label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Anything good</option>

                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>How far would you walk?</label>

              <select
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              >
                <option value="10">Up to 10 minutes</option>
                <option value="15">Up to 15 minutes</option>
              </select>
            </div>

            <button
              className="feed-button"
              onClick={findPlaces}
              disabled={loading}
            >
              {loading ? "FINDING..." : "FEED ME"}
            </button>
          </div>

          {error && <p className="search-error">{error}</p>}
        </div>
      </section>

      {searched && (
        <section id="results" className="results-section">
          <p className="eyebrow">
            {category === "CAT12" ? "SURPRISE ME" : "YOUR PICKS"}
          </p>

          <h2>
            {results.length
              ? category === "CAT12"
                ? "Three places. No overthinking."
                : "Places we'd recommend"
              : "Nothing we'd confidently recommend here yet."}
          </h2>

          {results.length > 0 && (
            <p className="results-intro">
              {category === "CAT12"
                ? "We picked three good options for you. Pick one and go."
                : "A small selection based on your choices — not an endless list of everything nearby."}
            </p>
          )}

          <div className="results-grid">
            {results.map((restaurant) => (
              <article className="result-card" key={restaurant.id}>
                <div className="result-top">
                  <span>{restaurant.public_distance}</span>

                  {restaurant.status === "Approved - Peak Check" && (
                    <span>Peak times may be busy</span>
                  )}
                </div>

                <h3>{restaurant.name}</h3>

                {restaurant.why_we_like_it && (
                  <div className="result-copy">
                    <strong>Why we like it</strong>
                    <p>{restaurant.why_we_like_it}</p>
                  </div>
                )}

                {restaurant.good_to_know && (
                  <div className="result-copy">
                    <strong>Good to know</strong>
                    <p>{restaurant.good_to_know}</p>
                  </div>
                )}

                <a
                  className="directions-link"
                  href={googleMapsLink(restaurant.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GET DIRECTIONS →
                </a>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="how-preview">
        <div>
          <p className="eyebrow">HOW IT WORKS</p>

          <h2>
            Less searching.
            <br />
            More eating.
          </h2>

          <p>
            Feed Me doesn't show you every restaurant nearby. We start
            with places we'd actually recommend, then match them to where
            you're going, what you want and how far you're willing to walk.
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
          <span>Less searching. More eating.</span>
        </div>
      </section>

      <footer>
        <strong>Feed Me Budapest</strong>

        <span>
          Sightseeing is easy. Finding somewhere good to eat nearby isn't.
        </span>
      </footer>
    </main>
  );
}
