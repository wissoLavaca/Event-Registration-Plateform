import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define the storage directory
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads'); // Adjust path if needed, this goes to project_root/uploads

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR); // Save files to the 'uploads' directory
    },
    filename: (req, file, cb) => {
        // Create a unique filename: timestamp + original filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (optional, but good for security and validation)
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Example: Allow only images and PDFs
    // if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    //     cb(null, true);
    // } else {
    //     cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    // }
    // For now, let's accept all files to get started, but you should refine this
    cb(null, true); 
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 
    },
    fileFilter: fileFilter 
});

export default upload;