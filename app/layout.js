import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.feedme-budapest.com"),

  title: {
    default: "Feed Me Budapest | Curated Restaurant Finder",
    template: "%s | Feed Me Budapest",
  },

  description:
    "Find curated restaurants near Budapest landmarks based on what you feel like eating and how far you want to walk.",

  keywords: [
    "Budapest restaurants",
    "restaurants near Budapest attractions",
    "where to eat in Budapest",
    "Budapest food guide",
    "Budapest restaurant finder",
    "best restaurants Budapest",
    "food near Budapest landmarks",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.feedme-budapest.com",
    siteName: "Feed Me Budapest",
    title: "Feed Me Budapest | Curated Restaurant Finder",
    description:
      "Choose a Budapest landmark, what you feel like eating and how far you want to walk. Feed Me narrows it down.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Feed Me Budapest | Curated Restaurant Finder",
    description:
      "Curated restaurant recommendations near Budapest landmarks.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
