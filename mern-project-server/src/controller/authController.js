const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Users = require("../model/Users");
const { OAuth2Client } = require("google-auth-library");
const { validationResult } = require("express-validator");
const { attemptToRefreshToken } = require("../util/authUtil");
const { VIEWER_ROLE, ADMIN_ROLE } = require("../constants/userConstants");
const sendEmail = require("../service/emailService");

const secret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_TOKEN_SECRET;

const authController = {
  login: async (request, response) => {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        console.log("Login failed: Validation errors:", errors.array());
        return response.status(401).json({ errors: errors.array() });
      }

      const { username, password } = request.body;
      console.log("Attempting to find user with email:", username);

      const data = await Users.findOne({ email: username });
      if (!data) {
        console.log("Login failed: User not found for email:", username);
        return response.status(401).json({ message: "Invalid credentials " });
      }

      console.log("User found. Comparing passwords...");
      const isMatch = await bcrypt.compare(password, data.password);
      if (!isMatch) {
        console.log("Login failed: Password mismatch for user:", username);
        return response.status(401).json({ message: "Invalid credentials " });
      }

      const user = {
        id: data._id,
        name: data.name,
        email: data.email,
        role: data.role ? data.role : ADMIN_ROLE,
        adminId: data.adminId,
        credits: data.credits,
        subscription: data.subscription,
      };

      const token = jwt.sign(user, secret, { expiresIn: "1h" });
      response.cookie("jwtToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        path: "/",
      });

      const refreshTokenPayload = data.toObject();
      const refreshtoken = jwt.sign(refreshTokenPayload, refreshSecret, {
        expiresIn: "7d",
      });
      response.cookie("refreshToken", refreshtoken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        path: "/",
      });
      response.json({ user: user, message: "User authenticated" });
    } catch (error) {
      console.error("Login Error (caught in try-catch):", error);
      response.status(500).json({ error: "Internal server error" });
    }
  },

  logout: (request, response) => {
    response.clearCookie("jwtToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    });
    response.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    });
    response.json({ message: "Logout successfull" });
  },

  isUserLoggedIn: async (request, response) => {
    const token = request.cookies.jwtToken;

    if (!token) {
      return response
        .status(401)
        .json({ message: "Unauthorized access: No access token" });
    }

    jwt.verify(token, secret, async (error, user) => {
      if (error) {
        const refreshToken = request.cookies?.refreshToken;
        if (refreshToken) {
          try {
            const { newAccessToken, user: refreshedUser } =
              await attemptToRefreshToken(refreshToken);

            response.cookie("jwtToken", newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
              path: "/",
            });

            console.log("✅ Refresh token renewed the access token");
            const latestUserDetails = await Users.findById({
              _id: refreshedUser.id,
            });
            if (!latestUserDetails) {
              response.clearCookie("jwtToken", { path: "/" });
              response.clearCookie("refreshToken", { path: "/" });
              return response
                .status(401)
                .json({ message: "Unauthorized access: User not found" });
            }
            return response.json({
              message: "User is logged in",
              user: latestUserDetails,
            });
          } catch (refreshErr) {
            console.error(
              "Refresh token failed in middleware:",
              refreshErr.message,
            );
            response.clearCookie("jwtToken", { path: "/" });
            response.clearCookie("refreshToken", { path: "/" });
            return response
              .status(401)
              .json({ message: "Unauthorized access: Invalid refresh token" });
          }
        }

        return response
          .status(401)
          .json({ message: "Unauthorized access: No refresh token" });
      } else {
        const latestUserDetails = await Users.findById({ _id: user.id });
        if (!latestUserDetails) {
          response.clearCookie("jwtToken", { path: "/" });
          response.clearCookie("refreshToken", { path: "/" });
          return response
            .status(401)
            .json({ message: "Unauthorized access: User not found" });
        }
        return response.json({
          message: "User is logged in",
          user: latestUserDetails,
        });
      }
    });
  },

  register: async (request, response) => {
    try {
      const { username, password, name } = request.body;

      const data = await Users.findOne({ email: username });
      if (data) {
        return response
          .status(401)
          .json({ message: "Account already exist with given email" });
      }

      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
      }

      const encryptedPassword = await bcrypt.hash(password, 10);

      const user = new Users({
        email: username,
        password: encryptedPassword,
        name: name,
        role: VIEWER_ROLE,
      });
      await user.save();

      const userDetails = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
      };
      const token = jwt.sign(userDetails, secret, { expiresIn: "1h" });

      response.cookie("jwtToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        path: "/",
      });
      response.json({ message: "User registered", user: userDetails });
    } catch (error) {
      console.error("Register Error:", error);
      return response.status(500).json({ error: "Internal Server Error" });
    }
  },

  googleAuth: async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ message: "Missing Google credential" });
      }

      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { email, name, sub: googleId } = payload;

      let user = await Users.findOne({ email });
      if (!user) {
        user = new Users({
          email,
          name,
          googleId,
          isGoogleUser: true,
          role: ADMIN_ROLE,
          adminId: null,
        });
        await user.save();
        user.adminId = user._id;
        await user.save();
      }

      const userPayload = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
      };

      const token = jwt.sign(userPayload, secret, { expiresIn: "1h" });
      res.cookie("jwtToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      });

      const refreshTokenPayload = user.toObject();
      const refreshtoken = jwt.sign(refreshTokenPayload, refreshSecret, {
        expiresIn: "7d",
      });
      res.cookie("refreshToken", refreshtoken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        path: "/",
      });

      res
        .status(200)
        .json({ user: userPayload, message: "User authenticated" });
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(401).json({ message: "Google authentication failed" });
    }
  },

  sendResetPasswordToken: async (request, response) => {
    try {
      const { email } = request.body;
      console.log("email", email);

      const user = await Users.findOne({ email });
      if (!user) {
        return response.status(200).json({
          message:
            "If a user with that email exists, a password reset code has been sent.",
        });
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = await bcrypt.hash(resetCode, 10);
      console.log("reset code", resetCode);

      const resetExpires = new Date(Date.now() + 10 * 60 * 1000);

      user.resetPasswordCode = hashedCode;
      user.resetPasswordExpires = resetExpires;
      await user.save();

      const emailSubject = "Affiliate++ Password Reset Code";
      const emailBody = `Your password reset code is: ${resetCode}\n\nThis code is valid for 10 minutes.`;

      const emailSendResponse = await sendEmail(email, emailSubject, emailBody);
      console.log("email response", emailSendResponse);

      response.status(200).json({
        message:
          "If a user with that email exists, a password reset code has been sent.",
      });
    } catch (error) {
      console.error("Send Reset Password Token Error:", error);
      response
        .status(500)
        .json({ error: "Internal server error in mail controller" });
    }
  },

  resetPassword: async (request, response) => {
    try {
      const { email, code, newPassword } = request.body;

      const user = await Users.findOne({ email });
      if (!user) {
        return response.status(400).json({ message: "Invalid email or code." });
      }

      const isMatch = await bcrypt.compare(code, user.resetPasswordCode);
      if (!isMatch || user.resetPasswordExpires < new Date()) {
        return response
          .status(400)
          .json({ message: "Invalid or expired reset code." });
      }

      if (
        !user.resetPasswordCode ||
        user.resetPasswordCode !== code ||
        user.resetPasswordExpires < new Date()
      ) {
        return response
          .status(400)
          .json({ message: "Invalid or expired reset code." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;
      user.resetPasswordCode = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      response
        .status(200)
        .json({ message: "Password has been reset successfully." });
    } catch (error) {
      console.error("Reset Password Error:", error);
      response.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = authController;
