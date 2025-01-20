import express, { Request, Response } from "express";

import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const app = express();

const upload = multer({ dest: "uploads/" });

// HLS output directory
export const HLS_OUTPUT_DIR = path.join(__dirname, "hls");

app.use("/hls", express.static(HLS_OUTPUT_DIR));

// Ensure HLS output directory exists
if (!fs.existsSync(HLS_OUTPUT_DIR)) {
  fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });
}

// Endpoint to handle video upload and transcoding
app.post("/upload", upload.single("video"), (req: Request, res: Response) => {
  const uploadedFile = req.file as Express.Multer.File;

  if (!uploadedFile) {
    res.status(400).send("No file uploaded.");
  }

  const inputFilePath = path.resolve(uploadedFile.path);

  const outputDir = path.join(
    HLS_OUTPUT_DIR,
    path.parse(uploadedFile.filename).name
  );

  const outputPlaylist = path.join(outputDir, "output.m3u8");

  // Ensure output directory for this video exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Start transcoding to HLS format
  ffmpeg(inputFilePath)
    .outputOptions([
      "-codec: copy", // Use the same codec as input
      "-start_number 0",
      "-hls_time 10", // Segment duration
      "-hls_list_size 0", // Include all segments in the playlist
      "-f hls", // Output format
    ])
    .output(outputPlaylist)
    .on("end", () => {
      // Cleanup uploaded file
      fs.unlinkSync(inputFilePath);

      console.log(`/hls/${path.parse(uploadedFile.filename).name}/output.m3u8`);

      return res.status(200).send({
        message: "Video transcoded successfully.",
        playlistUrl: `/hls/${
          path.parse(uploadedFile.filename).name
        }/output.m3u8`,
      });
    })
    .on("error", (err) => {
      console.error("Error during transcoding:", err);
      return res.status(500).send("An error occurred during transcoding.");
    })
    .run();
});

app.listen(8000, () => {
  console.log("Listening on port 8000");
});
