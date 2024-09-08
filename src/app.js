import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

const app = express();

// Middleware to enable Cross-Origin Resource Sharing (CORS)
// Allows the server to accept requests from specified origins
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // The origin URL(s) allowed to access the server
    credentials: true, // Allows cookies to be sent with requests
  }),
);

// Middleware to parse incoming JSON payloads
// Limits the size of the JSON payload to 16KB
app.use(
  express.json({
    limit: "16kb",
  }),
);

// Middleware to parse URL-encoded data from forms or query strings
// extended: true allows for rich objects and arrays to be encoded into the URL-encoded format
app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  }),
);

// Middleware to serve static files (e.g., images, CSS, JavaScript,pdf) from the 'public' directory
app.use(express.static("public"));

// Middleware to parse and manage cookies
// Useful for reading and writing cookies during CRUD operations
app.use(cookieParser());

// import routes for register the user
import userRouter from "./routes/user.routes.js";

//routes declaration

app.use("/api/v1/users", userRouter);

export { app };
