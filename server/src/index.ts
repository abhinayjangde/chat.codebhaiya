import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";
import db from './lib/db.js';


dotenv.config();
const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;
db();

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});
