require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for specific origins
app.use(cors({
  origin: ['https://amit123103.github.io', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route for health check (prevents "Cannot GET /" message)
app.get('/', (req, res) => {
  res.send('Amit Kumar Portfolio Server is Live and Operational! 🚀');
});

// Setup Multer to store uploaded videos in the 'uploads' folder dynamically
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split('/')[1] || 'webm';
    cb(null, `video-${Date.now()}.${ext}`);
  }
});
const upload = multer({ storage: storage });

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email dispatching route
app.post('/api/contact', upload.single('videoMessage'), async (req, res) => {
  try {
    const { name, email, mission, subject, message, consent } = req.body;
    const videoFile = req.file; // From multer

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
    }

    // 1. Email to Site Owner (You) 
    const ownerMailOptions = {
      from: `"Transmission Bot" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself
      replyTo: email,
      subject: `NEW LEAD: [${mission}] ${subject} from ${name}`,
      text: `
New Portfolio Contact Submission:

Name: ${name}
Email: ${email}
Mission: ${mission}
Subject: ${subject}
Consent Given: ${consent}

Message:
${message}

${videoFile ? 'A video message was attached.' : 'No video message was provided.'}
      `,
      attachments: [],
    };

    if (videoFile) {
      ownerMailOptions.attachments.push({
        filename: videoFile.originalname || `video-message.webm`,
        path: videoFile.path,
        contentType: videoFile.mimetype,
      });
    }

    // 2. Auto-Reply Email to the User
    const autoReplyMailOptions = {
      from: `"Amit Kumar" <${process.env.SMTP_USER}>`,
      to: email, // Send back to the user
      subject: `Received: ${subject} - Thanks for reaching out!`,
      html: `
        <div style="font-family: 'Courier New', Courier, monospace; background: #0a0a2e; color: #b8c5e0; padding: 40px; border-radius: 8px;">
          <h2 style="color: #00f5ff;">TRANSMISSION RECEIVED // SUCCESS</h2>
          <p>Hello ${name},</p>
          <p>Thank you for initiating contact. I've received your message regarding <strong>${subject}</strong>.</p>
          <p>My neural systems are currently processing the details, and I will be reviewing your ${videoFile ? 'embedded video and text briefing' : 'text briefing'} shortly.</p>
          <br>
          <p>I typically respond within 1-2 business days to explore potential synergy.</p>
          <p>Best regards,<br>
          <strong>Amit Kumar</strong><br>
          <span style="color: #ff6b9d;">Full Stack Developer | Amit Kumar</span></p>
        </div>
      `,
    };

    // Send the emails if credentials exist
    if (!process.env.SMTP_USER || process.env.SMTP_USER === '') {
      console.warn('NOTE: Transmissions saved locally. SMTP emails skipped because .env is not configured.');
      return res.status(200).json({ 
        success: true, 
        message: 'Transmission locked in local server. SMTP email skipped (configure .env to enable mail).' 
      });
    }

    try {
      await transporter.sendMail(ownerMailOptions);
      console.log('Owner notification sent successfully.');
      
      await transporter.sendMail(autoReplyMailOptions);
      console.log('Auto-reply sent successfully.');
      
    } catch (err) {
      console.error('Nodemailer Error:', err.message);
      console.warn('NOTE: Transmissions are being saved locally, but emails failed because SMTP is not configured in .env yet.');
      return res.status(200).json({ 
        success: true, 
        message: 'Transmission locked in local server. SMTP email failed (configure .env to enable mail).' 
      });
    }

    // Optionally cleanup the uploaded video after sending
    if (videoFile && fs.existsSync(videoFile.path)) {
       // Commenting out deletion so the owner can keep local backups in /uploads if SMTP fails later.
       // fs.unlinkSync(videoFile.path); 
    }

    res.status(200).json({ success: true, message: 'Transmission dispatched and auto-reply initiated.' });

  } catch (error) {
    console.error('Server Error handling contact submission:', error);
    res.status(500).json({ success: false, error: 'Internal server processing error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Amit Kumar Communications Server running on port ${PORT}`);
  console.log(`Awaiting transmissions...`);
});
