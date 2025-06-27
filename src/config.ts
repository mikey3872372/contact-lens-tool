const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? '' // Use relative URLs in production to work with custom domains
    : 'http://localhost:3001'
};

export default config;