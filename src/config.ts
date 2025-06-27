const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://contact-lens-tool.vercel.app' // Full URL for production Vercel deployment
    : 'http://localhost:3001'
};

export default config;