import mongoose from "mongoose";
import config from "./config.js";

async function connectDB() {
    await mongoose.connect(config.MONGO_URI, {
        dbName: "URL"
    })
    console.log("Connected to DB");
}

export default connectDB;