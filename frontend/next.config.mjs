/** @type {import('next').NextConfig} */
const nextConfig = {
  // The game logic is an imperative, once-on-mount DOM port; StrictMode's
  // double-invoked effects would duplicate listeners/handlers.
  reactStrictMode: false,
};


export default nextConfig;
