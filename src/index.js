// require('dotenv').config({path:'./env'})
import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from 'dotenv';

dotenv.config({ path: './env' })
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => console.log(`Server is running!!!`)
    )
  })
  .catch((error) => {
    console.log("Database connection failed !!!", error);
  });




/**IFEE method to establish the database connection */

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
// import express from "express";
// const app = express();

// ; (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URL}/${process.env.DB_NAME}`)
//     app.on("Error", (error) => {
//       console.log("Some error encountered:", error);
//       throw error
//     })
//     app.listen(process.env.PORT, () => {
//       console.log(`App is running on port : ${process.env.PORT}`);

//     })
//   }
//   catch (error) {
//     console.log("Some error encountered:", error);
//     throw error
//   }
// })()