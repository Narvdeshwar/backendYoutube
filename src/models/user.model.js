import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const userSchema = Schema(
  {
    userName: {
      type: String,
      unique: true,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudany url provider
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// password save krne se phle below line execute krna hai ki khi password change hua hai ki nhi age change hua hai to encrypt kr do otherwise mt kro aur yha hm arrow function ka use isliye nhi kr rhe hai kyuki uske pass userSchema ke fields ka refernce nhi rhega .

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = bcrypt.hash(this.password, 10);
  next();
});

// custom method => isPasswordCorrect method either true or false value return karega ki authenetication ke time
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//jwt ek bearer token hai mtlb jiske pass bhi "token" hoga ye use data send kr dega

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    (expireIn = process.env.ACCESS_TOKEN_EXPIRY),
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    (expireIn = process.env.ACCESS_TOKEN_EXPIRY),
  );
};

export const User = mongoose.model("User", userSchema);
