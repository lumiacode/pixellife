const AdminJS = require("adminjs");
const AdminJSExpress = require("@adminjs/express");
const AdminJSMongoose = require("@adminjs/mongoose");

const Product = require("../models/Product");
const User = require("../models/User");
const DiscountCode = require("../models/DiscountCode");

AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

const setupAdmin = (app) => {
  const admin = new AdminJS({
    rootPath: "/admin",
    resources: [Product, User, DiscountCode],
  });

  const router = AdminJSExpress.buildRouter(admin);

  app.use(admin.options.rootPath, router);
};

module.exports = setupAdmin;
