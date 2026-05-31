import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8000/api/auth/google/callback",
},
async (accessToken, refreshToken, profile, done) => {
    try {
        return done(null, profile);
    } catch (err) {
        return done(err, null);
    }
}));

export default passport;