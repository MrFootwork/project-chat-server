import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (imageURL: string) => {
  const uploadResult = await cloudinary.uploader
    .upload(imageURL)
    .catch(error => console.error(error));
  console.log(`🚀 ~ uploadImage ~ uploadResult:`, uploadResult);

  return (uploadResult as UploadApiResponse).secure_url;
};
