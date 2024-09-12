import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  const { username, email, password } = req.body;

  // step 2: check the data for email or username
  if (!username || !email) {
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

export { registerUser, loginUser };
