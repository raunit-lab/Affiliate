const Links = require("../model/Links");
const Users = require("../model/Users");
const axios = require("axios");
const { getDeviceInfo } = require("../util/linkUtil");
const Clicks = require("../model/Clicks");
const { ADMIN_ROLE } = require("../constants/userConstants");

const linksController = {
  create: async (request, response) => {
    const { campaign_title, original_url, category } = request.body;

    try {
      const user = await Users.findById({ _id: request.user.id });
      if (!user) {
        return response.status(404).json({ message: "User not found" });
      }

      const isAdmin = user.role === ADMIN_ROLE;
      const hasActiveSubscription =
        user.subscription && user.subscription.status === "active";

      if (!isAdmin && !hasActiveSubscription && user.credits < 1) {
        return response.status(400).json({
          message: "Insufficient credit balance or no active subscription",
        });
      }

      const link = new Links({
        campaignTitle: campaign_title,
        originalUrl: original_url,
        category: category,
        user: request.user.id,
      });
      await link.save();

      if (!isAdmin && !hasActiveSubscription) {
        user.credits -= 1;
        await user.save();
      }

      response.json({
        data: { linkId: link._id, userCredits: user.credits },
      });
    } catch (error) {
      console.error("Create Link Error:", error);
      response.status(500).json({
        error: "Internal server error",
      });
    }
  },

  getAll: async (request, response) => {
    try {
      const {
        currentPage = 0,
        pageSize = 10,
        searchQuery = "",
        sortField = "createdAt",
        sortOrder = "desc",
      } = request.query;

      const skip = parseInt(currentPage) * parseInt(pageSize);
      const limit = parseInt(pageSize);
      const sort = { [sortField]: sortOrder === "desc" ? -1 : 1 };

      const currentUserId = request.user.id;
      const isAdmin = request.user.role === ADMIN_ROLE;

      let finalQueryConditions = {};

      if (isAdmin) {
        const managedUsers = await Users.find({
          adminId: currentUserId,
        }).select("_id");
        const managedUserIds = managedUsers.map((u) => u._id);
        finalQueryConditions.user = { $in: [currentUserId, ...managedUserIds] };
      } else {
        finalQueryConditions.user = currentUserId;
      }

      if (searchQuery) {
        finalQueryConditions.$or = [
          { campaignTitle: new RegExp(searchQuery, "i") },
          { originalUrl: new RegExp(searchQuery, "i") },
          { category: new RegExp(searchQuery, "i") },
        ];
      }

      const links = await Links.find(finalQueryConditions)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Links.countDocuments(finalQueryConditions);

      response.json({ links, total });
    } catch (error) {
      console.error("Get All Links Error:", error);
      response.status(500).json({
        error: "Internal server error",
      });
    }
  },

  getById: async (request, response) => {
    try {
      const linkId = request.params.id;
      if (!linkId) {
        return response.status(400).json({ error: "Link ID is required" });
      }

      const link = await Links.findById(linkId);
      if (!link) {
        return response.status(404).json({ error: "Link ID does not exist" });
      }

      const currentUserId = request.user.id;
      const isAdmin = request.user.role === ADMIN_ROLE;

      if (link.user.toString() === currentUserId.toString()) {
        return response.json({ data: link });
      }

      if (isAdmin) {
        const linkOwner = await Users.findById(link.user).select("adminId");
        if (
          linkOwner &&
          linkOwner.adminId &&
          linkOwner.adminId.toString() === currentUserId.toString()
        ) {
          return response.json({ data: link });
        }
      }

      return response
        .status(403)
        .json({ error: "Forbidden: Unauthorized access to this link" });
    } catch (error) {
      console.error("Get Link By ID Error:", error);
      response.status(500).json({ error: "Internal server error" });
    }
  },

  update: async (request, response) => {
    try {
      const linkId = request.params.id;
      if (!linkId) {
        return response.status(400).json({ error: "Link ID is required" });
      }

      let link = await Links.findById(linkId);
      if (!link) {
        return response.status(404).json({ error: "Link ID does not exist" });
      }

      const currentUserId = request.user.id;
      const isAdmin = request.user.role === ADMIN_ROLE;

      if (link.user.toString() === currentUserId.toString()) {
        const { campaign_title, original_url, category } = request.body;
        link = await Links.findByIdAndUpdate(
          linkId,
          {
            campaignTitle: campaign_title,
            originalUrl: original_url,
            category: category,
          },
          { new: true },
        );
        return response.json({ data: link });
      }

      if (isAdmin) {
        const linkOwner = await Users.findById(link.user).select("adminId");
        if (
          linkOwner &&
          linkOwner.adminId &&
          linkOwner.adminId.toString() === currentUserId.toString()
        ) {
          const { campaign_title, original_url, category } = request.body;
          link = await Links.findByIdAndUpdate(
            linkId,
            {
              campaignTitle: campaign_title,
              originalUrl: original_url,
              category: category,
            },
            { new: true },
          );
          return response.json({ data: link });
        }
      }

      return response
        .status(403)
        .json({ error: "Forbidden: Unauthorized access to update this link" });
    } catch (error) {
      console.error("Update Link Error:", error);
      response.status(500).json({ error: "Internal server error" });
    }
  },

  delete: async (request, response) => {
    try {
      const linkId = request.params.id;
      if (!linkId) {
        return response.status(400).json({ error: "Link ID is required" });
      }

      let link = await Links.findById(linkId);
      if (!link) {
        return response.status(404).json({ error: "Link ID does not exist" });
      }

      const currentUserId = request.user.id;
      const isAdmin = request.user.role === ADMIN_ROLE;

      if (link.user.toString() === currentUserId.toString()) {
        await link.deleteOne();
        return response.json({ message: "Link deleted successfully" });
      }

      if (isAdmin) {
        const linkOwner = await Users.findById(link.user).select("adminId");
        if (
          linkOwner &&
          linkOwner.adminId &&
          linkOwner.adminId.toString() === currentUserId.toString()
        ) {
          await link.deleteOne();
          return response.json({ message: "Link deleted successfully" });
        }
      }

      return response
        .status(403)
        .json({ error: "Forbidden: Unauthorized access to delete this link" });
    } catch (error) {
      console.error("Delete Link Error:", error);
      response.status(500).json({ error: "Internal server error" });
    }
  },

  redirect: async (request, response) => {
    try {
      const linkId = request.params.id;
      if (!linkId) {
        return response.status(400).json({ error: "Link ID is required" });
      }
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        console.warn(`Invalid Link ID format received: ${linkId}`);
        return response
          .status(404)
          .json({ error: "Link not found (Invalid ID format)" });
      }

      let link = await Links.findById(linkId);
      if (!link) {
        return response.status(404).json({ error: "Link ID does not exist" });
      }

      const ipAddress =
        process.env.NODE_ENV === "development"
          ? "8.8.8.8"
          : request.headers["x-forwarded-for"]?.split(",")[0] ||
            request.socket.remoteAddress;

      let city, country, region, lat, lon, isp;
      try {
        const geoResponse = await axios.get(
          `http://ip-api.com/json/${ipAddress}`,
        );
        ({ city, country, region, lat, lon, isp } = geoResponse.data);
      } catch (geoError) {
        console.warn(
          `Could not fetch geo-location for IP ${ipAddress}:`,
          geoError.message,
        );
        city = "Unknown";
        country = "Unknown";
        region = "Unknown";
        lat = 0;
        lon = 0;
        isp = "Unknown";
      }

      const userAgent = request.headers["user-agent"] || "unknown";
      const { isMobile, browser } = getDeviceInfo(userAgent);
      const deviceType = isMobile ? "Mobile" : "Desktop";

      const referrer = request.get("Referrer") || null;

      await Clicks.create({
        linkId: link._id,
        ip: ipAddress,
        city: city,
        country: country,
        region: region,
        latitude: lat,
        longitude: lon,
        isp: isp,
        referrer: referrer,
        userAgent: userAgent,
        deviceType: deviceType,
        browser: browser,
        clickedAt: new Date(),
      });

      link.clickCount += 1;
      await link.save();
      let finalRedirectUrl = link.originalUrl;
      if (!finalRedirectUrl.match(/^https?:\/\//i)) {
        finalRedirectUrl = "https://" + finalRedirectUrl;
      }

      response.redirect(link.originalUrl);
    } catch (error) {
      console.error("Redirect Link Error:", error);
      response.status(500).json({ error: "Internal server error" });
    }
  },
  analytics: async (request, response) => {
    try {
      const { linkId, from, to } = request.body;

      const link = await Links.findById(linkId);
      if (!link) {
        return response.status(404).json({ error: "Link not found" });
      }

      const currentUserId = request.user.id;
      const isAdmin = request.user.role === ADMIN_ROLE;

      const currentUserDetails = await Users.findById({ _id: currentUserId });
      if (!currentUserDetails) {
        return response.status(401).json({ error: "User not found." });
      }

      let hasLinkOwnershipOrAdminManagementAccess = false;
      if (link.user.toString() === currentUserId.toString()) {
        hasLinkOwnershipOrAdminManagementAccess = true;
      } else if (isAdmin) {
        const linkOwner = await Users.findById(link.user).select("adminId");
        if (
          linkOwner &&
          linkOwner.adminId &&
          linkOwner.adminId.toString() === currentUserId.toString()
        ) {
          hasLinkOwnershipOrAdminManagementAccess = true;
        }
      }

      if (!hasLinkOwnershipOrAdminManagementAccess) {
        return response
          .status(403)
          .json({
            error: "Forbidden: Unauthorized access to this link's analytics",
          });
      }

      if (!isAdmin) {
        const hasActiveSubscription =
          currentUserDetails.subscription &&
          currentUserDetails.subscription.status === "active";
        if (currentUserDetails.credits < 1 && !hasActiveSubscription) {
          return response.status(403).json({
            message:
              "Insufficient credit balance or no active subscription to view analytics.",
          });
        }
      }

      const query = { linkId };
      if (from && to) {
        query.clickedAt = { $gte: new Date(from), $lte: new Date(to) };
      }
      const data = await Clicks.find(query).sort({ clickedAt: -1 });
      return response.json(data);
    } catch (error) {
      console.error("Analytics Fetch Error:", error);
      return response.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = linksController;
