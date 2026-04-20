import dotenv from "dotenv";
import { startServer } from "./src/server.js";
import connectDB from "./src/config/db.js";


connectDB();

startServer();