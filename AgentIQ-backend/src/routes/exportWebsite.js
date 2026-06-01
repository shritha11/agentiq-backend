import { Router } from "express";
import JSZip from "jszip";
import auth from "../middleware/auth.js";

const router = Router();

router.post(
  "/export-website",
  auth,
  async (req, res) => {

    try {

      const { files } = req.body;

      const zip =
        new JSZip();

      Object.entries(files)
        .forEach(([path, code]) => {

          zip.file(
            path.replace("/", ""),
            code
          );
        });

      const content =
        await zip.generateAsync({
          type: "nodebuffer",
        });

      res.set({
        "Content-Type":
          "application/zip",

        "Content-Disposition":
          `attachment; filename="agentiq-project.zip"`,
      });

      res.send(content);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to export website",
      });
    }
});

export default router;