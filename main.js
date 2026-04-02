CORS_ORIGINS = " http://localhost:3000,   ,  http://127.0.0.1:3000"

const origins = CORS_ORIGINS.split(",")
console.log(origins.map(item => item.trim()).filter(Boolean))