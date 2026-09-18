import Link from "next/link";

export default function HowItWorksPage() {
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
          <p className="eyebrow">HOW IT WORKS</p>

          <h1>
            Less searching.
            <br />
            More eating.
          </h1>

          <p className="how-lead">
            Feed Me Budapest is designed for one simple situation:
            you already know where you are going in the city, but you
            do not want to spend the next twenty minutes comparing
            restaurant lists.
          </p>

          <div className="how-sections">
            <section>
              <span>01</span>
              <h2>Choose a landmark</h2>

              <p>
                Start with the Budapest sight, square or attraction
                you are visiting.
              </p>

              <p>
                We connect restaurants to specific landmarks rather
                than showing you an enormous city-wide list.
              </p>
            </section>

            <section>
              <span>02</span>
              <h2>Tell us what you feel like</h2>

              <p>
                Choose a category if you already know what you want,
                or leave it on Anything good if you would rather see
                a varied selection.
              </p>
            </section>

            <section>
              <span>03</span>
              <h2>Choose your walking distance</h2>

              <p>
                You can limit recommendations to places within roughly
                10 minutes or expand the search to around 15 minutes.
              </p>

              <p>
                We intentionally use conservative distance bands rather
                than promising unrealistically short walks.
              </p>
            </section>

            <section>
              <span>04</span>
              <h2>We narrow it down</h2>

              <p>
                Feed Me does not try to show every possible restaurant.
              </p>

              <p>
                A specific category returns a short list of up to three
                places. Anything good can return up to five and aims to
                include different types of places where possible.
              </p>
            </section>

            <section>
              <span>05</span>
              <h2>We check whether the place is open</h2>

              <p>
                Closed restaurants are normally filtered out using
                current opening-hour information.
              </p>

              <p>
                A place opening within 30 minutes can still appear as
                Opening soon. A restaurant closing within 30 minutes
                can be shown with a Closing soon notice.
              </p>
            </section>

            <section>
              <span>06</span>
              <h2>Some places receive extra weight</h2>

              <p>
                Recommendation logic can include editorial weighting,
                but that does not mean paid placement.
              </p>

              <p>
                Restaurants cannot purchase a higher position in the
                results.
              </p>
            </section>

            <section>
              <span>07</span>
              <h2>We keep reviewing the guide</h2>

              <p>
                Recommendations, landmark connections and supporting
                information are reviewed every month.
              </p>

              <p>
                Restaurants can be added or removed as places open,
                close or change.
              </p>
            </section>

            <section>
              <span>08</span>
              <h2>AI helps build the system</h2>

              <p>
                Feed Me Budapest was built with the help of AI for
                research assistance, data processing, technical
                development and editorial support.
              </p>

              <p>
                Selection criteria, recommendation rules and editorial
                decisions are human-reviewed.
              </p>
            </section>
          </div>

          <div className="how-cta">
            <h2>Ready to try it?</h2>

            <p>
              Choose where you are going, what you feel like and how
              far you are willing to walk.
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
