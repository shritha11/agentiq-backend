import axios from "axios";

export async function getUnsplashImages(query, count = 5) {
    try {
        const res = await axios.get(
            "https://api.unsplash.com/search/photos", 
            {
                params: {
                    query,
                    per_page: count,
                },
                headers: {
                    Authorization: 
                    `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
                }
            }
        );

        return res.data.results.map(
            (img) => img.urls.regular
        );
    } catch(err) {
        console.error(
  "Unsplash error:",
  err.response?.data || err.message
);

        return [];
    }
}