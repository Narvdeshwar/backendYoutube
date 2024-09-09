import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  const exitedUser = User.findOne({
    $or: [{ userName }, { email }],
  });
  if (exitedUser) throw new ApiError(409, "username or email is already exits");

  // step 4: check for image, avatar(required field)

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

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
    avatar: avatar.url,
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

export { registerUser };
