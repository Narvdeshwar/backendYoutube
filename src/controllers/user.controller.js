import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (Error) {
    throw new ApiError(
      500,
      "Something fishy happens during generating the access and refresh token",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /**
   * Step 1: getting the required data from the frontend user
   * Step 2: validation to check whether the required fields are non-empty
   * Step 3: check whether the user is already exits or not : email , username
   * step 4: check for image, avatar(required field)
   * Step 5: upload them on cloudinary -> avator
   * Step 6: create the user object -> entry in the database
   * Step 7: remove the password and refresh token from the response
   * Step 8: check for the user creation
   * Step 9: return the response
   */

  // Step 1 : getting the required data from the frontend user
  const { userName, fullName, email, password } = req.body;
  console.log("email is:", email);

  // Step 2 : validation to check whether the required fields are non-empty
  if (
    [fullName, userName, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError();
  }

  // Step 3: check whether the user is already exits or not : email , username
  const exitedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (exitedUser) throw new ApiError(409, "username or email is already exits");

  // step 4: check for image, avatar(required field)

  if (!req.files || !req.files.avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

  console.log(coverImageLocalPath);

  // Step 5: upload avatar and coverage image in cloudinary
  const avatar = await cloudinaryUpload(avatarLocalPath);
  const coverImage = await cloudinaryUpload(coverImageLocalPath);

  // check whether the images are uploaded over cloudinary or not
  if (!avatar) throw new ApiError(400, "Avatar is required");

  // Step 6: create the user object -> entry in the database
  const user = await User.create({
    fullName,
    userName: userName.toLowerCase(),
    email,
    password,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  if (!createdUser)
    throw new ApiError(
      500,
      "Some issues have been encountered during creation of registering the user...",
    );

  // step 7: getting response after successfully saving data in DB
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered succesfully"));
});

// login controller
const loginUser = asyncHandler(async (req, res) => {
  /**
   * Step 1: getting the data from the req.body
   * Step 2: check the data for email or username
   * Step 3: finding that user from the db and check wheter the user exits or not
   * Step 4: chekc the password entered by user is correct or not
   * Step 5: generate the access and refresh token
   * Step 6: send the secure cookies to ths user
   */
  // step 1: getting the data from the user for login purpose
  console.log("login user route work");
  const { username, email, password } = req.body;

  // step 2: check the data for email or username
  if (!(username || email)) {
    throw new ApiError(406, "username or email required");
  }

  // Step 3: finding that user from the db and check whether the exits in database or not
  const user = await User.findOne({
    $or: [{ username, email }],
  });

  if (!user) {
    throw new ApiError(401, "User not exit");
  }

  // step 4: chekc the password entered by user is correct or not
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError("401", "Invalid user credentials..");
  }

  // step 5: genrate access token and refresh token
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  // setting options cookie so that it will modifiedable only the server
  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { loggedInUser, accessToken, refreshToken },
        "User logged in succussfully..",
      ),
    );
});

// logout controller
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

// refreshtoken response controller
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.body.refreshToken || req.cookies.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorised Request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { newAccessToken, newRefreshToken } = generateAccessAndRefreshToken(
      user._id,
    );
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { newAccessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

// changeCurrentPassword controller
const changeCurrentPassword = asyncHandler(async (req, res) => {
  // taking the oldpassword,newpassword and confirm password from the user
  const { oldPassword, newPassword, confirmPassword } = req.body;
  // check whether newpassword and confirmpassword is correct or not
  if (!(newPassword === confirmPassword)) {
    throw new ApiError(200, "new password and confirm password are incorrect");
  }
  // if the user is at change password condition means that the user is logged in then we can extract the user_id from the user
  const user = await User.findById(req.user?.id);
  // now we check whether the old password is correct or not
  const isOldPasswordIsCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isOldPasswordIsCorrect) {
    throw new ApiError(400, "Invalid old password");
  }
  // if old password is correct then we will save it to db
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"));
});

// getting current user controller
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

// updating user details controller
const updateUserDetails = asyncHandler(async (req, res) => {
  // getting the data from front end to update the data
  const { fullName, email } = req.body; // data is coming from front-end
  // check whether empty response received from the front end
  if (!(fullName || email)) {
    throw new ApiError(200, "fullname or email is required!");
  }
  // if the data is received then find the user from the db and update the details and don't send the password as a response
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    {
      new: true, // to get the response
    },
  ).select("-password");
  // if the data is updated then send the respose
  res.status(
    400,
    new ApiResponse(400, user, "user details updated successfully"),
  );
});

// updating avatar controller
const updateAvatar = asyncHandler(async (req, res) => {
  // taking the avatar from the front-end
  const avatarLocalPath = req.files?.path;

  // checking whether the path is provided or not
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing ?");
  }
  // if avatar file path is provided then upload on cloudinary
  const avatar = await cloudinaryUpload(avatarLocalPath);
  // if avatar is upload on cloudinary then check whether url is received from the cloudinary or not
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading the cloudinary");
  }
  // if avatar is uploaded on cloudinary successfully the update the object on db for that user
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    },
  ).select("-password");
  // if avatar is updated successfully the send the response
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// updating cover image controller
const updateCoverImage = asyncHandler(async (req, res) => {
  // taking the coverimage from the front end user
  const coverImageLocalPath = req.file?.path;

  // check whether local path is provided or not
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image is not provided..");
  }

  // if cover image localpath found the upload it to cloudinary
  const coverImageUrl = await cloudinaryUpload(coverImageLocalPath);

  // if coverImage not uploaded successfully on cloudinary then through the error
  if (!coverImageUrl) {
    throw new ApiError(
      400,
      "coverImage not uploaded successfully on the cloudinary",
    );
  }

  // if cover image uploaded successfully then find the user from the database
  const user = User.findByIdAndDelete(
    req.user?._id,
    {
      $set: { coverImage: coverImageUrl.url },
    },
    {
      new: true,
    },
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"));
});

export {
  registerUser,
  loginUser,
  logout,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateAvatar,
  updateCoverImage,
};
