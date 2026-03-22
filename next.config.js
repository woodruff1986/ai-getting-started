/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.ELECTRON_STANDALONE === "1" ? { output: "standalone" } : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "**",
      },
			{
        protocol: "https",
        hostname: "tjzk.replicate.delivery",
        port: "",
        pathname: "**",
      },
			{
        protocol: "https",
        hostname: "replicate.delivery",
        port: "",
        pathname: "**",
      },
			{
        protocol: "https",
        hostname: "a16z.com",
        port: "",
        pathname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
