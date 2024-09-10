import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUpload = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("file path is not found");
      return null;
    }
    console.log("test", localFilePath);
  
    // upload the file over the cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // checking the resource type
    });
    console.log("respose form", response);
    console.log("file upload on cloudinary successfully", response.url);
  
    // delete the file path after the successful upload of files
    if (response.url) {
      fs.unlinkSync(localFilePath);
    }
  
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the temporary saved file as the file upload operation get failed
    return null;
  }
};

export { cloudinaryUpload };
