const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = (fileBuffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'itbees/courses', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

const uploadFile = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const publicId = `template_${Date.now()}_${originalName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_')}`;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'itbees/templates',
        resource_type: 'raw',
        public_id: publicId,
        use_filename: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

module.exports = { uploadImage, uploadFile };
