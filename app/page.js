"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import RestaurantPhoto from "./components/RestaurantPhoto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const featuredRestaurants = new Set([
  "R001", // Salve
  "R079", // Kontakt
  "R080", // Szimply
]);

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
        .neq("id", "CAT12")
        .order("name");

      setLandmarks(landmarkData || []);
      setCategories(categoryData || []);
    }

    loadFilters();
  }, []);

  async function getLiveStatus(restaurant) {
    try {
      const params = new URLSearchParams();

      if (restaurant.google_place_id) {
        params.set("placeId", restaurant.google_place_id);
      } else {
        params.set("name", restaurant.name);
      }

      const response = await fetch(
        `/api/place-status?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return {
          recommendable: true,
          status: "unknown",
          label: null,
        };
      }

      return await response.json();
    } catch {
      return {
        recommendable: true,
        status: "unknown",
        label: null,
      };
    }
  }

  async function findPlaces() {
    if (!landmark) {
      setError("Please choose a Budapest landmark first.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);
    setResults([]);

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

    if (category) {
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
          `
          id,
          name,
          status,
          walk_in,
          confidence,
          why_we_like_it,
          good_to_know,
          primary_area,
          recommendation_weight,
          google_place_id,
          google_photo_index
          `
        )
        .eq("active", true)
        .in("id", eligibleIds);

    if (restaurantError) {
      setError("We couldn't load recommendations. Please try again.");
      setLoading(false);
      return;
    }

    const { data: categoryMapData, error: categoryMapError } =
      await supabase
        .from("feed_restaurant_categories")
        .select("restaurant_id,category_id")
        .in("restaurant_id", eligibleIds);

    if (categoryMapError) {
      setError("We couldn't load recommendations. Please try again.");
      setLoading(false);
      return;
    }

    const distanceMap = {};

    eligibleRelations.forEach((item) => {
      distanceMap[item.restaurant_id] = item.public_distance;
    });

    const categoriesByRestaurant = {};

    (categoryMapData || []).forEach((item) => {
      if (!categoriesByRestaurant[item.restaurant_id]) {
        categoriesByRestaurant[item.restaurant_id] = [];
      }

      categoriesByRestaurant[item.restaurant_id].push(
        item.category_id
      );
    });

    let candidates = (restaurantData || []).map((restaurant) => ({
      ...restaurant,
      public_distance: distanceMap[restaurant.id],
      category_ids:
        categoriesByRestaurant[restaurant.id] || [],
    }));

    const liveStatuses = await Promise.all(
      candidates.map(async (restaurant) => {
        const liveStatus = await getLiveStatus(restaurant);

        return {
          ...restaurant,
          live_status: liveStatus.status || "unknown",
          live_label: liveStatus.label || null,
          live_recommendable:
            liveStatus.recommendable !== false,
        };
      })
    );

    candidates = liveStatuses.filter(
      (restaurant) => restaurant.live_recommendable
    );

    candidates.sort((a, b) => {
      const aFeatured = featuredRestaurants.has(a.id);
      const bFeatured = featuredRestaurants.has(b.id);

      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;

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

      const confidenceOrder = {
        "Very High": 4,
        High: 3,
        Medium: 2,
        Low: 1,
      };

      const confidenceDiff =
        (confidenceOrder[b.confidence] || 0) -
        (confidenceOrder[a.confidence] || 0);

      if (confidenceDiff !== 0) {
        return confidenceDiff;
      }

      return a.name.localeCompare(b.name);
    });

    let finalResults = [];

    if (category) {
      finalResults = candidates.slice(0, 3);
    } else {
      const usedRestaurants = new Set();
      const coveredCategories = new Set();

      const usableCategoryIds = new Set(
        categories
          .map((item) => item.id)
          .filter((id) => id !== "CAT12")
      );

      for (const restaurant of candidates) {
        const newCategory = restaurant.category_ids.find(
          (categoryId) =>
            usableCategoryIds.has(categoryId) &&
            !coveredCategories.has(categoryId)
        );

        if (newCategory) {
          finalResults.push(restaurant);
          usedRestaurants.add(restaurant.id);

          restaurant.category_ids.forEach((categoryId) => {
            if (usableCategoryIds.has(categoryId)) {
              coveredCategories.add(categoryId);
            }
          });
        }

        if (
          finalResults.length >= 3 &&
          coveredCategories.size >= 3
        ) {
          break;
        }
      }

      for (const restaurant of candidates) {
        if (finalResults.length >= 5) {
          break;
        }

        if (!usedRestaurants.has(restaurant.id)) {
          finalResults.push(restaurant);
          usedRestaurants.add(restaurant.id);
        }
      }
    }

    finalResults.sort((a, b) => {
      const aFeatured = featuredRestaurants.has(a.id);
      const bFeatured = featuredRestaurants.has(b.id);

      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;

      return 0;
    });

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
            Choose a Budapest landmark, tell us what you feel like
            eating and how far you're willing to walk. We'll show you
            a small selection of places we'd actually recommend.
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
          <p className="eyebrow">YOUR PICKS</p>

          <h2>
            {results.length
              ? "Places we'd recommend"
              : "Nothing we'd confidently recommend here right now."}
          </h2>

          {results.length > 0 && (
            <p className="results-intro">
              {category
                ? "A short list based on exactly what you feel like."
                : "A varied selection of good places nearby — not an endless list of everything around you."}
            </p>
          )}

          <div className="results-grid">
            {results.map((restaurant) => (
              <article
                className="result-card"
                key={restaurant.id}
              >
                <RestaurantPhoto
                  placeId={restaurant.google_place_id}
                  restaurantName={restaurant.name}
                  photoIndex={
                    restaurant.google_photo_index || 0
                  }
                  alt={restaurant.name}
                />

                <div className="result-card-body">
                  <div className="result-top">
                    <span>{restaurant.public_distance}</span>

                    <div className="result-statuses">
                      {restaurant.live_label && (
                        <span className="live-status">
                          {restaurant.live_label}
                        </span>
                      )}

                      {restaurant.status ===
                        "Approved - Peak Check" && (
                        <span>Peak times may be busy</span>
                      )}
                    </div>
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
                </div>
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
            with places we'd actually recommend, then match them to
            where you're going, what you want and how far you're
            willing to walk.
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
            <p>
              A small selection of places we'd actually recommend.
            </p>
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
          Sightseeing is easy. Finding somewhere good to eat nearby
          isn't.
        </span>
      </footer>
    </main>
  );
}
