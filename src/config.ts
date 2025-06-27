const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? '' // Use relative URLs in production (Vercel will handle routing)
    : 'http://localhost:3001'
};

export default config;