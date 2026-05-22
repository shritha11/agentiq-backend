export async function architecturePlannerNode(
  state
) {
  const { brief } = state;

  let files = [
    "/Navbar.js",
    "/Hero.js",
    "/Features.js",
    "/Footer.js",
    "/App.js",
  ];

  // SaaS
  if (
    brief?.businessType
      ?.toLowerCase()
      .includes("saas")
  ) {
    files = [
      "/Navbar.js",
      "/Hero.js",
      "/DashboardPreview.js",
      "/Features.js",
      "/Pricing.js",
      "/CTA.js",
      "/Footer.js",
      "/App.js",
    ];
  }

  // Portfolio
  if (
    brief?.businessType
      ?.toLowerCase()
      .includes("portfolio")
  ) {
    files = [
      "/Navbar.js",
      "/Hero.js",
      "/Projects.js",
      "/About.js",
      "/Contact.js",
      "/Footer.js",
      "/App.js",
    ];
  }

  return {
    projectStructure: {
      files,
    },

    currentStep:
      "architecturePlanner",

    steps: [
      "Architecture: File tree created",
    ],
  };
}