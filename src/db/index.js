import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
    console.log(`Connected with database successfully!! \nHost :: ${connectInstance.connection.host}`);
    //console.log(connectInstance); // this will return object of mongoose.connect()
    
  } catch (error) {
    console.log("Error connecting to the database: ", Error);
    process.exit(1);
  }
}

export default connectDB;