import Link from "next/link";

export default function HowItWorks() {
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

      <section className="how-page">
        <div className="how-page-inner">
          <p className="eyebrow">HOW IT WORKS</p>

          <h1>
            Less searching.
            <br />
            More eating.
          </h1>

          <p className="how-lead">
            Feed Me Budapest is built for travellers who already know what
            they want to see — but do not want to spend twenty minutes
            comparing restaurant lists nearby.
          </p>

          <div className="how-sections">
            <section>
              <span>01</span>
              <h2>Choose a landmark</h2>
              <p>
                Start with the Budapest sight you are visiting. We use fixed
                landmark zones instead of your exact location so the results
                stay simple, predictable and reliable.
              </p>
            </section>

            <section>
              <span>02</span>
              <h2>Tell us what you feel like</h2>
              <p>
                Pick a food or drink category — Hungarian, pizza, brunch,
                coffee, drinks and more — or leave it open if you simply want
                something good.
              </p>
            </section>

            <section>
              <span>03</span>
              <h2>Choose how far you want to walk</h2>
              <p>
                We show two simple options: up to 10 minutes or up to 15
                minutes.
              </p>
              <p>
                Our walking distances are intentionally conservative. Internally
                we use shorter distance bands so the walk should usually feel
                shorter than the label, not longer.
              </p>
            </section>

            <section>
              <span>04</span>
              <h2>We only show places we would actually recommend</h2>
              <p>
                Feed Me is not a directory. We do not list every restaurant
                near a landmark, and we do not lower the standard just to fill
                a category.
              </p>
              <p>
                If there is no place nearby that clears our quality threshold,
                we would rather show no result than send you somewhere weak.
              </p>
            </section>

            <section>
              <span>05</span>
              <h2>What we look at</h2>
              <p>
                We consider food quality, service and atmosphere, consistency,
                value for money, local credibility and tourist-trap risk.
              </p>
              <p>
                Public ratings matter, but a high score alone is not enough.
                We also look at review patterns, the size of the review history
                and recurring complaints.
              </p>
            </section>

            <section>
              <span>06</span>
              <h2>Made for spontaneous plans</h2>
              <p>
                The idea is simple: you should have a realistic chance of just
                walking in.
              </p>
              <p>
                We generally avoid restaurants that normally require advance
                booking. At very popular places, peak times can still be busy,
                so some recommendations are marked accordingly.
              </p>
            </section>

            <section>
              <span>07</span>
              <h2>No paid ranking</h2>
              <p>
                Restaurants cannot pay for a better Feed Me position.
              </p>
              <p>
                The recommendations are selected independently. The point of the
                site is to reduce choice, not sell placement.
              </p>
            </section>

            <section>
              <span>08</span>
              <h2>Then Google Maps takes over</h2>
              <p>
                Feed Me helps you decide where to go. When you choose a place,
                GET DIRECTIONS opens Google Maps so you can navigate there
                normally.
              </p>
            </section>
          </div>

          <div className="how-cta">
            <h2>Ready?</h2>
            <p>
              Pick a landmark, choose what you feel like and let Feed Me narrow
              it down.
            </p>

            <Link href="/" className="feed-button how-home-button">
              FEED ME
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
