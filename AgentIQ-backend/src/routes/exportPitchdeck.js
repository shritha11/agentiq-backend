import { Router } from "express";
import pptxgen from "pptxgenjs";

const router = Router();

router.post(
  "/export-pitchdeck",
  async (req, res) => {

    try {

      const {
        slides,
        brief,
      } = req.body;

      const pptx =
        new pptxgen();

      pptx.layout = "LAYOUT_WIDE";

      pptx.author =
        "AgentIQ";

      pptx.company =
        "AgentIQ";

      pptx.subject =
        brief?.businessName ||
        "Pitch Deck";

      pptx.title =
        brief?.businessName ||
        "Pitch Deck";

      for (const slideData of slides) {

        const slide =
          pptx.addSlide();

        slide.background = {
          color: "0F0F11",
        };

        slide.addText(
          slideData.title || "",
          {
            x: 0.6,
            y: 0.5,

            w: 11,
            h: 0.8,

            fontSize: 28,

            bold: true,

            color: "FFFFFF",

            fontFace: "Aptos",
          }
        );

        slide.addText(
          slideData.content || "",
          {
            x: 0.8,
            y: 1.5,

            w: 11,
            h: 4,

            fontSize: 18,

            color: "D1D5DB",

            breakLine: true,

            fontFace: "Aptos",
          }
        );
      }

      const buffer =
        await pptx.write("nodebuffer");

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pitchdeck.pptx"`
      );

      res.send(buffer);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to export pitch deck",
      });
    }
});

export default router;
