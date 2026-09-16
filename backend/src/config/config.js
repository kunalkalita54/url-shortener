import dotenv from "dotenv";

dotenv.config(); 

if(!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined in environmental variables"); 
}


const config= {
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET
}

export default config;