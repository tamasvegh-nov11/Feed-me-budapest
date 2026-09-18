import Link from "next/link";

export default function AboutPage() {
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
          <p className="eyebrow">ABOUT FEED ME BUDAPEST</p>

          <h1>
            Fewer choices.
            <br />
            Better decisions.
          </h1>

          <p className="how-lead">
            Feed Me Budapest is a curated restaurant finder built for
            travellers who already know where they are going in the city,
            but do not want to spend time comparing endless restaurant lists.
          </p>

          <div className="how-sections">
            <section>
              <span>01</span>
              <h2>How we choose places</h2>

              <p>
                Feed Me is not a ranking of every restaurant in Budapest.
                We deliberately keep the selection small.
              </p>

              <p>
                We look at food and drink quality, consistency, service,
                atmosphere, value for money, local credibility, review
                patterns, walk-in suitability and the risk of a place feeling
                like a tourist trap.
              </p>

              <p>
                Public ratings can be useful, but a high score alone is never
                enough to make the list.
              </p>
            </section>

            <section>
              <span>02</span>
              <h2>Built for real plans</h2>

              <p>
                Recommendations are connected to specific Budapest landmarks
                and realistic walking-distance bands.
              </p>

              <p>
                We also consider whether a place works for spontaneous plans.
                Restaurants that normally require advance booking are generally
                not the focus of Feed Me.
              </p>
            </section>

            <section>
              <span>03</span>
              <h2>Current, not permanent</h2>

              <p>
                Our recommendations and supporting information are reviewed
                every month.
              </p>

              <p>
                New places can be added, restaurants can be removed, and
                categories or landmark connections can change when the
                underlying experience changes.
              </p>
            </section>

            <section>
              <span>04</span>
              <h2>Independent recommendations</h2>

              <p>
                Restaurants cannot pay for a higher position in Feed Me.
              </p>

              <p>
                The purpose of the site is to reduce choice and surface places
                we would genuinely consider recommending, not to sell placement.
              </p>
            </section>

            <section>
              <span>05</span>
              <h2>Opening hours and live availability</h2>

              <p>
                Feed Me checks current opening-hour information so that closed
                places are normally filtered out.
              </p>

              <p>
                Places opening soon may still be shown, while restaurants
                closing soon can be marked accordingly.
              </p>
            </section>

            <section>
              <span>06</span>
              <h2>How AI is used</h2>

              <p>
                Feed Me Budapest was built with the help of AI.
              </p>

              <p>
                AI is used for research assistance, data processing, technical
                development and editorial support. Selection criteria,
                recommendation rules and editorial decisions are human-reviewed.
              </p>
            </section>

            <section>
              <span>07</span>
              <h2>What Feed Me is not</h2>

              <p>
                It is not a complete restaurant directory, a popularity chart
                or a substitute for checking a restaurant directly when
                something is especially important to your visit.
              </p>

              <p>
                We would rather show fewer options than fill the results with
                places we are not confident about.
              </p>
            </section>

            <section>
              <span>08</span>
              <h2>See something we should know?</h2>

              <p>
                Restaurants change, opening hours change and new places open
                all the time.
              </p>

              <p>
                If you spot something that looks outdated or think there is a
                place we should review, send us a message.
              </p>

              <Link href="/contact" className="text-link">
                Contact us →
              </Link>
            </section>
          </div>

          <div className="how-cta">
            <h2>Ready to eat?</h2>

            <p>
              Choose a Budapest landmark, tell us what you feel like and let
              Feed Me narrow it down.
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
